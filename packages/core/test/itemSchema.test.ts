import { describe, expect, it } from "vitest";
import { GeneratedItemSchema, SVG_MAX_BYTES, validateBatch } from "../src/item-bank/itemSchema.js";

const TAXONOMY = {
  evidenceCodes: new Set(["MA.E2.2", "MA.E1.1", "LC.E1.1"]),
  componentCodes: new Set(["MA.CAT.ALG", "MA.CAT.EST"]),
};

const SVG_OK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>Barra</title><rect width="5" height="5"/></svg>';

function baseItem(): Record<string, unknown> {
  return {
    id: "3f8c2a1e-5b6d-4c7e-8f90-1a2b3c4d5e6f",
    subject: "MA",
    evidence_code: "MA.E2.2",
    component_code: "MA.CAT.ALG",
    cefr_level: null,
    difficulty_target: "bajo",
    estimated_irt: { a: 1, b: -1.2, c: 0.25 },
    context_type: "continuous",
    context: {
      title: "Plan de datos",
      text: "Un plan cuesta $25.000 e incluye 10 GB. Cada GB adicional cuesta $3.000. Laura uso 14 GB.",
      svg: null,
      table: null,
    },
    stem: "Cuanto debe pagar Laura este mes?",
    options: [
      { label: "A", text: "$42.000", is_correct: false, distractor_diagnosis: "Cobra todos los GB como adicionales.", explanation_feedback: "Incorrecta. Los 10 GB incluidos ya estan en el plan." },
      { label: "B", text: "$37.000", is_correct: true, distractor_diagnosis: null, explanation_feedback: "Correcta. 4 GB adicionales por 3.000 mas 25.000." },
      { label: "C", text: "$67.000", is_correct: false, distractor_diagnosis: "Cuenta dos veces los GB incluidos.", explanation_feedback: "Incorrecta. Solo se pagan aparte los GB que pasan de 10." },
      { label: "D", text: "$28.000", is_correct: false, distractor_diagnosis: "Suma un solo GB adicional.", explanation_feedback: "Incorrecta. Laura uso 4 GB por encima del plan, no 1." },
    ],
    estimated_time_seconds: 60,
  };
}

type Opt = { label: string; text: string; is_correct: boolean; distractor_diagnosis: string | null; explanation_feedback: string };
const opts = (item: Record<string, unknown>): Opt[] => item.options as Opt[];
const messages = (item: unknown): string[] => {
  const r = GeneratedItemSchema.safeParse(item);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("GeneratedItemSchema", () => {
  it("acepta un item bien formado", () => {
    expect(messages(baseItem())).toEqual([]);
  });

  it("exige exactamente una clave", () => {
    const item = baseItem();
    opts(item)[0]!.is_correct = true;
    opts(item)[0]!.distractor_diagnosis = null;
    expect(messages(item).length).toBeGreaterThan(0);
  });

  it("exige diagnostico en cada distractor y feedback en las 4 opciones", () => {
    const sinDiagnostico = baseItem();
    opts(sinDiagnostico)[2]!.distractor_diagnosis = null;
    expect(messages(sinDiagnostico).length).toBeGreaterThan(0);

    const sinFeedback = baseItem();
    opts(sinFeedback)[1]!.explanation_feedback = "Bien.";
    expect(messages(sinFeedback).length).toBeGreaterThan(0);
  });

  it("rechaza evidencias de otra prueba", () => {
    const item = { ...baseItem(), evidence_code: "LC.E1.1" };
    expect(messages(item).length).toBeGreaterThan(0);
  });

  it("rechaza nivel MCER fuera de Ingles", () => {
    const item = { ...baseItem(), cefr_level: "A2" };
    expect(messages(item).length).toBeGreaterThan(0);
  });

  it("rechaza una b de TRI lejos de la dificultad objetivo", () => {
    const item = { ...baseItem(), estimated_irt: { a: 1, b: 1.3, c: 0.25 } };
    expect(messages(item).length).toBeGreaterThan(0);
  });

  it("rechaza opciones muy desbalanceadas en longitud (pista de la clave)", () => {
    const item = baseItem();
    opts(item)[1]!.text = "$37.000, porque se pagan 4 GB adicionales sobre el valor fijo del plan mensual";
    expect(messages(item).length).toBeGreaterThan(0);
  });

  it("un contexto discontinuo requiere SVG o tabla", () => {
    const item: Record<string, unknown> = { ...baseItem(), context_type: "discontinuous" };
    expect(messages(item).length).toBeGreaterThan(0);
    const conSvg = { ...item, context: { ...(item.context as object), svg: SVG_OK } };
    expect(messages(conSvg)).toEqual([]);
  });

  it("rechaza SVG con script, manejadores de eventos o mas de 4 KB", () => {
    const withSvg = (svg: string) => ({
      ...baseItem(),
      context_type: "discontinuous",
      context: { ...(baseItem().context as object), svg },
    });
    expect(messages(withSvg(SVG_OK.replace("<rect", "<script>alert(1)</script><rect"))).length).toBeGreaterThan(0);
    expect(messages(withSvg(SVG_OK.replace("<rect", '<rect onclick="x()"'))).length).toBeGreaterThan(0);
    expect(messages(withSvg(SVG_OK.replace("<title>Barra</title>", ""))).length).toBeGreaterThan(0);
    const grande = SVG_OK.replace("</svg>", `<desc>${"a".repeat(SVG_MAX_BYTES)}</desc></svg>`);
    expect(messages(withSvg(grande)).length).toBeGreaterThan(0);
  });
});

describe("validateBatch", () => {
  it("acepta un lote valido", () => {
    const r = validateBatch([baseItem()], TAXONOMY);
    expect(r.ok).toBe(true);
    expect(r.items).toHaveLength(1);
  });

  it("rechaza algo que no es un arreglo", () => {
    expect(validateBatch({}, TAXONOMY).ok).toBe(false);
  });

  it("detecta evidencias y componentes que no existen en la taxonomia", () => {
    const r = validateBatch([{ ...baseItem(), evidence_code: "MA.E9.9", component_code: "MA.CAT.XYZ" }], TAXONOMY);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.path).sort()).toEqual(["component_code", "evidence_code"]);
  });

  it("detecta ids repetidos en el lote y frente al banco existente", () => {
    const otro = { ...baseItem(), stem: "Otra pregunta distinta sobre el plan?" };
    expect(validateBatch([baseItem(), otro], TAXONOMY).issues.some((i) => i.message === "id repetido")).toBe(true);
    const existentes = new Set([baseItem().id as string]);
    expect(validateBatch([baseItem()], TAXONOMY, existentes).ok).toBe(false);
  });

  it("detecta enunciados repetidos", () => {
    const copia = { ...baseItem(), id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d" };
    const r = validateBatch([baseItem(), copia], TAXONOMY);
    expect(r.issues.some((i) => i.path === "stem")).toBe(true);
  });
});
