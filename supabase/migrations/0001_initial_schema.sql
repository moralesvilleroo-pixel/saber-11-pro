-- =============================================================================
-- Saber11 Pro - Migracion inicial (Supabase / PostgreSQL 15+)
-- Contenido:
--   1. Utilidades (dias habiles, version global para sync incremental)
--   2. Perfiles y cumplimiento Ley 1581 de 2012 (consentimiento parental, ARCO)
--   3. Taxonomia MBE (subjects, competencies, affirmations, evidences, components)
--   4. Banco de preguntas (solo items originales)
--   5. Motor FSRS-6, sesiones, intentos y estimaciones de puntaje
--   6. Row Level Security y permisos por columna
--   7. RPC: sync_offline_batch y get_questions_since
-- Regla de egress: ninguna funcion usa SELECT *; siempre columnas explicitas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Utilidades
-- -----------------------------------------------------------------------------

-- Festivos de Colombia. Se siembran por ano (ver docs/ESTADO_PROYECTO.md).
create table public.co_public_holidays (
  holiday_date date primary key,
  name         text not null
);

-- Suma n dias habiles (lunes a viernes, sin festivos) a una fecha.
create or replace function public.add_business_days(start_date date, n integer)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  d     date := start_date;
  added integer := 0;
begin
  if n < 0 then
    raise exception 'n debe ser >= 0';
  end if;
  while added < n loop
    d := d + 1;
    if extract(isodow from d) < 6
       and not exists (select 1 from public.co_public_holidays h where h.holiday_date = d) then
      added := added + 1;
    end if;
  end loop;
  return d;
end;
$$;

-- Secuencia global: cada cambio en una pregunta recibe un numero mayor,
-- asi los clientes offline piden "todo lo posterior a mi ultima version".
create sequence public.content_version_seq;

create or replace function public.bump_content_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := nextval('public.content_version_seq');
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Perfiles y Ley 1581 de 2012
-- -----------------------------------------------------------------------------

