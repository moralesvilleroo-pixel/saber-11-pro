import type { BankQuestion, FsrsCard, Rating, SubjectCode } from "@icfes/core";

export type OptionLabel = "A" | "B" | "C" | "D";
export type StudyMode = "diagnostic" | "fsrs_daily" | "mock_exam";

export interface QuestionTable {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface StudyOption {
  label: OptionLabel;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

/** Pregunta lista para mostrar. `evidenceId` es el codigo MBE (p. ej. MA.E2.1). */
export interface StudyQuestion extends BankQuestion {
  version: number;
  contextType: string;
  context: { title: string | null; text: string | null; svg: string | null; table: QuestionTable | null };
  stem: string;
  options: StudyOption[];
}

export interface AttemptRecord {
  id: string;
  sessionId: string;
  questionId: string;
  questionVersion: number;
  subject: SubjectCode;
  evidenceId: string;
  selected: OptionLabel | null;
  /** Provisional en el cliente; el servidor lo recalcula con la clave. */
  correct: boolean;
  rating: Rating;
  responseTimeMs: number;
  mode: StudyMode;
  answeredAt: number;
}

export interface SessionRecord {
  id: string;
  mode: StudyMode;
  startedAt: number;
  endedAt: number | null;
  plannedItems: number;
}

export interface ScoreSnapshot {
  scores: Partial<Record<SubjectCode, number>>;
  globalScore: number | null;
  source: "diagnostic" | "rolling" | "mock_exam";
  at: number;
}

export interface Progress {
  cards: Record<string, FsrsCard>;
  attempts: AttemptRecord[];
  latestScores: ScoreSnapshot | null;
}

export interface StudyProfile {
  displayName: string | null;
  dailyStudyMinutes: number;
  targetExamDate: string | null;
  targetGlobalScore: number | null;
}

export interface SyncState {
  pending: number;
  lastError: string | null;
}

/** Donde viven las preguntas y el progreso: el navegador (demo) o la cuenta en Supabase. */
export interface StudyRepository {
  readonly kind: "demo" | "account";
  loadBank(): Promise<StudyQuestion[]>;
  loadProgress(): Promise<Progress>;
  /** Guarda localmente y encola para sincronizar. */
  recordAnswer(session: SessionRecord, attempt: AttemptRecord, card: FsrsCard, cardMeta: CardMeta): Promise<void>;
  finishSession(session: SessionRecord, snapshot: ScoreSnapshot, detail: Record<string, unknown>): Promise<void>;
  sync(): Promise<SyncState>;
}

export interface CardMeta {
  retrievability: number | null;
  elapsedDays: number;
  scheduledDays: number;
}
