# Estado del proyecto

Registro vivo. Actualizar al cierre de cada Pull Request.

## Semana actual: 1 - Base en GitHub y Supabase

### Hecho
- 2026-11-27 · Monorepo Turborepo + pnpm (`package.json`, `turbo.json`, `tsconfig.base.json`).
- 2026-11-27 · `CLAUDE.md`, `docs/PRD_PEDAGOGIA.md` y este archivo.
- 2026-11-27 · `packages/core` inicial: esquemas Zod y cálculo del Puntaje Global (5 pruebas Vitest).
- 2026-11-27 · Migración `supabase/migrations/0001_initial_schema.sql`: perfiles con consentimiento
  parental, `parental_consents`, `arco_requests` con plazos hábiles, taxonomía MBE, `questions`,
  FSRS, sesiones, intentos, estimaciones θ, RLS, `sync_offline_batch` y `get_questions_since`.
  Probada en Postgres 16 con `scripts/test-db.sh` (RLS, consentimiento, idempotencia del sync).
- 2026-11-27 · Espejo offline `supabase/sqlite/local_schema.sql` (validado en SQLite 3.53).
- 2026-11-27 · `docs/MBE_TAXONOMIA.json` con pruebas, competencias y componentes tomados de las
  cinco infografías oficiales; `scripts/generate-seed.mjs` genera `supabase/seed.sql`.
- 2026-11-27 · CI en GitHub Actions: Vitest de core y pruebas SQL contra Postgres.

### Decisiones
- **Edad conservadora**: con solo `birth_year`, se trata como menor a quien cumple 18 este año.
  Evita tratar datos de menores sin autorización; el costo es pedir consentimiento a algunos adultos
  de 18. Revisar si se pide fecha de nacimiento completa en el registro.
- **`birth_year` no editable por el cliente**: impide que un menor se declare adulto; se corrige por ARCO.
- **Bloqueo de datos de estudio hasta consentimiento**: RLS y `can_process_data()` impiden crear sesiones,
  intentos o estados FSRS (y leer preguntas) mientras el consentimiento esté `pending`.
- **`is_correct` lo calcula el servidor** en `sync_offline_batch` a partir de la clave.
- **Versión global de contenido** (`content_version_seq`) en lugar de versión por fila: el cliente
  pide "todo lo posterior a mi cursor" por prueba.
- **FSRS en sync**: gana el estado con `updated_at` más reciente.
- **Competencias de Lectura Crítica**: se usan los nombres de la infografía oficial; los nombres del
  plan maestro quedan como `plan_alias` hasta cotejar con la Guía 2026.
- **`docs/DB_SCHEMA.sql` no se creó**: la fuente de verdad es `supabase/migrations/`; duplicarla
  invitaría a que se desincronice.
- **apps/** solo tienen README; se construyen en semanas 3-6.

### Pendiente de la semana 1 (requiere al dueño del proyecto)
- [ ] Crear el proyecto en Supabase y aplicar la migración (`supabase db push` o SQL Editor),
      luego `supabase/seed.sql`.
- [ ] Conectar un SMTP externo en Supabase Auth (p. ej. Resend o Brevo, plan gratuito).
- [ ] Sembrar `co_public_holidays` con los festivos de Colombia 2026-2027 (los plazos ARCO hoy
      solo excluyen fines de semana).
- [ ] Edge Function de consentimiento parental: envía token al acudiente, guarda el hash en
      `parental_consents` y marca `verified` con service_role. Redactar la Política de Tratamiento.

### Siguiente paso
Semana 2, Prompt 4: `packages/core` con FSRS-6 (21 parámetros), estimador TRI 3PL,
`calculateMarginalImpact` y planificador adaptativo 40/40/20, con pruebas Vitest.
En paralelo: descargar la Guía de Orientación Saber 11 vigente y completar afirmaciones y evidencias
en `docs/MBE_TAXONOMIA.json` (hoy están vacías: las infografías no las incluyen).
