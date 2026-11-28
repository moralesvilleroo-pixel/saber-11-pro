# Estado del proyecto

Registro vivo. Actualizar al cierre de cada Pull Request.

## Semana actual: 2 - Núcleo matemático y semilla del banco

### Hecho
- 2026-11-28 · `spaced-repetition/fsrs6.ts`: FSRS-6 completo (21 parámetros por defecto, estados
  Learning/Review/Relearning con pasos 1 y 10 min de aprendizaje y 10 min de reaprendizaje, repasos
  del mismo día). Las pruebas reproducen 6 escenarios generados con `py-fsrs` 6.x
  (`test/fixtures/fsrs6-reference.json`, script generador al lado).
- 2026-11-28 · `getDynamicTargetRetention`: 0,88 con más de 90 días, 0,94 en los últimos 21, lineal entre ambos.
- 2026-11-28 · `scoring/irt3pl.ts`: P(θ) 3PL, información de Fisher, estimador de máxima verosimilitud
  acotado [-4, 4] con error estándar y `thetaToIcfesScore` (50 + 10θ, entero 0-100).
- 2026-11-28 · `scoring/marginalImpact.ts`: `calculateMarginalImpact` (+5 y +10 por prueba, tope 100, exentos de Inglés).
- 2026-11-28 · `planner/adaptivePlanner.ts`: `buildDailyPlan` 40/40/20 con cascada de cupos, prioridad
  (1 − dominio) × impacto en el Puntaje Global, intercalado sin dos preguntas seguidas de la misma prueba.
- 2026-11-28 · `spaced-repetition/rating.ts`: `suggestRating` según acierto y tiempo.
- 2026-11-28 · Migración `0002_fsrs_step.sql`: columna `step` en `user_card_fsrs_state` y `sync_offline_batch`
  la acepta; espejo SQLite en versión 2.
- 39 pruebas Vitest; `pnpm typecheck` ahora también revisa las pruebas.

### Decisiones
- **Sin "fuzz" en FSRS**: los intervalos son deterministas para poder probarlos y para que web, Windows y
  Android den el mismo resultado. Si se quiere dispersar la carga diaria, se agrega después con una semilla.
- **Escala ICFES aproximada**: el Icfes no publica su transformación θ → 0-100; se usa 50 + 10θ como indica el plan.
- **Estimador TRI por rejilla + sección áurea** en vez de Newton-Raphson: la verosimilitud 3PL puede tener
  varios máximos y Newton puede divergir con pocos ítems.
- **Evidencias sin datos** se asumen con dominio 0,5 en el planificador.
- **El refuerzo usa una pregunta distinta** de la que se falló, de la misma evidencia.

### Pendiente de la semana 2
- [ ] Aplicar `supabase/migrations/0002_fsrs_step.sql` en Supabase.
- [ ] Completar afirmaciones y evidencias de `docs/MBE_TAXONOMIA.json` con la Guía de Orientación oficial.
- [ ] Generar las primeras preguntas originales con el Prompt 5 (prioridad LC y MA) e importarlas.

### Siguiente paso
Validador de lotes del Prompt 5 en `packages/core` (esquema Zod del JSON de salida) y script de importación
a Supabase, cuando la taxonomía tenga afirmaciones y evidencias. Después, semanas 3-4: MVP web.

## Semana 1 - Base en GitHub y Supabase (cerrada)

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

### Pendiente de la semana 1
- [x] 2026-11-27 · Proyecto Supabase creado; migración 0001 y `seed.sql` aplicados.
- [x] 2026-11-27 · SMTP de Brevo conectado a Supabase Auth (probado con una invitación).
- [ ] Traducir al español las plantillas de correo de Auth y fijar el Site URL cuando exista la web.
- [ ] Sembrar `co_public_holidays` con los festivos de Colombia 2026-2027 (los plazos ARCO hoy
      solo excluyen fines de semana).
- [ ] Edge Function de consentimiento parental: envía token al acudiente, guarda el hash en
      `parental_consents` y marca `verified` con service_role. Redactar la Política de Tratamiento.

