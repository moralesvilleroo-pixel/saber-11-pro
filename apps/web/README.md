# apps/web

Next.js 16 (App Router) + Tailwind CSS 4 + PWA, desplegado en Vercel Hobby durante el MVP (sin cobros,
anuncios ni donaciones). Consume `@icfes/core` y Supabase.

- Despliegue y variables de entorno: `docs/DESPLIEGUE_WEB.md`.
- Desarrollo: `pnpm --filter @icfes/core build && pnpm --filter @icfes/web dev`. Sin `.env.local`
  funciona el modo demo (`/demo`), que usa las preguntas de `banco/lotes` y guarda en el navegador.
- Prueba de punta a punta del demo: `pnpm --filter @icfes/web build`, luego
  `pnpm --filter @icfes/web start -p 3100` y `BASE_URL=http://localhost:3100 pnpm --filter @icfes/web e2e`.
