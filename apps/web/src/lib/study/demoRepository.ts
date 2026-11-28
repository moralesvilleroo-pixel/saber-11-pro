import type { FsrsCard } from "@icfes/core";
import { readJson, writeJson } from "./localStore";
import type { AttemptRecord, Progress, ScoreSnapshot, SessionRecord, StudyQuestion, StudyRepository, SyncState } from "./types";

const KEY = "saber11:demo:progress:v1";
const EMPTY: Progress = { cards: {}, attempts: [], latestScores: null };

/**
 * Modo demo: preguntas de muestra incluidas en la pagina y progreso solo en este navegador.
 * No envia nada al servidor, asi que no hay tratamiento de datos personales.
 */
export class DemoRepository implements StudyRepository {
  readonly kind = "demo" as const;
  constructor(private readonly bank: StudyQuestion[]) {}

  async loadBank(): Promise<StudyQuestion[]> {
    return this.bank;
  }

  async loadProgress(): Promise<Progress> {
    const p = readJson<Progress>(KEY, EMPTY);
    return { cards: p.cards ?? {}, attempts: p.attempts ?? [], latestScores: p.latestScores ?? null };
  }

  async recordAnswer(_session: SessionRecord, attempt: AttemptRecord, card: FsrsCard): Promise<void> {
    const p = await this.loadProgress();
    p.cards[attempt.questionId] = card;
    p.attempts = [...p.attempts.filter((a) => a.id !== attempt.id), attempt].slice(-2000);
    writeJson(KEY, p);
  }

  async finishSession(_session: SessionRecord, snapshot: ScoreSnapshot): Promise<void> {
    const p = await this.loadProgress();
    p.latestScores = snapshot;
    writeJson(KEY, p);
  }

  async sync(): Promise<SyncState> {
    return { pending: 0, lastError: null };
  }
}

export function resetDemoProgress(): void {
  writeJson(KEY, EMPTY);
}
