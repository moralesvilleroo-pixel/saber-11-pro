# Estado del proyecto

Registro vivo. Actualizar al cierre de cada Pull Request.

## Banco de 1000 preguntas - Lote de Sociales y Ciudadanas (2026-11-28)

### Hecho
- 167 preguntas originales de Sociales y Ciudadanas en `banco/lotes/2026-11-lote-010` a `-013`:
  pensamiento social (Estado, ramas del poder, mecanismos de participación y protección, historia y
  geografía de Colombia), interpretación de perspectivas y fuentes, y pensamiento sistémico.
  Por competencia: SC.PSO 66, SC.PER 60, SC.SIS 41. Por dificultad: bajo 35, medio 78, alto 54.
- Banco total: 413 preguntas (IN 226, SC 167, LC 10, MA 10).

### Decisiones
- Las fuentes "primarias" de las preguntas (cartas, discursos, titulares) son recreaciones ficticias
  marcadas como tales; los datos de las tablas son ficticios o aproximados y lo dicen en el título.
- Los datos institucionales (tutela de 10 días, revocatoria solo para alcaldes y gobernadores, Fiscalía en la
  rama judicial, voto programático) siguen la Constitución de 1991 y la Ley 134 de 1994.

### Siguiente paso
Ciencias Naturales (~230); luego completar Matemáticas (~185) y Lectura Crítica (~150).

## Banco de 1000 preguntas - Lote de Inglés (2026-11-28)

Meta acordada: 1000 preguntas en total, Inglés primero; el resto se reparte como el examen real
(LC 41, MA 50, SC 50, CN 58, IN 55 de 254): unas 160 LC, 195 MA, 195 SC, 230 CN y 220 IN.

### Hecho
- 226 preguntas originales de Inglés en `banco/lotes/2026-11-lote-003` a `-009` (una por parte):
  Parte 1: 24 (A-/A1/A2), Parte 2: 25, Parte 3: 24, Parte 4: 40 (8 textos con 5 espacios),
  Parte 5: 35 (7 textos), Parte 6: 24 (4 textos B1), Parte 7: 54 (9 textos B1/B+ con 6 espacios).
  Banco total: 246 preguntas (IN 226, LC 10, MA 10).
- Contenido en inglés; diagnóstico de cada distractor y retroalimentación en español. La clave queda
  repartida en A-D por igual dentro de cada lote.
- El demo incluye las partes 1, 3 y 5 de Inglés. `QuestionCard` marca con `lang="en"` el texto en inglés
  (lectores de pantalla).

### Decisiones
- **Formato de 4 opciones en todas las partes**: el validador exige A-D. Las partes 1 y 2 (que en el examen
  usan listas de 8 palabras o lugares) se adaptan a 4 opciones con un distractor del mismo campo semántico.
- **Dificultad por nivel MCER**: A-/A1 bajo, A2 medio, B1/B+ alto (b = -1.2 / 0 / 1.3, c = 0.25).
- **Textos con contexto colombiano** (Tatacoa, Caño Cristales, La Guajira, Boyacá), escritos desde cero.
  Ninguno viene de cuadernillos del Icfes ni de exámenes de Cambridge.
- Los scripts que generan los lotes están fuera del repo; la fuente de verdad son los JSON de `banco/lotes`.

### Pendiente
- [ ] Sociales y Ciudadanas, Ciencias Naturales, y completar Matemáticas y Lectura Crítica (~754 preguntas).
- [ ] Correr "Cargar a Supabase" para subir el lote de Inglés.
- [ ] Calibrar a, b y c con respuestas reales cuando haya datos.

### Siguiente paso
Lotes de Sociales y Ciudadanas y de Ciencias Naturales (con ellas ya hay Puntaje Global proyectado).

## Semanas 3-4 - MVP web no comercial (2026-11-28)

### Hecho
- `apps/web`: Next.js 16 + Tailwind 4 + PWA (manifiesto, íconos SVG y service worker mínimo).
  Páginas: inicio público, demo sin cuenta, registro, ingreso, recuperación de contraseña, panel,
  sesión de estudio, autorización del acudiente, Política de Tratamiento de Datos y formulario ARCO.
- Estudio en el navegador con `@icfes/core`: sesión diaria 40/40/20 con FSRS-6 y calificación
  ajustable, diagnóstico (hasta 45 preguntas) y simulacro cronometrado (completo, `media` o `cuarto`).
  Retroalimentación de las cuatro opciones tras cada respuesta; en el simulacro, al final.
- Progreso con cuenta: cola local + `sync_offline_batch`; puntajes en `user_theta_estimates`.
- `packages/core`: `session/sessionBuilder.ts` (`buildDiagnostic`, `buildMockExam`, `estimateAreaScores`,
  `evidenceMasteryFromAttempts`) y `sync/fsrsRow.ts` (tarjeta ↔ fila). 72 pruebas en total.
- Migración `0003_consentimiento_y_theta.sql`: `request/get/verify_parental_consent` (solo service_role,
  token de 256 bits guardado como SHA-256, reenvío limitado, evidencia de IP y navegador) e inserción de
  estimaciones propias. Pruebas en `supabase/tests/02_consent_theta.sql`; el flujo "Cargar a Supabase" la aplica.
- Prueba e2e del demo con Playwright (`apps/web/e2e/demo.e2e.mjs`) y job `web` en CI.
- `docs/DESPLIEGUE_WEB.md`: Vercel, variables, URLs de Auth y plantillas de correo en español.

### Decisiones
- **Autorización parental en rutas `/api` de la web** (servidor, service_role) en lugar de una Edge Function:
  se despliega con la web, sin Supabase CLI. El correo sale por el mismo SMTP de Brevo.
- **Modo demo** con las preguntas del banco incluidas en la página y progreso solo en el navegador:
  permite probar sin cuenta y sin tratar datos personales.
- **Puntaje Global solo con las cinco pruebas**: con menos, se muestran puntajes por prueba.
  Con menos de 15 respuestas, la estimación se acota a 20-80 y se marca como preliminar.
- **Gráficas como `<img>` con data URI**: un SVG así no puede ejecutar scripts.
- **Plantillas de Auth con `token_hash`** (`/auth/confirm`): el enlace sirve en otro dispositivo.

### Pendiente
- [ ] Correr "Cargar a Supabase" (aplica 0003), crear el proyecto en Vercel y configurar Auth (ver `docs/DESPLIEGUE_WEB.md`).
- [ ] Definir el responsable del tratamiento (`NEXT_PUBLIC_RESPONSABLE_*`) y revisar la política con un abogado.
- [x] Inglés: 226 preguntas (ver la sección del banco). Faltan SC y CN para el Puntaje Global.
- [ ] Probar con estudiantes reales y ajustar.

### Siguiente paso
Semanas 5-6 (Prompt 6): instalador de Windows con Tauri v2 y prueba cerrada en Google Play, y ampliar el banco.

## Prompt 5 - Banco de preguntas originales (2026-11-28, cerrado)

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
Hecho en semanas 3-4 (arriba).

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
- [ ] Traducir al español las plantillas de correo de Auth y fijar el Site URL (textos en `docs/DESPLIEGUE_WEB.md`).
- [ ] Correr `supabase/seed_festivos_co.sql` en Supabase (lo hace el flujo "Cargar a Supabase"; festivos de Colombia 2026-2027, para que
      los plazos ARCO no cuenten festivos). Agregar 2028 antes de que termine 2027.
- [x] 2026-11-28 · Autorización parental y Política de Tratamiento (semanas 3-4).