create table public.profiles (
  id                          uuid primary key references auth.users (id) on delete cascade,
  display_name                text check (char_length(display_name) <= 80),
  birth_year                  smallint check (birth_year between 1900 and 2100),
  -- Lo calcula el trigger enforce_profile_consent; el cliente no lo puede escribir.
  is_minor                    boolean not null default true,
  parent_guardian_email       text check (parent_guardian_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  parental_consent_status     text not null default 'pending'
                              check (parental_consent_status in ('pending', 'verified', 'not_required')),
  parental_consent_timestamp  timestamptz,
  privacy_policy_version      text not null,
  privacy_policy_accepted_at  timestamptz not null default now(),
  exam_calendar               char(1) not null default 'A' check (exam_calendar in ('A', 'B')),
  target_exam_date            date,
  target_global_score         smallint check (target_global_score between 0 and 500),
  daily_study_minutes         smallint not null default 30 check (daily_study_minutes between 5 and 600),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint consent_matches_age check (
    (is_minor and parental_consent_status in ('pending', 'verified'))
    or (not is_minor and parental_consent_status = 'not_required')
  ),
  constraint verified_consent_has_timestamp check (
    parental_consent_status <> 'verified' or parental_consent_timestamp is not null
  )
);

comment on column public.profiles.is_minor is
  'Regla conservadora: menor si no hay birth_year o si (ano actual - birth_year) <= 18. '
  'Un usuario que cumple 18 este ano se trata como menor hasta que se capture fecha completa.';

-- Calcula is_minor y mantiene coherente el estado de consentimiento.
-- Solo service_role (Edge Function de verificacion) puede marcar 'verified'.
create or replace function public.enforce_profile_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_year integer := extract(year from now() at time zone 'America/Bogota')::integer;
  is_service   boolean := current_user in ('postgres', 'service_role', 'supabase_admin');
begin
  new.is_minor := new.birth_year is null or (current_year - new.birth_year) <= 18;

  if not new.is_minor then
    new.parental_consent_status := 'not_required';
    new.parental_consent_timestamp := null;
  else
    if new.parental_consent_status = 'not_required' then
      new.parental_consent_status := 'pending';
    end if;
    -- Un cliente nunca puede autoverificarse.
    if not is_service and new.parental_consent_status = 'verified'
       and (tg_op = 'INSERT' or old.parental_consent_status <> 'verified') then
      raise exception 'El consentimiento parental solo lo verifica el servidor';
    end if;
    -- Si cambia el correo del acudiente, el consentimiento previo deja de valer.
    if tg_op = 'UPDATE' and new.parent_guardian_email is distinct from old.parent_guardian_email
       and not is_service then
      new.parental_consent_status := 'pending';
      new.parental_consent_timestamp := null;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_enforce_consent
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_consent();

-- Crea el perfil al registrarse. Espera en raw_user_meta_data:
--   birth_year, parent_guardian_email (si es menor), privacy_policy_version, exam_calendar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, birth_year, parent_guardian_email,
                               privacy_policy_version, exam_calendar)
  values (
    new.id,
    nullif(meta ->> 'display_name', ''),
    nullif(meta ->> 'birth_year', '')::smallint,
    nullif(meta ->> 'parent_guardian_email', ''),
    coalesce(nullif(meta ->> 'privacy_policy_version', ''), 'unknown'),
    coalesce(nullif(meta ->> 'exam_calendar', ''), 'A')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Evidencia verificable de cada autorizacion parental (Art. 7 Ley 1581,
-- Decreto 1377 de 2013). El token viaja por correo; aqui solo se guarda su hash.
create table public.parental_consents (
  id                     uuid primary key default gen_random_uuid(),
  profile_id             uuid not null references public.profiles (id) on delete cascade,
  guardian_email         text not null,
  token_hash             text not null unique,
  privacy_policy_version text not null,
  sent_at                timestamptz not null default now(),
  expires_at             timestamptz not null default now() + interval '7 days',
  verified_at            timestamptz,
  verified_ip            inet,
  verified_user_agent    text,
  revoked_at             timestamptz
);

create index parental_consents_profile_idx on public.parental_consents (profile_id, sent_at desc);

-- true si se pueden tratar datos de estudio del usuario.
create or replace function public.can_process_data(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.parental_consent_status in ('verified', 'not_required')
  );
$$;

-- Solicitudes ARCO (consulta, actualizacion, rectificacion, supresion, revocatoria).
-- Plazos: consultas 10 dias habiles (Art. 14); reclamos 15 dias habiles (Art. 15).
create table public.arco_requests (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users (id) on delete set null,
  requester_email  text not null,
  requester_role   text not null default 'titular'
                   check (requester_role in ('titular', 'representante_legal', 'causahabiente')),
  request_type     text not null
                   check (request_type in ('consulta', 'actualizacion', 'rectificacion', 'supresion', 'revocatoria')),
  description      text not null check (char_length(description) between 10 and 4000),
  status           text not null default 'received'
                   check (status in ('received', 'in_progress', 'extended', 'resolved', 'rejected')),
  received_at      timestamptz not null default now(),
  due_at           date not null,
  resolved_at      timestamptz,
  resolution_notes text,
  updated_at       timestamptz not null default now()
);

create index arco_requests_open_idx on public.arco_requests (due_at) where status in ('received', 'in_progress', 'extended');
create index arco_requests_user_idx on public.arco_requests (user_id);

create or replace function public.set_arco_due_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.due_at := public.add_business_days(
    (new.received_at at time zone 'America/Bogota')::date,
    case when new.request_type = 'consulta' then 10 else 15 end
  );
  return new;
end;
$$;

create trigger arco_requests_due_date
  before insert on public.arco_requests
  for each row execute function public.set_arco_due_date();

create trigger arco_requests_touch
  before update on public.arco_requests
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Taxonomia MBE (fuente: docs/MBE_TAXONOMIA.json -> supabase/seed.sql)
-- -----------------------------------------------------------------------------

create table public.subjects (
  code               text primary key check (code in ('LC', 'MA', 'SC', 'CN', 'IN')),
  name               text not null,
  weight             smallint not null check (weight in (1, 3)),
  questions_session1 smallint not null,
  questions_session2 smallint not null
);

insert into public.subjects (code, name, weight, questions_session1, questions_session2) values
  ('LC', 'Lectura Critica',       3, 41,  0),
  ('MA', 'Matematicas',           3, 25, 25),
  ('SC', 'Sociales y Ciudadanas', 3, 25, 25),
  ('CN', 'Ciencias Naturales',    3, 29, 29),
  ('IN', 'Ingles',                1,  0, 55);

create table public.competencies (
  id           uuid primary key default gen_random_uuid(),
  subject_code text not null references public.subjects (code),
  code         text not null unique,
  name         text not null,
  description  text not null
);

create table public.affirmations (
  id            uuid primary key default gen_random_uuid(),
  competency_id uuid not null references public.competencies (id) on delete cascade,
  code          text not null unique,
  statement     text not null
);

create table public.evidences (
  id             uuid primary key default gen_random_uuid(),
  affirmation_id uuid not null references public.affirmations (id) on delete cascade,
  code           text not null unique,
  statement      text not null
);

-- Componentes/categorias/partes de contenido (CN: quimico, biologico...; MA: algebra...;
-- IN: partes 1-7; LC: tipos de texto). Etiqueta transversal a la competencia.
create table public.content_components (
  id           uuid primary key default gen_random_uuid(),
  subject_code text not null references public.subjects (code),
  code         text not null unique,
  kind         text not null check (kind in ('componente', 'categoria', 'parte', 'tipo_texto', 'tipo_contenido')),
  name         text not null,
  description  text not null
);

create index competencies_subject_idx on public.competencies (subject_code);
create index affirmations_competency_idx on public.affirmations (competency_id);
create index evidences_affirmation_idx on public.evidences (affirmation_id);

-- -----------------------------------------------------------------------------
-- 4. Banco de preguntas (100 % originales)
-- -----------------------------------------------------------------------------

-- Valida options: 4 objetos A-D en orden, una unica clave, feedback por opcion.
create or replace function public.is_valid_question_options(opts jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(opts) = 'array'
     and jsonb_array_length(opts) = 4
     and (select string_agg(o ->> 'label', '' order by ord) from jsonb_array_elements(opts) with ordinality as t(o, ord)) = 'ABCD'
     and (select count(*) from jsonb_array_elements(opts) o where (o ->> 'is_correct')::boolean) = 1
     and not exists (
       select 1 from jsonb_array_elements(opts) o
       where coalesce(o ->> 'text', '') = ''
          or coalesce(o ->> 'explanation_feedback', '') = ''
          or jsonb_typeof(o -> 'is_correct') <> 'boolean'
     );
$$;

create table public.questions (
  id                     uuid primary key default gen_random_uuid(),
  evidence_id            uuid not null references public.evidences (id),
  subject_id             text not null references public.subjects (code),
  component_id           uuid references public.content_components (id),
  status                 text not null default 'draft'
                         check (status in ('draft', 'qa_passed', 'calibrated', 'retired')),
  context_type           text not null
                         check (context_type in ('continuous', 'discontinuous', 'mixed', 'cefr_part')),
  -- {"text": "...", "svg": "<svg ...>" | null, "table": {...} | null}
  context_content        jsonb not null default '{}'::jsonb
                         check (jsonb_typeof(context_content) = 'object'
                                and pg_column_size(context_content) <= 16384),
  stem                   text not null check (char_length(stem) between 5 and 2000),
  options                jsonb not null check (public.is_valid_question_options(options)),
  cefr_level             text check (cefr_level in ('A-', 'A1', 'A2', 'B1', 'B+')),
  irt_a                  real not null default 1.0 check (irt_a > 0 and irt_a <= 4),
  irt_b                  real not null default 0.0 check (irt_b between -4 and 4),
  irt_c                  real not null default 0.25 check (irt_c between 0 and 0.5),
  irt_calibrated_n       integer not null default 0,
  estimated_time_seconds smallint not null default 90 check (estimated_time_seconds between 10 and 900),
  -- Declaracion de originalidad: nunca se cargan items de cuadernillos del Icfes.
  origin                 text not null default 'original_generated'
                         check (origin in ('original_generated', 'original_authored')),
  version                bigint not null default nextval('public.content_version_seq'),
  created_by             uuid references auth.users (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint english_has_cefr check ((subject_id = 'IN') = (cefr_level is not null))
);

create trigger questions_bump_version
  before update on public.questions
  for each row execute function public.bump_content_version();

create index questions_subject_version_idx on public.questions (subject_id, version);
create index questions_evidence_idx on public.questions (evidence_id) where status in ('qa_passed', 'calibrated');

-- -----------------------------------------------------------------------------
-- 5. FSRS-6, sesiones, intentos y estimaciones
-- -----------------------------------------------------------------------------

create table public.user_card_fsrs_state (
  user_id              uuid not null references auth.users (id) on delete cascade,
  question_id          uuid not null references public.questions (id) on delete cascade,
  stability            double precision not null default 0 check (stability >= 0),
  difficulty           double precision not null default 0 check (difficulty between 0 and 10),
  retrievability_cache double precision check (retrievability_cache between 0 and 1),
  elapsed_days         integer not null default 0 check (elapsed_days >= 0),
  scheduled_days       integer not null default 0 check (scheduled_days >= 0),
  reps                 integer not null default 0 check (reps >= 0),
  lapses               integer not null default 0 check (lapses >= 0),
  state                text not null default 'New'
                       check (state in ('New', 'Learning', 'Review', 'Relearning')),
  due_at               timestamptz not null default now(),
  last_review_at       timestamptz,
  updated_at           timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index fsrs_due_idx on public.user_card_fsrs_state (user_id, due_at);

create table public.study_sessions (
  id            uuid primary key default gen_random_uuid(), -- generado en el cliente (idempotencia offline)
  user_id       uuid not null references auth.users (id) on delete cascade,
  session_mode  text not null check (session_mode in ('fsrs_daily', 'interleaved', 'mock_exam', 'diagnostic')),
  started_at    timestamptz not null,
  ended_at      timestamptz,
  planned_items smallint not null default 0 check (planned_items >= 0),
  device        text check (device in ('web', 'android', 'windows')),
  created_at    timestamptz not null default now(),
  constraint session_time_order check (ended_at is null or ended_at >= started_at)
);

create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

create table public.attempt_logs (
  id               uuid primary key, -- generado en el cliente (idempotencia offline)
  user_id          uuid not null references auth.users (id) on delete cascade,
  session_id       uuid references public.study_sessions (id) on delete cascade,
  question_id      uuid not null references public.questions (id) on delete cascade,
  question_version bigint not null,
  selected_option  char(1) check (selected_option in ('A', 'B', 'C', 'D')), -- null = omitida
  is_correct       boolean not null, -- lo calcula el servidor, no el cliente
  rating_1_to_4    smallint not null check (rating_1_to_4 between 1 and 4),
  response_time_ms integer not null check (response_time_ms between 0 and 3600000),
  session_mode     text not null check (session_mode in ('fsrs_daily', 'interleaved', 'mock_exam', 'diagnostic')),
  answered_at      timestamptz not null,
  synced_at        timestamptz not null default now()
);

create index attempt_logs_user_idx on public.attempt_logs (user_id, answered_at desc);
create index attempt_logs_question_idx on public.attempt_logs (question_id); -- recalibracion TRI

create table public.user_theta_estimates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  lc_score     smallint check (lc_score between 0 and 100),
  ma_score     smallint check (ma_score between 0 and 100),
  sc_score     smallint check (sc_score between 0 and 100),
  cn_score     smallint check (cn_score between 0 and 100),
  in_score     smallint check (in_score between 0 and 100),
  global_score smallint check (global_score between 0 and 500),
  -- {"LC": {"theta": 0.12, "se": 0.31, "n": 40}, ...}
  theta_detail jsonb not null default '{}'::jsonb,
  source       text not null check (source in ('diagnostic', 'rolling', 'mock_exam')),
  estimated_at timestamptz not null default now()
);

create index theta_user_idx on public.user_theta_estimates (user_id, estimated_at desc);

-- -----------------------------------------------------------------------------
-- 6. Row Level Security y permisos
-- -----------------------------------------------------------------------------

alter table public.co_public_holidays    enable row level security;
alter table public.profiles              enable row level security;
alter table public.parental_consents     enable row level security;
alter table public.arco_requests         enable row level security;
alter table public.subjects              enable row level security;
alter table public.competencies          enable row level security;
alter table public.affirmations          enable row level security;
alter table public.evidences             enable row level security;
alter table public.content_components    enable row level security;
alter table public.questions             enable row level security;
alter table public.user_card_fsrs_state  enable row level security;
alter table public.study_sessions        enable row level security;
alter table public.attempt_logs          enable row level security;
alter table public.user_theta_estimates  enable row level security;

-- Supabase concede privilegios amplios por defecto; los recortamos explicitamente.
revoke all on all tables in schema public from anon, authenticated;

-- Taxonomia y festivos: lectura publica (datos no personales).
grant select on public.subjects, public.competencies, public.affirmations,
               public.evidences, public.content_components, public.co_public_holidays
  to anon, authenticated;
create policy taxonomy_read on public.subjects           for select using (true);
create policy taxonomy_read on public.competencies       for select using (true);
create policy taxonomy_read on public.affirmations       for select using (true);
create policy taxonomy_read on public.evidences          for select using (true);
create policy taxonomy_read on public.content_components for select using (true);
create policy holidays_read on public.co_public_holidays for select using (true);

-- Preguntas: solo usuarios autenticados con tratamiento autorizado, solo publicadas.
grant select on public.questions to authenticated;
create policy questions_read_published on public.questions
  for select to authenticated
  using (status in ('qa_passed', 'calibrated') and public.can_process_data(auth.uid()));

-- Perfil: el titular lee y edita solo columnas no sensibles. birth_year no se
-- edita desde el cliente (evita que un menor se declare adulto); se corrige via ARCO.
grant select on public.profiles to authenticated;
grant update (display_name, parent_guardian_email, exam_calendar,
              target_exam_date, target_global_score, daily_study_minutes)
  on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- parental_consents: sin acceso de cliente (solo Edge Function con service_role).

-- ARCO: cualquiera autenticado registra y consulta las suyas.
grant select, insert on public.arco_requests to authenticated;
grant insert on public.arco_requests to anon; -- acudientes sin cuenta
create policy arco_insert_own on public.arco_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'received');
create policy arco_insert_anon on public.arco_requests
  for insert to anon
  with check (user_id is null and status = 'received');
create policy arco_select_own on public.arco_requests
  for select to authenticated using (user_id = auth.uid());

-- Datos de estudio: aislados por usuario y bloqueados mientras falte consentimiento.
grant select, insert, update on public.user_card_fsrs_state to authenticated;
grant select, insert, update on public.study_sessions to authenticated;
grant select, insert on public.attempt_logs to authenticated;
grant select on public.user_theta_estimates to authenticated;

create policy fsrs_own on public.user_card_fsrs_state
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_process_data(auth.uid()));
create policy sessions_own on public.study_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_process_data(auth.uid()));
create policy attempts_select_own on public.attempt_logs
  for select to authenticated using (user_id = auth.uid());
