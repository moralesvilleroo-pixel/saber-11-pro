\set ON_ERROR_STOP 1
-- Pruebas de 0003_consentimiento_y_theta.sql. Ver scripts/test-db.sh.
insert into auth.users (id, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000c', '{"birth_year":"2010","parent_guardian_email":"mama@example.com","privacy_policy_version":"2026-11-28","display_name":"Ana"}');

-- El cliente no puede pedir ni verificar autorizaciones
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  perform public.verify_parental_consent(repeat('a', 64), null, null);
  raise exception 'FALLO: cliente ejecuto verify_parental_consent';
exception when insufficient_privilege then raise notice 'OK cliente no puede verificar autorizaciones'; end $$;
do $$ begin
  perform public.request_parental_consent(auth.uid(), repeat('a', 64), 'x');
  raise exception 'FALLO: cliente ejecuto request_parental_consent';
exception when insufficient_privilege then raise notice 'OK cliente no puede crear solicitudes'; end $$;
-- Sin consentimiento no guarda estimaciones
do $$ begin
  insert into public.user_theta_estimates (user_id, lc_score, source) values (auth.uid(), 50, 'diagnostic');
  raise exception 'FALLO: theta sin consentimiento';
exception when insufficient_privilege then raise notice 'OK theta bloqueado sin consentimiento'; end $$;
reset role;

set role service_role;
do $$ declare r record; begin
  select * into r from public.request_parental_consent('00000000-0000-0000-0000-00000000000c', repeat('1', 64), '');
  if r.guardian_email <> 'mama@example.com' or r.student_name <> 'Ana' then raise exception 'FALLO: datos de la solicitud %', r; end if;
  raise notice 'OK solicitud creada para %', r.guardian_email;
end $$;
do $$ begin
  perform public.request_parental_consent('00000000-0000-0000-0000-00000000000c', repeat('2', 64), '');
  raise exception 'FALLO: reenvio sin esperar';
exception when sqlstate '53400' then raise notice 'OK reenvio limitado a 1 cada 10 minutos'; end $$;
do $$ begin
  perform public.request_parental_consent('00000000-0000-0000-0000-00000000000b', repeat('3', 64), '');
  raise exception 'FALLO: solicitud para un adulto';
exception when sqlstate '55000' then raise notice 'OK adultos no necesitan autorizacion'; end $$;
do $$ begin
  perform public.request_parental_consent('00000000-0000-0000-0000-00000000000c', 'corto', '');
  raise exception 'FALLO: hash invalido aceptado';
exception when sqlstate '22023' then raise notice 'OK hash de token validado'; end $$;
do $$ begin
  if (select state from public.get_parental_consent(repeat('1', 64))) <> 'valid' then raise exception 'FALLO: token deberia ser valido'; end if;
  if (select state from public.get_parental_consent(repeat('9', 64))) <> 'not_found' then raise exception 'FALLO: token inexistente'; end if;
  if public.verify_parental_consent(repeat('9', 64), null, null) <> 'not_found' then raise exception 'FALLO: verifico token inexistente'; end if;
  raise notice 'OK estados de token';
end $$;
reset role;

-- Si el menor cambia el correo del acudiente, el enlace anterior deja de valer
update public.parental_consents set sent_at = now() - interval '11 minutes';
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
update public.profiles set parent_guardian_email = 'otro@example.com' where id = auth.uid();
reset role;
set role service_role;
do $$ begin
  if public.verify_parental_consent(repeat('1', 64), '203.0.113.5', 'Prueba') <> 'email_changed' then raise exception 'FALLO: verifico con correo cambiado'; end if;
  raise notice 'OK enlace invalido tras cambiar el correo del acudiente';
  perform public.request_parental_consent('00000000-0000-0000-0000-00000000000c', repeat('4', 64), '');
  if (select state from public.get_parental_consent(repeat('1', 64))) <> 'revoked' then raise exception 'FALLO: el token viejo no se anulo'; end if;
  if public.verify_parental_consent(repeat('4', 64), '203.0.113.5', 'Navegador de prueba') <> 'verified' then raise exception 'FALLO: no verifico'; end if;
  if public.verify_parental_consent(repeat('4', 64), '203.0.113.5', 'x') <> 'used' then raise exception 'FALLO: token reutilizable'; end if;
  raise notice 'OK autorizacion verificada una sola vez';
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000c'
                 and parental_consent_status = 'verified' and parental_consent_timestamp is not null) then
    raise exception 'FALLO: perfil no quedo verificado';
  end if;
  if not exists (select 1 from public.parental_consents where token_hash = repeat('4', 64)
                 and verified_ip = '203.0.113.5' and guardian_email = 'otro@example.com') then
    raise exception 'FALLO: falta evidencia de la autorizacion';
  end if;
  raise notice 'OK perfil verificado con evidencia (IP, correo)';
end $$;

-- Con consentimiento guarda sus estimaciones, pero no las de otro
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
insert into public.user_theta_estimates (user_id, lc_score, ma_score, theta_detail, source)
values (auth.uid(), 55, 48, '{"LC":{"theta":0.5,"se":0.6,"n":8}}', 'diagnostic');
do $$ begin
  insert into public.user_theta_estimates (user_id, lc_score, source) values ('00000000-0000-0000-0000-00000000000b', 99, 'rolling');
  raise exception 'FALLO: guardo theta de otro usuario';
exception when insufficient_privilege then raise notice 'OK theta solo propio'; end $$;
do $$ begin
  if (select count(*) from public.user_theta_estimates) <> 1 then raise exception 'FALLO: ve estimaciones ajenas'; end if;
  raise notice 'OK estimacion guardada';
end $$;
reset role;
