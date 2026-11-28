# Estado del proyecto

Registro vivo. Actualizar al cierre de cada Pull Request.

## Prompt 5 - Banco de preguntas originales (2026-11-28)

### Hecho
- `docs/MBE_TAXONOMIA.json` completo con la Guía de Orientación Saber 11 2026: afirmaciones y evidencias
  de las cinco pruebas (86 evidencias), pesos por competencia, partes de Inglés y niveles MCER.
  `supabase/seed.sql` regenerado.
- `packages/core/src/item-bank/itemSchema.ts`: `GeneratedItemSchema` y `validateBatch` (clave única,
  diagnóstico y feedback en cada opción, evidencia de la misma prueba, longitudes balanceadas, b de TRI
  coherente con la dificultad, SVG seguro de máximo 4 KB, ids y enunciados no repetidos). 14 pruebas nuevas.
- `scripts/build-questions-sql.mjs`: valida `banco/lotes/*.json` y genera `supabase/questions/*.sql`
  (idempotente, `on conflict do nothing`). `--check` corre en CI.
- Lotes 001 (10 de Lectura Crítica) y 002 (10 de Matemáticas), 100 % originales.
- `docs/PROMPT_5_GENERADOR.md`: prompt actualizado y flujo para nuevos lotes.
- `scripts/apply-supabase.sh` y flujo manual "Cargar a Supabase": aplica migraciones pendientes,
  semilla, festivos y preguntas desde GitHub, sin copiar SQL desde el teléfono. Probado en Postgres local.
- `scripts/test-db.sh` carga también el banco (dos veces, para comprobar idempotencia).

### Decisiones
- **Inglés** no tiene afirmaciones oficiales: sus 7 partes se usan como evidencias `IN.E1`..`IN.E7`.
- **Competencias de Lectura Crítica** con los nombres de proceso de la guía; el de la infografía queda en `infografia_name`.
- **Los lotes JSON son la fuente de verdad**; el SQL de `supabase/questions/` se genera y no se edita a mano.
- **Migraciones en el flujo de carga**: cada una se detecta por lo que crea; una migración sin regla
  de detección detiene el flujo para no aplicarla dos veces.

### Pendiente
- [ ] Crear el secreto `SUPABASE_DB_URL` en GitHub y correr "Cargar a Supabase" (probar, luego aplicar).
- [ ] Revisión humana de los 20 ítems antes de mostrarlos a estudiantes.
- [ ] Más lotes: SC, CN e IN.

### Siguiente paso
Semanas 3-4: MVP web en `apps/web` (Next.js en Vercel Hobby, sin monetización): registro con
consentimiento parental, diagnóstico corto y sesión diaria con el planificador y FSRS-6.

## Semana 2 - Núcleo matemático y semilla del banco (cerrada)

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
- [ ] Aplicar `supabase/migrations/0002_fsrs_step.sql` en Supabase (lo hace el flujo "Cargar a Supabase").
- [x] 2026-11-28 · Taxonomía completa y primeros 20 ítems (ver Prompt 5).

### Siguiente paso
Hecho en el Prompt 5 (arriba).

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
- [ ] Correr `supabase/seed_festivos_co.sql` en Supabase (lo hace el flujo "Cargar a Supabase"; festivos de Colombia 2026-2027, para que
      los plazos ARCO no cuenten festivos). Agregar 2028 antes de que termine 2027.
- [ ] Edge Function de consentimiento parental: envía token al acudiente, guarda el hash en
      `parental_consents` y marca `verified` con service_role. Redactar la Política de Tratamiento.

