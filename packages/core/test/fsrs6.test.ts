import { describe, expect, it } from "vitest";
import reference from "./fixtures/fsrs6-reference.json" with { type: "json" };
import {
  createNewCard,
  Fsrs6,
  FSRS6_DEFAULT_PARAMETERS,
  getDynamicTargetRetention,
  Rating,
  type FsrsCard,
} from "../src/spaced-repetition/fsrs6.js";

const BASE = Date.UTC(2026, 0, 1, 12, 0);
const MIN = 60_000;
const DAY = 86_400_000;

interface RefStep {
  rating: 1 | 2 | 3 | 4;
  offsetMin: number;
  state: string;
  step: number | null;
  stability: number;
  difficulty: number;
  dueOffsetMin: number;
}

describe("FSRS-6 frente a la implementacion de referencia py-fsrs", () => {
  const fsrs = new Fsrs6();
  const escenarios = reference.escenarios as Record<string, RefStep[]>;

  for (const [nombre, pasos] of Object.entries(escenarios)) {
    it(`reproduce el escenario "${nombre}"`, () => {
      let card: FsrsCard = createNewCard(BASE);
      for (const paso of pasos) {
        card = fsrs.review(card, paso.rating, BASE + paso.offsetMin * MIN).card;
        expect(card.state).toBe(paso.state);
        expect(card.step).toBe(paso.step);
        expect(card.stability).toBeCloseTo(paso.stability, 9);
        expect(card.difficulty).toBeCloseTo(paso.difficulty, 9);
        expect((card.dueAt - BASE) / MIN).toBeCloseTo(paso.dueOffsetMin, 6);
      }
    });
  }
});

describe("FSRS-6: propiedades del modelo", () => {
  const fsrs = new Fsrs6();

  it("usa los 21 parametros por defecto", () => {
    expect(FSRS6_DEFAULT_PARAMETERS).toHaveLength(21);
    expect(() => new Fsrs6({ parameters: [1, 2, 3] })).toThrow();
  });

  it("la recuperabilidad es 0.9 cuando han pasado S dias", () => {
    const card: FsrsCard = { ...createNewCard(BASE), state: "Review", step: null, stability: 10, difficulty: 5, lastReviewAt: BASE };
    expect(fsrs.retrievability(card, BASE + 10 * DAY)).toBeCloseTo(0.9, 10);
    expect(fsrs.retrievability(card, BASE)).toBe(1);
  });

  it("mayor retencion objetivo produce intervalos mas cortos", () => {
    expect(fsrs.nextIntervalDays(20, 0.94)).toBeLessThan(fsrs.nextIntervalDays(20, 0.88));
    expect(fsrs.nextIntervalDays(20, 0.9)).toBe(20);
  });

  it("sale del 'ease hell': tras 6 olvidos seguidos los intervalos vuelven a crecer", () => {
    let card = createNewCard(BASE);
    let t = BASE;
    card = fsrs.review(card, Rating.Good, t).card;
    t += MIN;
    card = fsrs.review(card, Rating.Good, t).card;
    for (let i = 0; i < 6; i++) {
      t = card.dueAt;
      card = fsrs.review(card, Rating.Again, t).card; // olvido
      t = card.dueAt;
      card = fsrs.review(card, Rating.Good, t).card; // termina reaprendizaje
    }
    expect(card.lapses).toBe(6);
    const dificultadTrasOlvidos = card.difficulty ?? 0;

    const intervalos: number[] = [];
    for (let i = 0; i < 10; i++) {
      t = card.dueAt;
      const r = fsrs.review(card, Rating.Good, t);
      card = r.card;
      intervalos.push(r.scheduledDays);
    }
    // Con S muy baja tras los olvidos, los intervalos crecen sin quedar atrapados.
    for (let i = 1; i < intervalos.length; i++) {
      expect(intervalos[i]).toBeGreaterThanOrEqual(intervalos[i - 1] ?? Infinity);
    }
    expect(intervalos.at(-1)).toBeGreaterThanOrEqual(14);
    expect((intervalos.at(-1) ?? 0) / (intervalos[0] ?? 1)).toBeGreaterThanOrEqual(10);

    // Y la dificultad no queda fija en el maximo: respuestas faciles la bajan.
    for (let i = 0; i < 3; i++) {
      t = card.dueAt;
      card = fsrs.review(card, Rating.Easy, t).card;
    }
    expect(card.difficulty ?? 10).toBeLessThan(dificultadTrasOlvidos);
  });

  it("no muta la tarjeta original y rechaza calificaciones o fechas invalidas", () => {
    const card = createNewCard(BASE);
    const copia = { ...card };
    const r = fsrs.review(card, Rating.Good, BASE);
    expect(card).toEqual(copia);
    expect(() => fsrs.review(card, 5 as Rating, BASE)).toThrow();
    expect(() => fsrs.review(r.card, Rating.Good, BASE - DAY)).toThrow();
  });
});

describe("getDynamicTargetRetention", () => {
  it("escala de 0.88 a 0.94 segun la cercania del examen", () => {
    expect(getDynamicTargetRetention(200)).toBe(0.88);
    expect(getDynamicTargetRetention(91)).toBe(0.88);
    expect(getDynamicTargetRetention(21)).toBe(0.94);
    expect(getDynamicTargetRetention(0)).toBe(0.94);
    const medio = getDynamicTargetRetention(55.5);
    expect(medio).toBeCloseTo(0.91, 4);
    expect(getDynamicTargetRetention(60)).toBeLessThan(getDynamicTargetRetention(30));
  });
});