create policy attempts_insert_own on public.attempt_logs
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_process_data(auth.uid()));
create policy theta_select_own on public.user_theta_estimates
  for select to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7. RPC
-- -----------------------------------------------------------------------------

-- Procesa en una sola peticion lo acumulado offline. Idempotente: reenviar el
-- mismo lote no duplica filas. Payload:
-- {
--   "sessions":    [{"id","session_mode","started_at","ended_at","planned_items","device"}],
--   "attempts":    [{"id","session_id","question_id","question_version","selected_option",
--                    "rating_1_to_4","response_time_ms","session_mode","answered_at"}],
--   "fsrs_states": [{"question_id","stability","difficulty","retrievability_cache","elapsed_days",
--                    "scheduled_days","reps","lapses","state","due_at","last_review_at","updated_at"}]
-- }
create or replace function public.sync_offline_batch(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid               uuid := auth.uid();
  n_sessions        integer := 0;
  n_attempts        integer := 0;
  n_states          integer := 0;
  n_attempts_in     integer := coalesce(jsonb_array_length(payload -> 'attempts'), 0);
begin
  if uid is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;
  if not public.can_process_data(uid) then
    raise exception 'Falta autorizacion parental (Ley 1581)' using errcode = '42501';
  end if;
  if n_attempts_in > 1000
     or coalesce(jsonb_array_length(payload -> 'fsrs_states'), 0) > 1000
     or coalesce(jsonb_array_length(payload -> 'sessions'), 0) > 100 then
    raise exception 'Lote demasiado grande: maximo 1000 intentos/estados y 100 sesiones';
  end if;

  insert into public.study_sessions (id, user_id, session_mode, started_at, ended_at, planned_items, device)
  select s.id, uid, s.session_mode, s.started_at, s.ended_at, coalesce(s.planned_items, 0), s.device
  from jsonb_to_recordset(coalesce(payload -> 'sessions', '[]'::jsonb)) as s(
    id uuid, session_mode text, started_at timestamptz, ended_at timestamptz,
    planned_items smallint, device text)
  on conflict (id) do update
    set ended_at = excluded.ended_at
    where public.study_sessions.user_id = uid
      and public.study_sessions.ended_at is null;
  get diagnostics n_sessions = row_count;

  -- is_correct se deriva de la clave guardada en el servidor.
  insert into public.attempt_logs (id, user_id, session_id, question_id, question_version,
                                   selected_option, is_correct, rating_1_to_4, response_time_ms,
                                   session_mode, answered_at)
  select a.id, uid, a.session_id, a.question_id, a.question_version, a.selected_option,
         coalesce((
           select (o ->> 'is_correct')::boolean
           from jsonb_array_elements(q.options) o
           where o ->> 'label' = a.selected_option
         ), false),
         a.rating_1_to_4, a.response_time_ms, a.session_mode, a.answered_at
  from jsonb_to_recordset(coalesce(payload -> 'attempts', '[]'::jsonb)) as a(
    id uuid, session_id uuid, question_id uuid, question_version bigint, selected_option char(1),
    rating_1_to_4 smallint, response_time_ms integer, session_mode text, answered_at timestamptz)
  join public.questions q on q.id = a.question_id
  where a.session_id is null
     or exists (select 1 from public.study_sessions s where s.id = a.session_id and s.user_id = uid)
  on conflict (id) do nothing;
  get diagnostics n_attempts = row_count;

  -- Ultima escritura gana segun updated_at del dispositivo.
  insert into public.user_card_fsrs_state (user_id, question_id, stability, difficulty,
                                           retrievability_cache, elapsed_days, scheduled_days,
                                           reps, lapses, state, due_at, last_review_at, updated_at)
  select uid, f.question_id, f.stability, f.difficulty, f.retrievability_cache, f.elapsed_days,
         f.scheduled_days, f.reps, f.lapses, f.state, f.due_at, f.last_review_at, f.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'fsrs_states', '[]'::jsonb)) as f(
    question_id uuid, stability double precision, difficulty double precision,
    retrievability_cache double precision, elapsed_days integer, scheduled_days integer,
    reps integer, lapses integer, state text, due_at timestamptz, last_review_at timestamptz,
    updated_at timestamptz)
  on conflict (user_id, question_id) do update
    set stability = excluded.stability,
        difficulty = excluded.difficulty,
        retrievability_cache = excluded.retrievability_cache,
        elapsed_days = excluded.elapsed_days,
        scheduled_days = excluded.scheduled_days,
        reps = excluded.reps,
        lapses = excluded.lapses,
        state = excluded.state,
        due_at = excluded.due_at,
        last_review_at = excluded.last_review_at,
        updated_at = excluded.updated_at
    where excluded.updated_at > public.user_card_fsrs_state.updated_at;
  get diagnostics n_states = row_count;

  return jsonb_build_object(
    'sessions_upserted', n_sessions,
    'attempts_inserted', n_attempts,
    'attempts_skipped',  n_attempts_in - n_attempts,
    'fsrs_states_applied', n_states,
    'server_time', now()
  );
