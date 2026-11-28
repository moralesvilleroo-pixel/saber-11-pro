import { describe, expect, it } from "vitest";
import {
  buildDailyPlan,
  type DueCard,
  type PlannerInput,
  type PlannerQuestion,
} from "../src/planner/adaptivePlanner.js";
import { suggestRating } from "../src/spaced-repetition/rating.js";
import type { SubjectCode } from "../src/schemas.js";

const NOW = Date.UTC(2026, 5, 1, 12);
const DAY = 86_400_000;

const COMPETENCIES: Record<SubjectCode, string[]> = {
  LC: ["LC.LOC", "LC.GLO", "LC.REF"],
  MA: ["MA.INT", "MA.FOR", "MA.ARG"],
  SC: ["SC.PSO", "SC.PER", "SC.SIS"],
  CN: ["CN.USO", "CN.EXP", "CN.IND"],
  IN: ["IN.COM"],
};

/** Banco sintetico: 2 evidencias por competencia y 4 preguntas por evidencia. */
function pool(): PlannerQuestion[] {
  const out: PlannerQuestion[] = [];
  for (const [subject, comps] of Object.entries(COMPETENCIES) as [SubjectCode, string[]][]) {
    for (const comp of comps) {
      for (let e = 1; e <= 2; e++) {
        for (let q = 1; q <= 4; q++) {
          out.push({ questionId: `${comp}.E${e}.Q${q}`, subject, competencyCode: comp, evidenceId: `${comp}.E${e}` });
        }
      }
    }
  }
  return out;
}

function due(n: number): DueCard[] {
  const subjects: SubjectCode[] = ["LC", "MA", "SC", "CN", "IN"];
  return Array.from({ length: n }, (_, i) => {
    const subject = subjects[i % subjects.length] ?? "LC";
    const comp = COMPETENCIES[subject][0] ?? "";
    return {
      questionId: `due-${i}`,
      subject,
      competencyCode: comp,
      evidenceId: `${comp}.E1`,
      dueAt: NOW - (i + 1) * DAY,
      retrievability: 0.95 - i * 0.03,
    };
  });
}

function baseInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    now: NOW,
    sessionSize: 20,
    dueCards: due(15),
    questionPool: pool(),
    evidenceMastery: [],
    recentErrors: [
      { questionId: "MA.FOR.E2.Q1", subject: "MA", competencyCode: "MA.FOR", evidenceId: "MA.FOR.E2", answeredAt: NOW - DAY },
      { questionId: "LC.GLO.E1.Q2", subject: "LC", competencyCode: "LC.GLO", evidenceId: "LC.GLO.E1", answeredAt: NOW - 2 * DAY },
      { questionId: "CN.IND.E1.Q1", subject: "CN", competencyCode: "CN.IND", evidenceId: "CN.IND.E1", answeredAt: NOW - 3 * DAY },
    ],
    ...overrides,
  };
}

