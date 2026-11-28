import { describe, expect, it } from "vitest";
import { calculateMarginalImpact } from "../src/scoring/marginalImpact.js";

describe("calculateMarginalImpact", () => {
  it("+10 en una prueba nuclear aporta 150/13 puntos y en Ingles 50/13", () => {
    const impact = calculateMarginalImpact({ LC: 50, MA: 50, SC: 50, CN: 50, IN: 50 });
    const bySubject = Object.fromEntries(impact.map((i) => [i.subject, i]));
    for (const s of ["LC", "MA", "SC", "CN"]) {
      expect(bySubject[s]?.plus10).toBeCloseTo(150 / 13, 10);
      expect(bySubject[s]?.plus5).toBeCloseTo(75 / 13, 10);
    }
    expect(bySubject.IN?.plus10).toBeCloseTo(50 / 13, 10);
    expect(impact.at(-1)?.subject).toBe("IN");
    expect(bySubject.MA?.globalWithPlus10).toBe(262);
  });

  it("respeta el tope de 100 por prueba", () => {
    const impact = calculateMarginalImpact({ LC: 96, MA: 100, SC: 50, CN: 50, IN: 50 });
    const bySubject = Object.fromEntries(impact.map((i) => [i.subject, i]));
    expect(bySubject.MA?.plus10).toBe(0);
    expect(bySubject.LC?.plus10).toBeCloseTo((3 * 4 * 5) / 13, 10);
    expect(impact[0]?.subject).toBe("SC");
  });

  it("con exencion de Ingles cada prueba pesa 1/4 y no se muestra Ingles", () => {
    const impact = calculateMarginalImpact({ LC: 50, MA: 50, SC: 50, CN: 50, IN: null });
    expect(impact.map((i) => i.subject)).not.toContain("IN");
    expect(impact[0]?.plus10).toBeCloseTo(12.5, 10);
  });
});
