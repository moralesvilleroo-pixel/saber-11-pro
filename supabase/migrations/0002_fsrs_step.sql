-- =============================================================================
-- 0002: paso de aprendizaje FSRS-6
-- El planificador FSRS-6 (packages/core/src/spaced-repetition/fsrs6.ts) necesita saber en
-- que paso de aprendizaje/reaprendizaje va cada tarjeta. Se agrega la columna `step`
-- (null en Review) y sync_offline_batch la acepta en "fsrs_states".
-- =============================================================================

alter table public.user_card_fsrs_state
  add column step smallint check (step >= 0);

alter table public.user_card_fsrs_state
  add constraint fsrs_step_matches_state
  check (state = 'New' or (state = 'Review') = (step is null));

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
                                           reps, lapses, state, step, due_at, last_review_at, updated_at)
  select uid, f.question_id, f.stability, f.difficulty, f.retrievability_cache, f.elapsed_days,
         f.scheduled_days, f.reps, f.lapses, f.state, f.step, f.due_at, f.last_review_at, f.updated_at
  from jsonb_to_recordset(coalesce(payload -> 'fsrs_states', '[]'::jsonb)) as f(
    question_id uuid, stability double precision, difficulty double precision,
    retrievability_cache double precision, elapsed_days integer, scheduled_days integer,
    reps integer, lapses integer, state text, step smallint, due_at timestamptz, last_review_at timestamptz,
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
        step = excluded.step,
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
