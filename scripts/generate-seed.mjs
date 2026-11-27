// Genera supabase/seed.sql a partir de docs/MBE_TAXONOMIA.json (fuente unica de la taxonomia).
// Uso: node scripts/generate-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const taxonomy = JSON.parse(readFileSync(join(root, "docs/MBE_TAXONOMIA.json"), "utf8"));

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
const lines = [
  "-- GENERADO por scripts/generate-seed.mjs desde docs/MBE_TAXONOMIA.json. No editar a mano.",
  "begin;",
];

for (const subject of taxonomy.subjects) {
  for (const c of subject.competencies) {
    lines.push(
      `insert into public.competencies (subject_code, code, name, description) values (${q(subject.code)}, ${q(c.code)}, ${q(c.name)}, ${q(c.description)})`,
      `  on conflict (code) do update set name = excluded.name, description = excluded.description;`,
    );
    c.affirmations.forEach((a, i) => {
      const aCode = a.code ?? `${c.code}.A${i + 1}`;
      lines.push(
        `insert into public.affirmations (competency_id, code, statement) select id, ${q(aCode)}, ${q(a.statement)} from public.competencies where code = ${q(c.code)}`,
        `  on conflict (code) do update set statement = excluded.statement;`,
      );
      (a.evidences ?? []).forEach((e, j) => {
        const eCode = e.code ?? `${aCode}.E${j + 1}`;
        lines.push(
          `insert into public.evidences (affirmation_id, code, statement) select id, ${q(eCode)}, ${q(e.statement)} from public.affirmations where code = ${q(aCode)}`,
          `  on conflict (code) do update set statement = excluded.statement;`,
        );
      });
    });
  }
  for (const k of subject.components) {
    lines.push(
      `insert into public.content_components (subject_code, code, kind, name, description) values (${q(subject.code)}, ${q(k.code)}, ${q(k.kind)}, ${q(k.name)}, ${q(k.description)})`,
      `  on conflict (code) do update set kind = excluded.kind, name = excluded.name, description = excluded.description;`,
    );
  }
}

lines.push("commit;", "");
writeFileSync(join(root, "supabase/seed.sql"), lines.join("\n"));
console.log(`supabase/seed.sql generado (${lines.length} lineas)`);
