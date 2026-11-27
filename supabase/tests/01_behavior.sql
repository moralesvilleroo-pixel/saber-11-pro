\set ON_ERROR_STOP 1
-- Pruebas de comportamiento de 0001_initial_schema.sql. Ver scripts/test-db.sh.
-- datos de prueba
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', '{"birth_year":"2009","parent_guardian_email":"acudiente@example.com","privacy_policy_version":"v1"}'),
 ('00000000-0000-0000-0000-00000000000b', '{"birth_year":"2000","privacy_policy_version":"v1"}');
select id, is_minor, parental_consent_status from public.profiles order by id;
insert into public.competencies (id, subject_code, code, name, description) values ('10000000-0000-0000-0000-000000000001','MA','TEST.MA.C1','Interpretacion','x');
insert into public.affirmations (id, competency_id, code, statement) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','TEST.MA.C1.A1','x');
insert into public.evidences (id, affirmation_id, code, statement) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','TEST.MA.C1.A1.E1','x');
insert into public.questions (id, evidence_id, subject_id, status, context_type, stem, options) values
('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','MA','qa_passed','continuous','Cuanto es 2+2?',
 '[{"label":"A","text":"3","is_correct":false,"distractor_type":"x","explanation_feedback":"no"},{"label":"B","text":"4","is_correct":true,"distractor_type":null,"explanation_feedback":"si"},{"label":"C","text":"5","is_correct":false,"distractor_type":"x","explanation_feedback":"no"},{"label":"D","text":"22","is_correct":false,"distractor_type":"x","explanation_feedback":"no"}]'),
('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','MA','draft','continuous','Borrador oculto',
 '[{"label":"A","text":"3","is_correct":false,"distractor_type":"x","explanation_feedback":"no"},{"label":"B","text":"4","is_correct":true,"distractor_type":null,"explanation_feedback":"si"},{"label":"C","text":"5","is_correct":false,"distractor_type":"x","explanation_feedback":"no"},{"label":"D","text":"22","is_correct":false,"distractor_type":"x","explanation_feedback":"no"}]');

-- opciones invalidas (dos claves) deben fallar
do $$ begin
  insert into public.questions (evidence_id, subject_id, context_type, stem, options) values ('30000000-0000-0000-0000-000000000001','MA','continuous','dos claves',
  '[{"label":"A","text":"1","is_correct":true,"explanation_feedback":"x"},{"label":"B","text":"2","is_correct":true,"explanation_feedback":"x"},{"label":"C","text":"3","is_correct":false,"explanation_feedback":"x"},{"label":"D","text":"4","is_correct":false,"explanation_feedback":"x"}]');
  raise exception 'FALLO: acepto dos claves';
exception when check_violation then raise notice 'OK opciones con dos claves rechazadas'; end $$;

-- ARCO: viernes 2026-11-27 + 10 habiles = 2026-12-11; +15 = 2026-12-18
insert into public.arco_requests (requester_email, request_type, description, received_at) values
 ('a@example.com','consulta','Quiero saber mis datos','2026-11-27 12:00-05'),
 ('a@example.com','supresion','Borren mis datos por favor','2026-11-27 12:00-05');
select request_type, due_at from public.arco_requests order by request_type;

-- ===== como menor sin consentimiento =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select count(*) as preguntas_visibles_menor_pendiente from public.questions;
do $$ begin
  perform public.sync_offline_batch('{"attempts":[]}');
  raise exception 'FALLO: sync permitido sin consentimiento';
exception when insufficient_privilege then raise notice 'OK sync bloqueado sin consentimiento parental'; end $$;
do $$ begin
  update public.profiles set parental_consent_status = 'verified' where id = auth.uid();
  raise exception 'FALLO: autoverificacion';
exception when insufficient_privilege then raise notice 'OK no puede autoverificar consentimiento (permiso por columna)'; end $$;
do $$ begin
  update public.profiles set birth_year = 1990 where id = auth.uid();
  raise exception 'FALLO: menor cambio su ano de nacimiento';
exception when insufficient_privilege then raise notice 'OK menor no puede declararse adulto'; end $$;
reset role;

-- verificacion por servidor
update public.profiles set parental_consent_status='verified', parental_consent_timestamp=now() where id='00000000-0000-0000-0000-00000000000a';

-- ===== menor verificado =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select count(*) as preguntas_visibles_menor_verificado from public.questions;
select public.sync_offline_batch('{
 "sessions":[{"id":"50000000-0000-0000-0000-000000000001","session_mode":"interleaved","started_at":"2026-11-27T10:00:00Z","planned_items":2,"device":"windows"}],
 "attempts":[
   {"id":"60000000-0000-0000-0000-000000000001","session_id":"50000000-0000-0000-0000-000000000001","question_id":"40000000-0000-0000-0000-000000000001","question_version":1,"selected_option":"B","rating_1_to_4":3,"response_time_ms":40000,"session_mode":"interleaved","answered_at":"2026-11-27T10:01:00Z"},
   {"id":"60000000-0000-0000-0000-000000000002","session_id":"50000000-0000-0000-0000-000000000001","question_id":"40000000-0000-0000-0000-000000000002","question_version":1,"selected_option":"B","rating_1_to_4":3,"response_time_ms":40000,"session_mode":"interleaved","answered_at":"2026-11-27T10:02:00Z"}],
 "fsrs_states":[{"question_id":"40000000-0000-0000-0000-000000000001","stability":3.1,"difficulty":5.2,"retrievability_cache":0.9,"elapsed_days":0,"scheduled_days":3,"reps":1,"lapses":0,"state":"Review","due_at":"2026-11-30T10:00:00Z","last_review_at":"2026-11-27T10:01:00Z","updated_at":"2026-11-27T10:01:00Z"}]}') as sync1;
-- reenvio identico: idempotente
select public.sync_offline_batch('{"attempts":[{"id":"60000000-0000-0000-0000-000000000001","session_id":null,"question_id":"40000000-0000-0000-0000-000000000001","question_version":1,"selected_option":"A","rating_1_to_4":1,"response_time_ms":1,"session_mode":"interleaved","answered_at":"2026-11-27T10:01:00Z"}],
 "fsrs_states":[{"question_id":"40000000-0000-0000-0000-000000000001","stability":0.1,"difficulty":9,"retrievability_cache":0.1,"elapsed_days":0,"scheduled_days":0,"reps":9,"lapses":9,"state":"Relearning","due_at":"2026-11-27T10:00:00Z","last_review_at":"2026-11-27T09:00:00Z","updated_at":"2026-11-27T09:00:00Z"}]}') as sync_reenvio_viejo;
select id, is_correct from public.attempt_logs;
select stability, reps, state from public.user_card_fsrs_state;
select id, status, version from public.get_questions_since('MA', 0);
reset role;

-- ===== adulto no ve datos del menor =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select count(*) as intentos_ajenos_visibles from public.attempt_logs;
select count(*) as perfiles_visibles from public.profiles;
reset role;
-- ===== anon =====
set role anon; reset request.jwt.claim.sub;
select count(*) as subjects_anon from public.subjects;
do $$ begin perform count(*) from public.questions; raise exception 'FALLO anon ve preguntas';
exception when insufficient_privilege then raise notice 'OK anon sin acceso a preguntas'; end $$;
reset role;
-- version sube al editar
update public.questions set irt_b = 0.5 where id='40000000-0000-0000-0000-000000000001';
select version from public.questions where id='40000000-0000-0000-0000-000000000001';