end;
$$;

-- Descarga incremental de preguntas publicadas (para el espejo SQLite).
-- Devuelve tambien las retiradas para que el cliente las borre localmente.
create or replace function public.get_questions_since(
  p_subject text,
  p_since_version bigint,
  p_limit integer default 200
)
returns table (
  id uuid, evidence_id uuid, subject_id text, component_id uuid, status text,
  context_type text, context_content jsonb, stem text, options jsonb, cefr_level text,
  irt_a real, irt_b real, irt_c real, estimated_time_seconds smallint, version bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.evidence_id, q.subject_id, q.component_id, q.status, q.context_type,
         case when q.status = 'retired' then '{}'::jsonb else q.context_content end,
         case when q.status = 'retired' then '' else q.stem end,
         case when q.status = 'retired' then '[]'::jsonb else q.options end,
         q.cefr_level, q.irt_a, q.irt_b, q.irt_c, q.estimated_time_seconds, q.version
  from public.questions q
  where auth.uid() is not null
    and public.can_process_data(auth.uid())
    and q.subject_id = p_subject
    and q.version > p_since_version
    and q.status in ('qa_passed', 'calibrated', 'retired')
  order by q.version
  limit least(greatest(p_limit, 1), 500);
$$;

revoke execute on function public.sync_offline_batch(jsonb) from public, anon;
revoke execute on function public.get_questions_since(text, bigint, integer) from public, anon;
grant execute on function public.sync_offline_batch(jsonb) to authenticated;
grant execute on function public.get_questions_since(text, bigint, integer) to authenticated;
