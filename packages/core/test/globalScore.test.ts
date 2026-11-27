import { describe, expect, it } from "vitest";
import { computeGlobalIndex, computeGlobalScore } from "../src/scoring/globalScore.js";

describe("Puntaje Global ICFES", () => {
  it("da 500 con puntajes perfectos y 0 con puntajes nulos", () => {
    expect(computeGlobalScore({ LC: 100, MA: 100, SC: 100, CN: 100, IN: 100 })).toBe(500);
    expect(computeGlobalScore({ LC: 0, MA: 0, SC: 0, CN: 0, IN: 0 })).toBe(0);
  });

  it("pondera 3/13 las cuatro pruebas nucleares y 1/13 Ingles", () => {
    // (3*60 + 3*55 + 3*50 + 3*45 + 70) / 13 = 700 / 13 = 53.846...
    const scores = { LC: 60, MA: 55, SC: 50, CN: 45, IN: 70 };
    expect(computeGlobalIndex(scores)).toBeCloseTo(700 / 13, 10);
    expect(computeGlobalScore(scores)).toBe(269);
  });

  it("subir 10 puntos en una prueba nuclear aporta ~11.54 puntos y en Ingles ~3.85", () => {
    const base = { LC: 50, MA: 50, SC: 50, CN: 50, IN: 50 };
    const g0 = computeGlobalIndex(base) * 5;
    expect(computeGlobalIndex({ ...base, MA: 60 }) * 5 - g0).toBeCloseTo(150 / 13, 10);
    expect(computeGlobalIndex({ ...base, IN: 60 }) * 5 - g0).toBeCloseTo(50 / 13, 10);
  });

  it("usa promedio simple de cuatro pruebas cuando el evaluado esta exento de Ingles", () => {
    expect(computeGlobalScore({ LC: 60, MA: 50, SC: 40, CN: 70, IN: null })).toBe(275);
  });

  it("rechaza puntajes fuera de 0-100 o no enteros", () => {
    expect(() => computeGlobalScore({ LC: 101, MA: 50, SC: 50, CN: 50, IN: 50 })).toThrow();
    expect(() => computeGlobalScore({ LC: 50.5, MA: 50, SC: 50, CN: 50, IN: 50 })).toThrow();
  });
});
