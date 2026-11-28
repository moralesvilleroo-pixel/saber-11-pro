import { describe, expect, it } from "vitest";
import {
  estimateTheta,
  itemInformation,
  probability3pl,
  thetaToIcfesScore,
  type IrtResponse,
} from "../src/scoring/irt3pl.js";

/** Generador pseudoaleatorio determinista (mulberry32) para simular respuestas. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(trueTheta: number, n: number, seed: number): IrtResponse[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const item = { a: 0.8 + r() * 1.2, b: -2.5 + r() * 5, c: 0.2 };
    return { ...item, correct: r() < probability3pl(trueTheta, item) };
  });
}

describe("TRI 3PL", () => {
  it("calcula P(theta) con el modelo de 3 parametros", () => {
    const item = { a: 1.2, b: 0, c: 0.25 };
    expect(probability3pl(0, item)).toBeCloseTo(0.625, 10); // c + (1 - c) / 2
    expect(probability3pl(-10, item)).toBeCloseTo(0.25, 4); // tiende a la adivinacion
    expect(probability3pl(10, item)).toBeCloseTo(1, 4);
    expect(itemInformation(0, item)).toBeGreaterThan(itemInformation(3, item));
  });

  it.each([-2, -1, 0, 0.5, 1.5, 2.5])("el estimador converge a theta = %s", (trueTheta) => {
    const est = estimateTheta(simulate(trueTheta, 400, 1000 + Math.round(trueTheta * 10)));
    expect(Math.abs(est.theta - trueTheta)).toBeLessThan(0.3);
    expect(est.standardError).toBeLessThan(0.2);
  });

  it("el error estandar baja al aumentar el numero de respuestas", () => {
    const pocas = estimateTheta(simulate(0.7, 30, 7));
    const muchas = estimateTheta(simulate(0.7, 300, 7));
    expect(muchas.standardError).toBeLessThan(pocas.standardError);
  });

  it("acota la estimacion cuando todo es correcto o todo incorrecto", () => {
    const items = [-1, 0, 1].map((b) => ({ a: 1, b, c: 0.2 }));
    const todoBien = estimateTheta(items.map((i) => ({ ...i, correct: true })));
    const todoMal = estimateTheta(items.map((i) => ({ ...i, correct: false })));
    expect(todoBien).toMatchObject({ theta: 4, atBound: true });
    expect(todoMal).toMatchObject({ theta: -4, atBound: true });
    expect(estimateTheta([])).toMatchObject({ theta: 0, standardError: Infinity, responses: 0 });
  });

  it("rechaza parametros invalidos", () => {
    expect(() => estimateTheta([{ a: 0, b: 0, c: 0.2, correct: true }])).toThrow();
    expect(() => estimateTheta([{ a: 1, b: 0, c: 1, correct: true }])).toThrow();
  });

  it("transforma theta a la escala ICFES 0-100 con media 50 y desviacion 10", () => {
    expect(thetaToIcfesScore(0)).toBe(50);
    expect(thetaToIcfesScore(1.26)).toBe(63);
    expect(thetaToIcfesScore(-9)).toBe(0);
    expect(thetaToIcfesScore(9)).toBe(100);
  });
});
