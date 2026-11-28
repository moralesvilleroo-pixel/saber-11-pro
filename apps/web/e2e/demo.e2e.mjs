// Prueba de punta a punta del modo demo (no necesita Supabase).
// Uso: pnpm --filter @icfes/web build, luego pnpm --filter @icfes/web start -p 3100 y
// BASE_URL=http://localhost:3100 pnpm --filter @icfes/web e2e
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const fail = (m) => {
  console.error(`FALLO: ${m}`);
  process.exit(1);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

async function answerAll({ rate }) {
  let n = 0;
  for (;;) {
    if (await page.getByRole("heading", { name: /^Terminaste/ }).isVisible().catch(() => false)) break;
    const option = page.locator("article ul button").first();
    await option.waitFor({ timeout: 10_000 });
    await option.click();
    if (rate === "mock") {
      await page.getByRole("button", { name: /^(Siguiente|Omitir)$/ }).click();
    } else {
      // Retroalimentacion de las cuatro opciones visible tras responder
      const feedback = await page.locator("article ul li p").count();
      if (feedback !== 4) fail(`se esperaban 4 retroalimentaciones y hay ${feedback}`);
      if (rate === "fsrs") await page.getByRole("button", { name: "Bien", exact: true }).click();
      else await page.getByRole("button", { name: "Siguiente" }).click();
    }
    n++;
    if (n > 80) fail("la sesion no termina");
    await page.waitForTimeout(50);
  }
  return n;
}

await page.goto(`${BASE}/demo`);
await page.getByRole("link", { name: /Sesión diaria/ }).click();
await page.getByRole("button", { name: "Empezar" }).click();
if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-pregunta.png`, fullPage: true });
await page.locator("article ul button").first().click();
if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-feedback.png`, fullPage: true });
await page.getByRole("button", { name: "Bien", exact: true }).click();
const daily = 1 + (await answerAll({ rate: "fsrs" }));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/3-resultado.png`, fullPage: true });
const summary = await page.getByText(/Acertaste \d+ de \d+/).textContent();
console.log(`OK sesion diaria: ${daily} preguntas; ${summary}`);
if (!(await page.getByText("Lectura Crítica").first().isVisible())) fail("el resumen no muestra puntajes por prueba");

// La segunda sesion del dia no repite tarjetas que no estan vencidas
await page.goto(`${BASE}/demo/estudiar?modo=diaria`);
const second = await page.getByText(/^\d+ preguntas$/).textContent();
console.log(`OK segunda sesion diaria planea: ${second}`);

await page.goto(`${BASE}/demo/estudiar?modo=diagnostico`);
await page.getByRole("button", { name: "Empezar" }).click();
const diag = await answerAll({ rate: "auto" });
console.log(`OK diagnostico: ${diag} preguntas`);

await page.goto(`${BASE}/demo/estudiar?modo=simulacro&escala=cuarto`);
const timeText = await page.getByText(/^Tiempo:/).textContent();
await page.getByRole("button", { name: "Empezar" }).click();
await page.getByText(/⏱/).waitFor({ timeout: 5000 }).catch(() => fail("el simulacro no muestra cronometro"));
if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-simulacro.png`, fullPage: true });
const mock = await answerAll({ rate: "mock" });
const review = await page.getByRole("heading", { name: "Revisa tus respuestas" }).isVisible();
if (!review) fail("el simulacro no muestra la revision al final");
console.log(`OK simulacro: ${mock} preguntas, ${timeText}`);

const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("saber11:demo:progress:v1") ?? "{}"));
console.log(`OK progreso local: ${stored.attempts?.length} intentos, ${Object.keys(stored.cards ?? {}).length} tarjetas`);

if (errors.length) fail(`errores de JavaScript: ${errors.join(" | ")}`);
await browser.close();
console.log("E2E demo: OK");
