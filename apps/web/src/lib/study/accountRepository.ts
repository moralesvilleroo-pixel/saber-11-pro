"use client";
import { cardToRow, rowToCard, SUBJECT_CODES, type FsrsCard, type FsrsStateRow, type Rating } from "@icfes/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readJson, writeJson } from "./localStore";
import { questionFromRow, type EvidenceInfo, type QuestionRow } from "./mapping";
import type {
  AttemptRecord,
  CardMeta,
  OptionLabel,
  Progress,
  ScoreSnapshot,
  SessionRecord,
  StudyMode,
  StudyQuestion,
  StudyRepository,
  SyncState,
} from "./types";

const BANK_KEY = "saber11:bank:v1";
const MAX_BATCH = 1000;

interface BankCache {
  cursor: Record<string, number>;
  rows: Record<string, QuestionRow>;
  evidences: Record<string, EvidenceInfo>;
}

interface PendingTheta {
  snapshot: ScoreSnapshot;
  detail: Record<string, unknown>;
}

interface Queue {
  sessions: Record<string, SessionRecord>;
  attempts: AttemptRecord[];
  states: Record<string, FsrsStateRow>;
  thetas: PendingTheta[];
}

const EMPTY_QUEUE: Queue = { sessions: {}, attempts: [], states: {}, thetas: [] };

/**
 * Cuenta en Supabase. Todo se guarda primero en este navegador (cola local) y se envia con
 * `sync_offline_batch`, asi una sesion sigue funcionando si se cae la conexion.
 */
