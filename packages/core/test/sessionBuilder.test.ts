import { describe, expect, it } from "vitest";
import {
  apportion,
  buildDiagnostic,
  buildMockExam,
  estimateAreaScores,
  evidenceMasteryFromAttempts,
  MOCK_SECONDS_PER_ITEM,
  scoresForPlanner,
  type BankQuestion,
} from "../src/session/sessionBuilder.js";
import type { SubjectCode } from "../src/schemas.js";

function bank(subject: SubjectCode, n: number, competencies = 3): BankQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    questionId: `${subject}-${String(i).padStart(3, "0")}`,
    subject,
    competencyCode: `${subject}.C${i % competencies}`,
    evidenceId: `${subject}.E${i % (competencies * 2)}`,
    irt: { a: 1, b: [-1.2, 0, 1.3][i % 3] as number, c: 0.25 },
    estimatedTimeSeconds: 60,
  }));
}

const FULL_POOL = [...bank("LC", 30), ...bank("MA", 30), ...bank("SC", 30), ...bank("CN", 30), ...bank("IN", 30)];

describe("apportion", () => {
  it("reparte en proporcion y suma exactamente el total", () => {
    const r = apportion(10, { a: 3, b: 1 }, { a: 100, b: 100 });
    expect(r.a + r.b).toBe(10);
    expect(r.a).toBeGreaterThan(r.b);
  });

  it("respeta los topes y pasa el sobrante a las demas claves", () => {
    expect(apportion(10, { a: 3, b: 1 }, { a: 2, b: 100 })).toEqual({ a: 2, b: 8 });
  });

  it("no inventa material: si el total supera la suma de topes, entrega los topes", () => {
    expect(apportion(50, { a: 1, b: 1 }, { a: 3, b: 4 })).toEqual({ a: 3, b: 4 });
  });
});

describe("buildDiagnostic", () => {
  it("cubre las cinco pruebas en proporcion a peso x conteo oficial", () => {
    const d = buildDiagnostic(FULL_POOL, 50);
    expect(d).toHaveLength(50);
    const count = (s: SubjectCode) => d.filter((q) => q.subject === s).length;
    expect(count("IN")).toBeLessThan(count("LC"));
    expect(count("CN")).toBeGreaterThanOrEqual(count("LC"));
    expect(new Set(d.map((q) => q.questionId)).size).toBe(50);
  });

  it("intercala las pruebas y mezcla dificultades", () => {
    const d = buildDiagnostic(FULL_POOL, 20);
    expect(d[0]?.subject).not.toBe(d[1]?.subject);
    const lc = d.filter((q) => q.subject === "LC");
    expect(new Set(lc.map((q) => q.irt.b)).size).toBeGreaterThan(1);
    expect(new Set(lc.map((q) => q.competencyCode)).size).toBeGreaterThan(1);
  });

  it("usa lo que haya si el banco tiene pocas pruebas", () => {
    const d = buildDiagnostic([...bank("LC", 10), ...bank("MA", 10)], 40);
    expect(d).toHaveLength(20);
  });

  it("es determinista", () => {
    expect(buildDiagnostic(FULL_POOL, 30)).toEqual(buildDiagnostic(FULL_POOL, 30));
  });
});

describe("buildMockExam", () => {
  it("agrupa por prueba en el orden del examen y calcula el tiempo", () => {
    const m = buildMockExam(FULL_POOL);
    const order = m.items.map((q) => q.subject).filter((s, i, a) => a[i - 1] !== s);
    expect(order).toEqual(["LC", "MA", "SC", "CN", "IN"]);
    expect(m.timeLimitSeconds).toBe(m.items.length * MOCK_SECONDS_PER_ITEM);
    expect(m.coverage.LC).toEqual({ planned: 30, official: 41 });
  });

  it("escala el numero de preguntas y filtra pruebas", () => {
    const m = buildMockExam(FULL_POOL, { scale: 0.2, subjects: ["MA"] });
    expect(m.items.every((q) => q.subject === "MA")).toBe(true);
    expect(m.items).toHaveLength(10);
  });

  it("rechaza una escala invalida", () => {
    expect(() => buildMockExam(FULL_POOL, { scale: 0 })).toThrow();
  });
});

describe("estimateAreaScores", () => {
  const resp = (subject: SubjectCode, pattern: boolean[]) =>
    pattern.map((correct, i) => ({ subject, correct, irt: { a: 1.2, b: [-1.2, 0, 1.3][i % 3] as number, c: 0.25 } }));

  it("sin todas las pruebas no hay Puntaje Global, pero si puntaje por prueba", () => {
    const e = estimateAreaScores(resp("LC", [true, true, false, true, false, true]));
    expect(e.bySubject.LC?.score).toBeGreaterThan(0);
    expect(e.bySubject.LC?.preliminary).toBe(true);
    expect(e.globalScore).toBeNull();
    expect(e.missing).toEqual(["MA", "SC", "CN", "IN"]);
  });

  it("con pocas respuestas todo correcto no pasa de 80", () => {
    const e = estimateAreaScores(resp("MA", [true, true, true]));
    expect(e.bySubject.MA?.score).toBe(80);
  });

  it("calcula el Puntaje Global con las cinco pruebas, o cuatro si esta exento de Ingles", () => {
    const pattern = Array.from({ length: 20 }, (_, i) => i % 2 === 0);
    const all = (["LC", "MA", "SC", "CN", "IN"] as const).flatMap((s) => resp(s, pattern));
    const e = estimateAreaScores(all);
    expect(e.globalScore).not.toBeNull();
    expect(e.globalScore).toBeGreaterThan(0);
    const exempt = estimateAreaScores(all.filter((r) => r.subject !== "IN"), { englishExempt: true });
    expect(exempt.missing).toEqual([]);
    expect(exempt.globalScore).not.toBeNull();
  });

  it("scoresForPlanner rellena con 50 lo que no tiene datos", () => {
    const e = estimateAreaScores(resp("LC", [false, false, false]));
    const s = scoresForPlanner(e);
    expect(s.MA).toBe(50);
    expect(s.LC).toBeLessThan(50);
  });
});

describe("evidenceMasteryFromAttempts", () => {
  const now = Date.UTC(2026, 10, 28);
  const day = 86_400_000;

  it("una sola respuesta no lleva el dominio a 0 o 1", () => {
    const [m] = evidenceMasteryFromAttempts([{ evidenceId: "E1", correct: true, answeredAt: now }], now);
    expect(m?.mastery).toBeCloseTo(0.75);
  });

  it("los intentos recientes pesan mas que los antiguos", () => {
    const m = evidenceMasteryFromAttempts(
      [
        { evidenceId: "E1", correct: false, answeredAt: now - 60 * day },
        { evidenceId: "E1", correct: false, answeredAt: now - 60 * day },
        { evidenceId: "E1", correct: true, answeredAt: now },
      ],
      now,
    );
    expect(m[0]?.mastery).toBeGreaterThan(0.6);
  });
});
