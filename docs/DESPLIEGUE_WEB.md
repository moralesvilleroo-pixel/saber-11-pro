# Despliegue de la web (Vercel Hobby + Supabase)

Vercel Hobby es solo para uso no comercial: sin cobros, suscripciones, anuncios ni donaciones.
Todo se puede hacer desde el celular.

## 1. Base de datos

Después de fusionar el Pull Request, en GitHub: **Actions > Cargar a Supabase > Run workflow**,
primero con `probar` y luego con `aplicar`. Aplica la migración `0003_consentimiento_y_theta.sql`
(autorización del acudiente y guardado de puntajes) y todo lo que falte.

## 2. Proyecto en Vercel

1. Entra a vercel.com con tu cuenta de GitHub y toca **Add New… > Project**.
2. Importa `saber-11-pro`. En **Root Directory** elige `apps/web` (Vercel lee `apps/web/vercel.json`).
3. En **Environment Variables** agrega:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` (secreta, solo servidor) |
| `NEXT_PUBLIC_SITE_URL` | La dirección que te da Vercel, p. ej. `https://saber-11-pro.vercel.app` (sin `/` al final) |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | El usuario SMTP de Brevo (el mismo que pusiste en Supabase) |
| `SMTP_PASS` | La clave SMTP de Brevo |
| `SMTP_FROM` | `Saber11 Pro <tu-remitente-verificado>` |
| `NEXT_PUBLIC_RESPONSABLE_NOMBRE` | Nombre del responsable del tratamiento (aparece en la política) |
| `NEXT_PUBLIC_RESPONSABLE_CORREO` | Correo de contacto para datos personales |

4. **Deploy**. Sin las variables de Supabase la web igual funciona en modo demo.

## 3. Supabase Auth

**Authentication > URL Configuration**
- Site URL: la misma de `NEXT_PUBLIC_SITE_URL`.
- Redirect URLs: agrega `https://TU-DOMINIO/**`.

**Authentication > Emails > Templates**: plantillas en español. Usan `token_hash`, así el enlace sirve
aunque se abra en otro dispositivo.

Confirm signup, asunto `Confirma tu cuenta de Saber11 Pro`:
```html
<h2>Confirma tu correo</h2>
<p>Toca el enlace para activar tu cuenta de Saber11 Pro:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/inicio">Confirmar mi correo</a></p>
<p>Si no creaste esta cuenta, ignora este mensaje.</p>
```

Reset password, asunto `Cambia tu contraseña de Saber11 Pro`:
```html
<h2>Nueva contraseña</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/cuenta/nueva-clave">Crear una contraseña nueva</a></p>
<p>Si no lo pediste, ignora este mensaje.</p>
```

Magic link, asunto `Tu enlace para ingresar a Saber11 Pro`:
```html
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/inicio">Ingresar a Saber11 Pro</a></p>
```

Change email address, asunto `Confirma tu nuevo correo`:
```html
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/inicio">Confirmar el cambio a {{ .NewEmail }}</a></p>
```

Invite user, asunto `Te invitaron a Saber11 Pro`:
```html
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/cuenta/nueva-clave">Aceptar la invitación</a></p>
```

## 4. Prueba rápida

1. Abre `/demo` y responde una sesión diaria.
2. Crea una cuenta con año de nacimiento de adulto: al confirmar el correo entras directo a estudiar.
3. Crea otra con año de menor y tu otro correo como acudiente: en **Inicio** toca
   «Enviar correo de autorización», abre el enlace desde el correo del acudiente y autoriza.
4. Recarga **Inicio** en la cuenta del menor: ya aparecen la sesión diaria, el diagnóstico y el simulacro.

## Cómo está armado

- Rutas públicas: `/`, `/demo`, `/registro`, `/ingresar`, `/privacidad`, `/arco`, `/acudiente/[token]`.
- Rutas con sesión: `/inicio`, `/estudiar?modo=diaria|diagnostico|simulacro` (`&escala=media|cuarto` en simulacro).
- El estudio corre en el navegador con `@icfes/core` (planificador, FSRS-6, TRI). Las respuestas se
  guardan primero en el dispositivo y se envían con `sync_offline_batch`; si se cae la conexión se
  reenvían solas.
- La autorización del acudiente la crea y verifica el servidor (`/api/consentimiento/*`) con
  `service_role` y las funciones de la migración 0003; en la base solo queda el hash del token.
