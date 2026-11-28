import { describe, expect, it } from "vitest";
import { createNewCard, Fsrs6, Rating } from "../src/spaced-repetition/fsrs6.js";
import { cardToRow, rowToCard } from "../src/sync/fsrsRow.js";

describe("cardToRow / rowToCard", () => {
  const now = Date.UTC(2026, 10, 28, 15);
  const fsrs = new Fsrs6();

  it("ida y vuelta conserva la tarjeta tras varios repasos", () => {
    let card = createNewCard(now);
    let t = now;
    for (const r of [Rating.Good, Rating.Good, Rating.Again, Rating.Good] as const) {
      const res = fsrs.review(card, r, t);
      const row = cardToRow("q1", res.card, {
        retrievability: res.retrievabilityBefore,
        elapsedDays: res.elapsedDays,
        scheduledDays: res.scheduledDays,
        updatedAt: t,
      });
      card = rowToCard(row);
      expect(card).toEqual(res.card);
      t = res.card.dueAt;
    }
  });

  it("cumple las restricciones de la tabla (dias enteros, paso nulo solo en Review)", () => {
    const res = fsrs.review(createNewCard(now), Rating.Good, now);
    const row = cardToRow("q1", res.card, { retrievability: 0, elapsedDays: 0, scheduledDays: res.scheduledDays, updatedAt: now });
    expect(Number.isInteger(row.scheduled_days)).toBe(true);
    expect(row.state).toBe("Learning");
    expect(row.step).toBe(1);
  });

  it("una fila sin repasos vuelve a ser una tarjeta nueva", () => {
    const card = rowToCard({
      stability: 0, difficulty: 0, retrievability_cache: null, elapsed_days: 0, scheduled_days: 0,
      reps: 0, lapses: 0, state: "New", step: 0, due_at: new Date(now).toISOString(),
      last_review_at: null, updated_at: new Date(now).toISOString(),
    });
    expect(card).toEqual(createNewCard(now));
  });
});
