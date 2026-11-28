# CLAUDE.md - Saber11 Pro

Plataforma para preparar el examen ICFES Saber 11 en Web, Android y Windows.
Monorepo Turborepo + pnpm, TypeScript estricto. Idioma del producto y de la documentacion: espanol.

## Al iniciar y al cerrar cada sesion

1. Lee `docs/ESTADO_PROYECTO.md` antes de escribir codigo. Ahi esta el siguiente paso.
2. Las reglas de negocio estan en `docs/PRD_PEDAGOGIA.md`. No las cambies sin pedirlo.
3. Antes de abrir un Pull Request, actualiza `docs/ESTADO_PROYECTO.md`
   (que se hizo, decisiones tomadas, siguiente paso).
4. Al cambiar de modulo, usa `/clear`: el estado vive en archivos, no en la conversacion.

## Estructura

```
apps/web/        Next.js 16 App Router + Tailwind 4 + PWA (Vercel Hobby, sin uso comercial).
                 Despliegue: docs/DESPLIEGUE_WEB.md. Prueba e2e del demo: apps/web/e2e/
apps/desktop/    Tauri v2 para Windows, SQLite local (tauri-plugin-sql)
apps/mobile/     Expo (React Native) para Android, expo-sqlite
packages/core/   @icfes/core: logica pura compartida (sin APIs de Node ni del navegador)
  src/scoring/          Puntaje Global ICFES, estimador TRI 3PL
  src/spaced-repetition FSRS-6 (21 parametros, DSR)
  src/planner/          Planificador adaptativo 40/40/20
  src/item-bank/        Validador de lotes del Prompt 5 (itemSchema.ts)
  src/session/          Diagnostico, simulacro y estimacion de puntajes por prueba
  src/sync/             Conversion tarjeta FSRS <-> fila de user_card_fsrs_state
  src/schemas.ts        Esquemas Zod compartidos
banco/lotes/       Lotes JSON de preguntas originales (fuente de verdad del banco)
supabase/
  migrations/      Fuente de verdad del esquema Postgres (RLS, RPC)
  sqlite/          Espejo offline local_schema.sql (desktop y mobile)
  tests/           Pruebas SQL de RLS y RPC (scripts/test-db.sh)
  seed.sql         GENERADO desde docs/MBE_TAXONOMIA.json; no editar a mano
  questions/       GENERADO desde banco/lotes/ con scripts/build-questions-sql.mjs
docs/              PRD, estado, taxonomia MBE
scripts/           generate-seed.mjs, test-db.sh
```

## Comandos

```
pnpm install                       # Node 22 (.nvmrc), pnpm 10
pnpm build                         # turbo run build
pnpm test                          # Vitest en packages/core
pnpm typecheck                     # tsc --noEmit en todos los paquetes
pnpm lint
pnpm --filter @icfes/core test     # solo el nucleo
node scripts/generate-seed.mjs     # regenera supabase/seed.sql
pnpm --filter @icfes/web dev       # web en localhost:3000 (sin .env.local funciona el demo)
node scripts/build-questions-sql.mjs  # valida banco/lotes y genera supabase/questions (requiere build de core)
PGHOST=... PGUSER=postgres scripts/test-db.sh   # migraciones + pruebas RLS en Postgres local
```

## Reglas invariantes

### Pedagogia (detalle en docs/PRD_PEDAGOGIA.md)
- La experiencia se basa en practica de recuperacion con feedback por cada opcion,
  repeticion espaciada FSRS-6 y practica intercalada. Nada de lectura pasiva como eje.
- Puntaje Global: `IG = (3*LC + 3*MA + 3*SC + 3*CN + IN) / 13`, `PG = round(IG * 5)` en [0, 500].
  Exento de Ingles: promedio simple de las otras cuatro.
- Los conteos y pesos oficiales viven en `docs/MBE_TAXONOMIA.json` y la tabla `subjects`.

### Propiedad intelectual
- NUNCA copiar ni parafrasear items de cuadernillos o guias del Icfes.
  Solo se usa la taxonomia publica (competencia, afirmacion, evidencia).
- Toda pregunta lleva `origin` original y `explanation_feedback` en las 4 opciones.

### Ley 1581 de 2012 (datos de menores)
- Un menor (o sin ano de nacimiento) no genera datos de estudio hasta que
  `parental_consent_status = 'verified'`. Lo exigen RLS y `can_process_data()`.
- Solo el servidor (rutas `/api/consentimiento/*` de la web, con service_role) marca un consentimiento
  como verificado, a traves de las funciones de la migracion 0003.
- `birth_year` no se edita desde el cliente; las correcciones van por `arco_requests`.
- ARCO: consultas 10 dias habiles, reclamos 15 dias habiles (`due_at` automatico).

### Supabase y egress (plan Free: 500 MB DB, 5 GB egress/mes)
- Prohibido `SELECT *` y `.select('*')`. Pide solo las columnas que usas.
- Graficas de preguntas en SVG compacto inline (<= 4 KB) o JSON; nunca imagenes pesadas.
- Estudio 100 % offline desde SQLite. Al reconectar: `sync_offline_batch(payload)` por lotes
  (<= 1000 intentos) y `get_questions_since(subject, version)` para bajar contenido nuevo.
- IDs de sesiones e intentos se generan en el cliente (UUID v4) para que el sync sea idempotente.
- `is_correct` lo calcula el servidor; el valor local es provisional.
- Auth por SMTP externo (el correo integrado solo envia 2 por hora).
- Un proyecto Free se pausa tras 7 dias sin actividad.

### Vercel Hobby
- Sin cobros, anuncios ni botones de donacion mientras se use Hobby. Mantener la web
  portable a Vercel Pro o Cloudflare Pages.

### Codigo
- TypeScript estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- `packages/core` es puro: sin `fs`, `window`, `fetch` ni fechas implicitas (recibe `now`).
- Codigo completo y tipado, sin placeholders. Pruebas Vitest para toda logica de `core`.
- Cada cambio de esquema: nueva migracion `supabase/migrations/NNNN_descripcion.sql`,
  ajuste de `supabase/sqlite/local_schema.sql` si toca columnas sincronizadas, y pruebas en
  `supabase/tests/`. Nunca editar una migracion ya aplicada en produccion.
- Repo liviano: nada de binarios ni multimedia pesada (limite de 1 MB por archivo para Claude).

## Convenciones de commits

Conventional Commits en espanol: `tipo(alcance): descripcion`.
Tipos: feat, fix, docs, test, refactor, chore, ci. Alcances: core, web, desktop, mobile, db, docs.
Ejemplo: `feat(core): agrega estimador TRI 3PL`.
Ramas: `feat/<tema>`, `fix/<tema>`. Todo entra por Pull Request a `main`.
