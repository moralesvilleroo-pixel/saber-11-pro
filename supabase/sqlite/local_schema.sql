-- =============================================================================
-- Saber11 Pro - Espejo SQLite offline (Windows/Tauri y Android/expo-sqlite)
-- Version simplificada de supabase/migrations/0001_initial_schema.sql:
--   * Solo contenido publicado (qa_passed, calibrated) descargado con get_questions_since.
--   * Datos del usuario activo del dispositivo; se suben con sync_offline_batch.
--   * UUID como TEXT, fechas como TEXT ISO-8601 UTC, JSON como TEXT validado.
-- Cambiar este archivo en el mismo PR que cualquier migracion que afecte columnas sincronizadas.
-- =============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('local_schema_version', '1');

-- Taxonomia (se descarga completa; es pequena) --------------------------------

CREATE TABLE IF NOT EXISTS subjects (
  code               TEXT PRIMARY KEY CHECK (code IN ('LC', 'MA', 'SC', 'CN', 'IN')),
  name               TEXT NOT NULL,
  weight             INTEGER NOT NULL CHECK (weight IN (1, 3)),
  questions_session1 INTEGER NOT NULL,
  questions_session2 INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS competencies (
  id           TEXT PRIMARY KEY,
  subject_code TEXT NOT NULL REFERENCES subjects (code),
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affirmations (
  id            TEXT PRIMARY KEY,
  competency_id TEXT NOT NULL REFERENCES competencies (id) ON DELETE CASCADE,
  code          TEXT NOT NULL UNIQUE,
  statement     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidences (
  id             TEXT PRIMARY KEY,
  affirmation_id TEXT NOT NULL REFERENCES affirmations (id) ON DELETE CASCADE,
  code           TEXT NOT NULL UNIQUE,
  statement      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_components (
  id           TEXT PRIMARY KEY,
  subject_code TEXT NOT NULL REFERENCES subjects (code),
  code         TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL,
  name         TEXT NOT NULL
);

-- Banco local -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS questions (
  id                     TEXT PRIMARY KEY,
  evidence_id            TEXT NOT NULL REFERENCES evidences (id),
  subject_id             TEXT NOT NULL REFERENCES subjects (code),
  component_id           TEXT REFERENCES content_components (id),
  status                 TEXT NOT NULL CHECK (status IN ('qa_passed', 'calibrated')),
  context_type           TEXT NOT NULL CHECK (context_type IN ('continuous', 'discontinuous', 'mixed', 'cefr_part')),
  context_content        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context_content)),
  stem                   TEXT NOT NULL,
  options                TEXT NOT NULL CHECK (json_valid(options) AND json_array_length(options) = 4),
  cefr_level             TEXT CHECK (cefr_level IN ('A-', 'A1', 'A2', 'B1', 'B+')),
  irt_a                  REAL NOT NULL,
  irt_b                  REAL NOT NULL,
  irt_c                  REAL NOT NULL,
  estimated_time_seconds INTEGER NOT NULL,
  version                INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS questions_subject_idx ON questions (subject_id, evidence_id);

-- Ultima version descargada por prueba (cursor de get_questions_since).
CREATE TABLE IF NOT EXISTS sync_cursors (
  subject_code      TEXT PRIMARY KEY REFERENCES subjects (code),
  last_version      INTEGER NOT NULL DEFAULT 0,
  last_synced_at    TEXT
);

-- Datos del usuario -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_card_fsrs_state (
  user_id              TEXT NOT NULL,
  question_id          TEXT NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  stability            REAL NOT NULL DEFAULT 0,
  difficulty           REAL NOT NULL DEFAULT 0,
  retrievability_cache REAL,
  elapsed_days         INTEGER NOT NULL DEFAULT 0,
  scheduled_days       INTEGER NOT NULL DEFAULT 0,
  reps                 INTEGER NOT NULL DEFAULT 0,
  lapses               INTEGER NOT NULL DEFAULT 0,
  state                TEXT NOT NULL DEFAULT 'New' CHECK (state IN ('New', 'Learning', 'Review', 'Relearning')),
  due_at               TEXT NOT NULL,
  last_review_at       TEXT,
  updated_at           TEXT NOT NULL,
  dirty                INTEGER NOT NULL DEFAULT 1 CHECK (dirty IN (0, 1)), -- 1 = falta subir
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS fsrs_due_idx ON user_card_fsrs_state (user_id, due_at);
CREATE INDEX IF NOT EXISTS fsrs_dirty_idx ON user_card_fsrs_state (dirty) WHERE dirty = 1;

CREATE TABLE IF NOT EXISTS study_sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  session_mode  TEXT NOT NULL CHECK (session_mode IN ('fsrs_daily', 'interleaved', 'mock_exam', 'diagnostic')),
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  planned_items INTEGER NOT NULL DEFAULT 0,
  device        TEXT CHECK (device IN ('web', 'android', 'windows')),
  dirty         INTEGER NOT NULL DEFAULT 1 CHECK (dirty IN (0, 1))
);

CREATE TABLE IF NOT EXISTS attempt_logs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  session_id       TEXT REFERENCES study_sessions (id) ON DELETE CASCADE,
  question_id      TEXT NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  question_version INTEGER NOT NULL,
  selected_option  TEXT CHECK (selected_option IN ('A', 'B', 'C', 'D')),
  is_correct       INTEGER NOT NULL CHECK (is_correct IN (0, 1)), -- provisional; el servidor recalcula
  rating_1_to_4    INTEGER NOT NULL CHECK (rating_1_to_4 BETWEEN 1 AND 4),
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  session_mode     TEXT NOT NULL CHECK (session_mode IN ('fsrs_daily', 'interleaved', 'mock_exam', 'diagnostic')),
  answered_at      TEXT NOT NULL,
  synced_at        TEXT -- NULL = pendiente de subir
);

CREATE INDEX IF NOT EXISTS attempts_pending_idx ON attempt_logs (synced_at) WHERE synced_at IS NULL;
CREATE INDEX IF NOT EXISTS attempts_user_idx ON attempt_logs (user_id, answered_at);

CREATE TABLE IF NOT EXISTS user_theta_estimates (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  lc_score     INTEGER, ma_score INTEGER, sc_score INTEGER, cn_score INTEGER, in_score INTEGER,
  global_score INTEGER CHECK (global_score BETWEEN 0 AND 500),
  theta_detail TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(theta_detail)),
  source       TEXT NOT NULL CHECK (source IN ('diagnostic', 'rolling', 'mock_exam')),
  estimated_at TEXT NOT NULL
);