export class AccountRepository implements StudyRepository {
  readonly kind = "account" as const;
  private readonly queueKey: string;
  private bank: StudyQuestion[] = [];
  private syncing: Promise<SyncState> | null = null;

  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string,
  ) {
    this.queueKey = `saber11:queue:${userId}:v1`;
  }

  private queue(): Queue {
    const q = readJson<Queue>(this.queueKey, EMPTY_QUEUE);
    return { sessions: q.sessions ?? {}, attempts: q.attempts ?? [], states: q.states ?? {}, thetas: q.thetas ?? [] };
  }

  async loadBank(): Promise<StudyQuestion[]> {
    const cache = readJson<BankCache>(BANK_KEY, { cursor: {}, rows: {}, evidences: {} });
    try {
      if (Object.keys(cache.evidences).length === 0) cache.evidences = await this.fetchEvidences();
      for (const subject of SUBJECT_CODES) {
        let since = cache.cursor[subject] ?? 0;
        for (;;) {
          const { data, error } = await this.db.rpc("get_questions_since", {
            p_subject: subject,
            p_since_version: since,
            p_limit: 500,
          });
          if (error) throw new Error(error.message);
          const rows = (data ?? []) as QuestionRow[];
          for (const r of rows) {
            cache.rows[r.id] = r;
            since = Math.max(since, Number(r.version));
          }
          cache.cursor[subject] = since;
          if (rows.length < 500) break;
        }
      }
      writeJson(BANK_KEY, cache);
    } catch (e) {
      // Sin conexion se estudia con lo que ya se habia descargado.
      if (Object.keys(cache.rows).length === 0) throw e;
    }
    this.bank = Object.values(cache.rows).flatMap((r) => {
      const ev = cache.evidences[r.evidence_id ?? ""];
      const q = questionFromRow(r, ev);
      return q ? [q] : [];
    });
    return this.bank;
  }

  private async fetchEvidences(): Promise<Record<string, EvidenceInfo>> {
    const { data, error } = await this.db
      .from("evidences")
      .select("id, code, affirmation:affirmations(competency:competencies(code))");
    if (error) throw new Error(error.message);
    const out: Record<string, EvidenceInfo> = {};
    for (const row of (data ?? []) as unknown as {
      id: string;
      code: string;
      affirmation: { competency: { code: string } | null } | null;
    }[]) {
      const comp = row.affirmation?.competency?.code;
      if (comp) out[row.id] = { code: row.code, competencyCode: comp };
    }
    return out;
  }

  async loadProgress(): Promise<Progress> {
    const byId = new Map(this.bank.map((q) => [q.questionId, q]));
    const [states, attempts, theta] = await Promise.all([
      this.db
        .from("user_card_fsrs_state")
        .select(
          "question_id, stability, difficulty, retrievability_cache, elapsed_days, scheduled_days, reps, lapses, state, step, due_at, last_review_at, updated_at",
        )
        .limit(5000),
      this.db
        .from("attempt_logs")
        .select(
          "id, session_id, question_id, question_version, selected_option, is_correct, rating_1_to_4, response_time_ms, session_mode, answered_at",
        )
        .order("answered_at", { ascending: false })
        .limit(1500),
      this.db
        .from("user_theta_estimates")
        .select("lc_score, ma_score, sc_score, cn_score, in_score, global_score, source, estimated_at")
        .order("estimated_at", { ascending: false })
        .limit(1),
    ]);
    for (const r of [states, attempts, theta]) if (r.error) throw new Error(r.error.message);

    const cards: Record<string, FsrsCard> = {};
    for (const row of (states.data ?? []) as FsrsStateRow[]) cards[row.question_id] = rowToCard(row);

    const list: AttemptRecord[] = [];
    for (const a of (attempts.data ?? []) as {
      id: string;
      session_id: string | null;
      question_id: string;
      question_version: number;
      selected_option: OptionLabel | null;
      is_correct: boolean;
      rating_1_to_4: Rating;
      response_time_ms: number;
      session_mode: StudyMode;
      answered_at: string;
    }[]) {
      const q = byId.get(a.question_id);
      if (!q) continue;
      list.push({
        id: a.id,
        sessionId: a.session_id ?? "",
        questionId: a.question_id,
        questionVersion: Number(a.question_version),
        subject: q.subject,
        evidenceId: q.evidenceId,
        selected: a.selected_option,
        correct: a.is_correct,
        rating: a.rating_1_to_4,
        responseTimeMs: a.response_time_ms,
        mode: a.session_mode,
        answeredAt: Date.parse(a.answered_at),
      });
    }

    // Lo pendiente en este navegador gana sobre lo descargado.
    const queue = this.queue();
    for (const row of Object.values(queue.states)) cards[row.question_id] = rowToCard(row);
    const known = new Set(list.map((a) => a.id));
    for (const a of queue.attempts) if (!known.has(a.id)) list.push(a);
    list.sort((x, y) => x.answeredAt - y.answeredAt);

    const t = (theta.data ?? [])[0] as
      | Record<"lc_score" | "ma_score" | "sc_score" | "cn_score" | "in_score" | "global_score", number | null> & {
          source: ScoreSnapshot["source"];
          estimated_at: string;
        }
      | undefined;
    const pendingTheta = queue.thetas.at(-1)?.snapshot ?? null;
    let latestScores: ScoreSnapshot | null = pendingTheta;
    if (!latestScores && t) {
      const scores: ScoreSnapshot["scores"] = {};
      if (t.lc_score !== null) scores.LC = t.lc_score;
      if (t.ma_score !== null) scores.MA = t.ma_score;
      if (t.sc_score !== null) scores.SC = t.sc_score;
      if (t.cn_score !== null) scores.CN = t.cn_score;
      if (t.in_score !== null) scores.IN = t.in_score;
      latestScores = { scores, globalScore: t.global_score, source: t.source, at: Date.parse(t.estimated_at) };
    }
    return { cards, attempts: list, latestScores };
  }

  async recordAnswer(session: SessionRecord, attempt: AttemptRecord, card: FsrsCard, meta: CardMeta): Promise<void> {
    const q = this.queue();
    q.sessions[session.id] = session;
    q.attempts = [...q.attempts.filter((a) => a.id !== attempt.id), attempt];
    q.states[attempt.questionId] = cardToRow(attempt.questionId, card, { ...meta, updatedAt: attempt.answeredAt });
    writeJson(this.queueKey, q);
    void this.sync();
  }

  async finishSession(session: SessionRecord, snapshot: ScoreSnapshot, detail: Record<string, unknown>): Promise<void> {
    const q = this.queue();
    q.sessions[session.id] = session;
    q.thetas.push({ snapshot, detail });
    writeJson(this.queueKey, q);
    await this.sync();
  }

  /** Envia la cola. Si ya hay un envio en curso, espera ese. */
  sync(): Promise<SyncState> {
    this.syncing ??= this.doSync().finally(() => {
      this.syncing = null;
    });
    return this.syncing;
  }

  private async doSync(): Promise<SyncState> {
    const q = this.queue();
    try {
      const attempts = q.attempts.slice(0, MAX_BATCH);
      const states = Object.values(q.states).slice(0, MAX_BATCH);
      const sessionIds = new Set(attempts.map((a) => a.sessionId));
      for (const s of Object.values(q.sessions)) if (s.endedAt !== null) sessionIds.add(s.id);
      const sessions = [...sessionIds].flatMap((id) => (q.sessions[id] ? [q.sessions[id]] : [])).slice(0, 100);

      if (attempts.length + states.length + sessions.length > 0) {
        const { error } = await this.db.rpc("sync_offline_batch", {
          payload: {
            sessions: sessions.map((s) => ({
              id: s.id,
              session_mode: s.mode,
              started_at: new Date(s.startedAt).toISOString(),
              ended_at: s.endedAt === null ? null : new Date(s.endedAt).toISOString(),
              planned_items: s.plannedItems,
              device: "web",
            })),
            attempts: attempts.map((a) => ({
              id: a.id,
              session_id: a.sessionId,
              question_id: a.questionId,
              question_version: a.questionVersion,
              selected_option: a.selected,
              rating_1_to_4: a.rating,
              response_time_ms: Math.min(3_600_000, Math.max(0, Math.round(a.responseTimeMs))),
              session_mode: a.mode,
              answered_at: new Date(a.answeredAt).toISOString(),
            })),
            fsrs_states: states,
          },
        });
        if (error) throw new Error(error.message);
      }

      // Quitar de la cola solo lo enviado (pudo llegar algo nuevo mientras tanto).
      const now = this.queue();
      const sentAttempts = new Set(attempts.map((a) => a.id));
      now.attempts = now.attempts.filter((a) => !sentAttempts.has(a.id));
      for (const s of states) {
        if (now.states[s.question_id]?.updated_at === s.updated_at) delete now.states[s.question_id];
      }
      for (const s of sessions) {
        const cur = now.sessions[s.id];
        const stillNeeded = now.attempts.some((a) => a.sessionId === s.id) || (cur && cur.endedAt === null);
        if (cur && !stillNeeded) delete now.sessions[s.id];
      }

      while (now.thetas.length > 0) {
        const t = now.thetas[0] as PendingTheta;
        const s = t.snapshot.scores;
        const { error } = await this.db.from("user_theta_estimates").insert({
          user_id: this.userId,
          lc_score: s.LC ?? null,
          ma_score: s.MA ?? null,
          sc_score: s.SC ?? null,
          cn_score: s.CN ?? null,
          in_score: s.IN ?? null,
          global_score: t.snapshot.globalScore,
          theta_detail: t.detail,
          source: t.snapshot.source,
        });
        if (error) throw new Error(error.message);
        now.thetas.shift();
        writeJson(this.queueKey, now);
      }
      writeJson(this.queueKey, now);
      return { pending: now.attempts.length + Object.keys(now.states).length, lastError: null };
    } catch (e) {
      const cur = this.queue();
      return {
        pending: cur.attempts.length + Object.keys(cur.states).length + cur.thetas.length,
        lastError: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
