// Valida los lotes de preguntas originales (banco/lotes/*.json) y genera un SQL idempotente por lote
// en supabase/questions/. Requiere compilar el nucleo antes: pnpm --filter @icfes/core build
// Uso: node scripts/build-questions-sql.mjs          (genera)
//      node scripts/build-questions-sql.mjs --check  (falla si algo es invalido o el SQL esta desactualizado)
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { validateBatch } from "../packages/core/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const taxonomy = JSON.parse(readFileSync(join(root, "docs/MBE_TAXONOMIA.json"), "utf8"));
const evidenceCodes = new Set();
const componentCodes = new Set();
for (const s of taxonomy.subjects) {
  for (const c of s.competencies) for (const a of c.affirmations) for (const e of a.evidences) evidenceCodes.add(e.code);
  for (const k of s.components) componentCodes.add(k.code);
}

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const jsonb = (v) => `${q(JSON.stringify(v))}::jsonb`;

const lotesDir = join(root, "banco/lotes");
const files = readdirSync(lotesDir).filter((f) => f.endsWith(".json")).sort();
const allIds = new Set();
let failed = false;
let total = 0;

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(lotesDir, file), "utf8"));
  const result = validateBatch(raw, { evidenceCodes, componentCodes }, allIds);
  for (const item of result.items) allIds.add(item.id);
  if (!result.ok) {
    failed = true;
    for (const i of result.issues) console.error(`${file} #${i.index} ${i.id ?? ""} ${i.path}: ${i.message}`);
    continue;
  }
  total += result.items.length;

  const lines = [
    `-- GENERADO por scripts/build-questions-sql.mjs desde banco/lotes/${file}. No editar a mano.`,
    "-- Preguntas 100 % originales. Se puede correr varias veces: no duplica.",
    "begin;",
  ];
  for (const it of result.items) {
    const contextContent = { title: it.context.title, text: it.context.text, svg: it.context.svg, table: it.context.table };
    const options = it.options.map((o) => ({
      label: o.label,
      text: o.text,
      is_correct: o.is_correct,
      distractor_type: o.distractor_diagnosis,
      explanation_feedback: o.explanation_feedback,
    }));
    lines.push(
      "insert into public.questions (id, evidence_id, subject_id, component_id, status, context_type, context_content, stem, options, cefr_level, irt_a, irt_b, irt_c, estimated_time_seconds, origin)",
      `select ${q(it.id)}, e.id, ${q(it.subject)}, ${
        it.component_code ? `(select id from public.content_components where code = ${q(it.component_code)})` : "null"
      }, 'qa_passed', ${q(it.context_type)}, ${jsonb(contextContent)}, ${q(it.stem)}, ${jsonb(options)}, ${q(it.cefr_level)}, ${
        it.estimated_irt.a
      }, ${it.estimated_irt.b}, ${it.estimated_irt.c}, ${it.estimated_time_seconds}, 'original_generated'`,
      `from public.evidences e where e.code = ${q(it.evidence_code)}`,
      "on conflict (id) do nothing;",
    );
  }
  lines.push("commit;", "");
  const sql = lines.join("\n");
  const out = join(root, "supabase/questions", `${basename(file, ".json")}.sql`);

  if (check) {
    if (!existsSync(out) || readFileSync(out, "utf8") !== sql) {
      failed = true;
      console.error(`${out} esta desactualizado: corre node scripts/build-questions-sql.mjs`);
    }
  } else {
    writeFileSync(out, sql);
  }
}

if (failed) process.exit(1);
console.log(`${files.length} lote(s), ${total} preguntas validas${check ? "; SQL al dia" : "; SQL generado en supabase/questions/"}`);
