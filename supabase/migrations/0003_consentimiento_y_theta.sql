-- =============================================================================
-- 0003: autorizacion parental verificable y estimaciones theta desde el cliente
--
-- La web (servidor, con service_role) genera un token aleatorio, guarda aqui solo su hash
-- SHA-256 y envia el enlace al acudiente. Al abrirlo, el acudiente autoriza y el servidor
-- marca el perfil como 'verified' (Ley 1581 de 2012, Art. 7; Decreto 1377 de 2013).
-- Estas funciones solo las puede ejecutar service_role: el cliente nunca se autoverifica.
-- =============================================================================

begin;

-- Crea una solicitud de autorizacion para un menor con consentimiento pendiente.
-- Anula las solicitudes previas sin usar y limita el reenvio (1 cada 10 min, 5 por dia).
create or replace function public.request_parental_consent(
  p_profile_id     uuid,
  p_token_hash     text,
  p_policy_version text
)
returns table (guardian_email text, student_name text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  prof public.profiles%rowtype;
  last_sent timestamptz;
  sent_today integer;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Hash de token invalido' using errcode = '22023';
  end if;

  select * into prof from public.profiles p where p.id = p_profile_id for update;
  if not found then
    raise exception 'Perfil inexistente' using errcode = 'P0002';
  end if;
  if not prof.is_minor or prof.parental_consent_status <> 'pending' then
    raise exception 'Este perfil no necesita autorizacion parental' using errcode = '55000';
  end if;
  if prof.parent_guardian_email is null then
    raise exception 'Falta el correo del acudiente' using errcode = '23502';
  end if;

  select max(c.sent_at), count(*) filter (where c.sent_at > now() - interval '1 day')
    into last_sent, sent_today
  from public.parental_consents c
  where c.profile_id = p_profile_id;
  if last_sent > now() - interval '10 minutes' then
    raise exception 'Espera 10 minutos antes de reenviar el correo' using errcode = '53400';
  end if;
  if sent_today >= 5 then
    raise exception 'Limite diario de correos de autorizacion alcanzado' using errcode = '53400';
  end if;

  update public.parental_consents c
     set revoked_at = now()
   where c.profile_id = p_profile_id and c.verified_at is null and c.revoked_at is null;

  return query
  insert into public.parental_consents as c (profile_id, guardian_email, token_hash, privacy_policy_version)
  values (p_profile_id, prof.parent_guardian_email, p_token_hash,
          coalesce(nullif(p_policy_version, ''), prof.privacy_policy_version))
  returning c.guardian_email, coalesce(prof.display_name, 'el estudiante'), c.expires_at;
end;
$$;

-- Estado de una solicitud para mostrarla al acudiente antes de autorizar.
-- state: valid | expired | used | revoked | email_changed | not_found
create or replace function public.get_parental_consent(p_token_hash text)
returns table (state text, student_name text, guardian_email text, policy_version text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when c.verified_at is not null then 'used'
      when c.revoked_at is not null then 'revoked'
      when c.expires_at <= now() then 'expired'
      when p.parent_guardian_email is distinct from c.guardian_email then 'email_changed'
      else 'valid'
    end,
    coalesce(p.display_name, 'el estudiante'),
    c.guardian_email,
    c.privacy_policy_version,
    c.expires_at
  from public.parental_consents c
  join public.profiles p on p.id = c.profile_id
  where c.token_hash = p_token_hash
  union all
  select 'not_found', null, null, null, null
  where not exists (select 1 from public.parental_consents c where c.token_hash = p_token_hash)
$$;

-- Registra la autorizacion (con IP y navegador como evidencia) y marca el perfil 'verified'.
-- Devuelve el mismo estado que get_parental_consent, o 'verified' si quedo autorizado.
create or replace function public.verify_parental_consent(
  p_token_hash text,
  p_ip         inet,
  p_user_agent text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.parental_consents%rowtype;
  current_state text;
begin
  select * into c from public.parental_consents pc where pc.token_hash = p_token_hash for update;
  if not found then
    return 'not_found';
  end if;
  select g.state into current_state from public.get_parental_consent(p_token_hash) g;
  if current_state <> 'valid' then
    return current_state;
  end if;

  update public.parental_consents
     set verified_at = now(), verified_ip = p_ip, verified_user_agent = left(p_user_agent, 500)
   where id = c.id;
  update public.profiles
     set parental_consent_status = 'verified', parental_consent_timestamp = now()
   where id = c.profile_id and is_minor;
  return 'verified';
end;
$$;

revoke execute on function public.request_parental_consent(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.get_parental_consent(text) from public, anon, authenticated;
revoke execute on function public.verify_parental_consent(text, inet, text) from public, anon, authenticated;
grant execute on function public.request_parental_consent(uuid, text, text) to service_role;
grant execute on function public.get_parental_consent(text) to service_role;
grant execute on function public.verify_parental_consent(text, inet, text) to service_role;

-- El cliente guarda sus estimaciones (diagnostico, sesiones y simulacros) calculadas con @icfes/core.
grant insert (user_id, lc_score, ma_score, sc_score, cn_score, in_score, global_score, theta_detail, source)
  on public.user_theta_estimates to authenticated;
create policy theta_insert_own on public.user_theta_estimates
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_process_data(auth.uid()));

commit;
