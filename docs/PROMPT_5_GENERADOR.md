# Prompt 5 - Generador de preguntas originales

Cómo producir un lote de 10 preguntas y llevarlo a Supabase. La salida del modelo se valida con
`GeneratedItemSchema` (`packages/core/src/item-bank/itemSchema.ts`); si no pasa, no entra al banco.

## Flujo

1. Elegir prueba, evidencias (`docs/MBE_TAXONOMIA.json`) y reparto de dificultad (p. ej. 3 bajo, 4 medio, 3 alto).
2. Pegar el prompt de abajo en Claude con esos datos y guardar la respuesta (solo el arreglo JSON) en
   `banco/lotes/AAAA-MM-lote-NNN-<prueba>.json`.
3. `pnpm --filter @icfes/core build && node scripts/build-questions-sql.mjs`
   valida todos los lotes y genera `supabase/questions/<lote>.sql`. Corregir y repetir hasta que no haya errores.
4. Revisión humana de cada ítem (clave única, distractores plausibles, nada parecido a un cuadernillo Icfes).
5. Pull Request. Al fusionar, en GitHub: Actions > "Cargar a Supabase" > Run workflow (primero `probar`, luego `aplicar`).

Las preguntas entran con estado `qa_passed` y origen `original_generated`; pasan a `calibrated` cuando
tengan ≥ 200 respuestas y parámetros TRI reestimados.

## Prompt

```
Eres autor de ítems para preparar el examen Saber 11 de Colombia. Escribe {N} preguntas ORIGINALES
de {PRUEBA} para estas evidencias del Modelo Basado en Evidencias:
{LISTA: código de evidencia — enunciado — dificultad objetivo — componente}

Reglas obligatorias:
- Prohibido copiar, adaptar o parafrasear ítems, textos o gráficas de cuadernillos, guías o simulacros
  del Icfes o de editoriales. Inventa contextos colombianos cotidianos; los datos numéricos son ficticios
  y deben decirlo.
- Selección múltiple con única respuesta: contexto, enunciado y 4 opciones A-D, exactamente una correcta.
  Reparte la posición de la clave entre A, B, C y D a lo largo del lote.
- Cada distractor responde a un error típico real del estudiante; descríbelo en "distractor_diagnosis".
- "explanation_feedback" en las 4 opciones: por qué la clave es correcta y por qué cada distractor no lo es,
  con el cálculo o la cita del texto. Nunca solo "correcto" o "incorrecto".
- Opciones de longitud parecida (la más larga no puede medir más de 2,5 veces la más corta) y sin
  pistas gramaticales. Evita "todas las anteriores" y "ninguna de las anteriores".
- Gráficas solo como SVG inline de máximo 4 KB, con viewBox y <title> descriptivo, sin scripts,
  eventos ni enlaces externos. Las tablas van como JSON.
- estimated_irt: a entre 0,8 y 1,6; b = -1,2 (bajo), 0 (medio) o 1,3 (alto), con margen ±0,8; c = 0,25.
- Inglés: "cefr_level" (A-, A1, A2, B1, B+) y component_code de la parte (IN.P1..IN.P7). Las demás pruebas: cefr_level null.

Devuelve SOLO un arreglo JSON con este formato por pregunta:
{
  "id": "<uuid v4>",
  "subject": "LC|MA|SC|CN|IN",
  "evidence_code": "MA.E2.2",
  "component_code": "MA.CAT.ALG" | null,
  "cefr_level": null,
  "difficulty_target": "bajo|medio|alto",
  "estimated_irt": { "a": 1.0, "b": -1.2, "c": 0.25 },
  "context_type": "continuous|discontinuous",
  "context": { "title": "...", "text": "..." | null, "svg": "<svg ...>" | null,
               "table": { "caption": "...", "headers": ["..."], "rows": [["...", 1]] } | null },
  "stem": "...",
  "options": [
    { "label": "A", "text": "...", "is_correct": false,
      "distractor_diagnosis": "error típico", "explanation_feedback": "..." },
    ... (B, C, D; la clave lleva "distractor_diagnosis": null)
  ],
  "estimated_time_seconds": 60
}
```

## Lotes actuales

| Lote | Prueba | Preguntas | Evidencias |
|---|---|---|---|
| 2026-11-lote-001-lectura-critica | LC | 10 | LC.E1.1-LC.E3.3, textos continuos y una tabla |
| 2026-11-lote-002-matematicas | MA | 10 | MA.E1.1-MA.E3.3, álgebra, geometría y estadística, con tabla y gráfica SVG |