describe("buildDailyPlan", () => {
  it("respeta la mezcla 40/40/20 cuando hay material suficiente", () => {
    const plan = buildDailyPlan(baseInput());
    expect(plan.items).toHaveLength(20);
    expect(plan.quotas).toEqual({ fsrs_due: 8, interleaved: 8, error_reinforcement: 4 });
    expect(plan.counts).toEqual(plan.quotas);
  });

  it("prioriza los repasos vencidos con menor recuperabilidad y omite los no vencidos", () => {
    const cards = due(12);
    cards.push({ ...cards[0]!, questionId: "futuro", dueAt: NOW + DAY, retrievability: 0.01 });
    const plan = buildDailyPlan(baseInput({ dueCards: cards }));
    const fsrsIds = plan.items.filter((i) => i.source === "fsrs_due").map((i) => i.questionId).sort();
    expect(fsrsIds).not.toContain("futuro");
    expect(fsrsIds).toEqual(["due-10", "due-11", "due-4", "due-5", "due-6", "due-7", "due-8", "due-9"]);
  });

  it("el refuerzo usa una pregunta nueva de la evidencia fallada, empezando por el error mas reciente", () => {
    const plan = buildDailyPlan(baseInput());
    const refuerzo = plan.items.filter((i) => i.source === "error_reinforcement");
    expect(refuerzo.length).toBe(4);
    expect(refuerzo.map((i) => i.questionId)).not.toContain("MA.FOR.E2.Q1");
    expect(refuerzo.every((i) => ["MA.FOR.E2", "LC.GLO.E1", "CN.IND.E1"].includes(i.evidenceId))).toBe(true);
    expect(refuerzo.filter((i) => i.evidenceId === "MA.FOR.E2")).toHaveLength(3);
  });

  it("la practica intercalada mezcla varias pruebas y competencias y prefiere evidencias debiles de alto peso", () => {
    const weak = ["MA.ARG.E1", "IN.COM.E1", "LC.REF.E2"];
    const plan = buildDailyPlan(
      baseInput({
        evidenceMastery: [
          ...pool().map((q) => ({ evidenceId: q.evidenceId, mastery: 0.9 })),
          ...weak.map((evidenceId) => ({ evidenceId, mastery: 0.1 })),
        ],
      }),
    );
    const inter = plan.items.filter((i) => i.source === "interleaved");
    expect(new Set(inter.map((i) => i.subject)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(inter.map((i) => i.competencyCode)).size).toBeGreaterThanOrEqual(2);
    const evid = inter.map((i) => i.evidenceId);
    expect(evid).toContain("MA.ARG.E1");
    expect(evid).toContain("LC.REF.E2");
    // Misma debilidad, pero Ingles pesa 1/13: aparece menos que MA.
    expect(evid.filter((e) => e === "IN.COM.E1").length).toBeLessThan(evid.filter((e) => e === "MA.ARG.E1").length);
  });

  it("no repite preguntas y evita dos seguidas de la misma prueba cuando es posible", () => {
    const plan = buildDailyPlan(baseInput({ sessionSize: 30 }));
    const ids = plan.items.map((i) => i.questionId);
    expect(new Set(ids).size).toBe(ids.length);
    let seguidas = 0;
    for (let i = 1; i < plan.items.length; i++) {
      if (plan.items[i]?.subject === plan.items[i - 1]?.subject) seguidas++;
    }
    expect(seguidas).toBe(0);
    expect(plan.distinctSubjects).toBe(5);
  });

  it("pasa el cupo faltante a la siguiente parte (fsrs -> intercalada -> refuerzo)", () => {
    const sinRepasos = buildDailyPlan(baseInput({ dueCards: [] }));
    expect(sinRepasos.items).toHaveLength(20);
    expect(sinRepasos.counts).toEqual({ fsrs_due: 0, interleaved: 16, error_reinforcement: 4 });

    const sinErrores = buildDailyPlan(baseInput({ recentErrors: [] }));
    expect(sinErrores.counts.error_reinforcement).toBe(0);
    expect(sinErrores.items).toHaveLength(20);
  });

  it("devuelve lo que haya si el banco no alcanza y es determinista", () => {
    const tiny = baseInput({ dueCards: due(2), questionPool: pool().slice(0, 3), recentErrors: [] });
    const plan = buildDailyPlan(tiny);
    expect(plan.items).toHaveLength(5);
    expect(buildDailyPlan(tiny)).toEqual(plan);
    expect(buildDailyPlan(baseInput({ sessionSize: 0 })).items).toEqual([]);
  });
});

describe("suggestRating", () => {
  it("propone la calificacion FSRS segun acierto y tiempo", () => {
    expect(suggestRating(false, 10_000, 90_000)).toBe(1);
    expect(suggestRating(true, 150_000, 90_000)).toBe(2);
    expect(suggestRating(true, 90_000, 90_000)).toBe(3);
    expect(suggestRating(true, 30_000, 90_000)).toBe(4);
  });
});
