# PRD de Pedagogía - Saber11 Pro

Reglas de negocio del producto. Este archivo solo cambia si cambia el diseño pedagógico.
Las cifras marcadas con (verificar) vienen del plan maestro y deben cotejarse con la
Guía de Orientación Saber 11 vigente antes de mostrarse al estudiante como dato oficial.

## 1. El examen

| Prueba | Código | Sesión 1 | Sesión 2 | Total | Peso |
|---|---|---|---|---|---|
| Lectura Crítica | LC | 41 | 0 | 41 | 3/13 |
| Matemáticas | MA | 25 | 25 | 50 | 3/13 |
| Sociales y Ciudadanas | SC | 25 | 25 | 50 | 3/13 |
| Ciencias Naturales | CN | 29 | 29 | 58 | 3/13 |
| Inglés | IN | 0 | 55 | 55 | 1/13 |

- 254 preguntas calificables y 48 auxiliares no puntuables, en dos sesiones de 4 h 30 min (verificar).
- Todas las preguntas son de selección múltiple con única respuesta: contexto (continuo o
  discontinuo), enunciado y cuatro opciones A-D.
- Se construyen con el Modelo Basado en Evidencias (MBE): Competencia → Afirmación → Evidencia.
  La taxonomía está en `docs/MBE_TAXONOMIA.json`.

### Puntajes
- Por prueba: entero 0-100 estimado con TRI de 3 parámetros (no es suma de aciertos).
- Índice Global: `IG = (3·LC + 3·MA + 3·SC + 3·CN + IN) / 13`. Exento de Inglés: promedio simple de las cuatro.
- Puntaje Global: `PG = round(IG × 5)`, entero en [0, 500].
- Impacto marginal: +10 puntos en LC, MA, SC o CN suben el PG en 150/13 ≈ 11,54; en IN, 50/13 ≈ 3,85.
  La app lo muestra para orientar dónde estudiar.
- Niveles de desempeño: 1-4 en las cuatro pruebas nucleares; A-, A1, A2, B1, B+ en Inglés.
  Como la guía no publica los cortes vigentes, la métrica principal es el puntaje 0-100 y el percentil;
  el nivel se muestra solo cuando haya cortes oficiales cargados.

## 2. Principios de aprendizaje (no negociables)

1. **Práctica de recuperación con retroalimentación explicativa.** El estudiante responde antes de ver
   cualquier explicación. Tras responder ve por qué la clave es correcta y por qué cada distractor no lo es.
   Mostrar solo "correcto/incorrecto" está prohibido.
2. **Repetición espaciada FSRS-6.** Cada pregunta respondida se vuelve tarjeta con estado DSR
   (dificultad, estabilidad, recuperabilidad). Calificación 1 Again, 2 Hard, 3 Good, 4 Easy.
   La calificación se propone a partir de acierto y tiempo; el estudiante puede ajustarla.
3. **Práctica intercalada.** Las sesiones mezclan al menos dos pruebas o competencias distintas;
   no hay bloques largos de un solo tipo de problema (salvo micro-lecciones de refuerzo).
4. **Autoexplicación tras el error** en Matemáticas y Ciencias: pasos guiados para el concepto fallado.
5. **Sin lectura pasiva como eje.** Las fichas de teoría aparecen solo después de un error y terminan
   en una pregunta de recuperación.

## 3. Ciclo adaptativo

1. **Diagnóstico** de 40-60 preguntas repartidas entre las cinco pruebas (proporcional a peso y conteo).
   Produce una estimación θ inicial por prueba y un PG proyectado.
2. **Brecha ponderada**: diferencia entre PG proyectado y `target_global_score`, distribuida según el
   impacto marginal de cada prueba y la debilidad por evidencia.
3. **Sesión diaria** de `daily_study_minutes`, armada por el planificador:
   - ~40 % repasos FSRS vencidos (primero los de menor recuperabilidad).
   - ~40 % práctica intercalada sobre evidencias débiles, ordenadas por impacto en el PG,
     mínimo dos pruebas o competencias distintas.
   - ~20 % refuerzo de errores recientes (micro-lección + pregunta nueva de la misma evidencia).
   Si una parte no tiene material suficiente, su cupo pasa a la siguiente en ese orden.
4. **Retención objetivo dinámica** según días hasta el examen: 0,88 con más de 90 días,
   subiendo de forma progresiva hasta 0,94 en los últimos 21 días.
5. **Resistencia**: de bloques de 15-30 min a medias sesiones y luego simulacros de doble sesión
   (143 + 159 preguntas) con cronómetro estricto en las últimas semanas.
6. **Recalcular θ** después de cada sesión (`user_theta_estimates`, fuente `rolling`) y tras cada simulacro.

## 4. Estrategia por prueba

- **Lectura Crítica**: prioridad temprana (peso alto, poca teoría previa). Entrenar a identificar
  si la pregunta es local, global o de reflexión, y a descartar distractores extremos.
- **Matemáticas y Ciencias**: plantillas paramétricas; gráficas en SVG generado por código.
- **Sociales**: contextos nuevos de casos, fuentes y perspectivas; Constitución y sistema político.
- **Inglés**: exposición diaria breve con tarjetas espaciadas y práctica por las 7 partes del examen;
  no consume más del ~15 % del tiempo salvo que sea la brecha principal.

## 5. Banco de preguntas

- 100 % original. Prohibido copiar o parafrasear ítems de cuadernillos o guías del Icfes.
- Cada ítem se etiqueta con una evidencia (`evidence_id`) y, si aplica, un componente
  (componente de CN, categoría de MA, parte de IN, tipo de texto de LC).
- Ingeniería de distractores: cada opción incorrecta responde a un error típico documentado
  (`distractor_type`) y lleva su propia `explanation_feedback`.
- Ciclo de vida: `draft` → `qa_passed` (revisión de calidad) → `calibrated` (≥ 200 respuestas y
  parámetros TRI reestimados) → `retired` (ambiguo, discriminación baja o clave en disputa).
- Parámetros TRI iniciales por dificultad objetivo: baja b = -1,2; media b = 0; alta b = +1,3; c = 0,25.
- Generación por lotes de 10 con el Prompt 5; prioridad inicial LC y MA.

## 6. Cumplimiento (resumen; reglas técnicas en CLAUDE.md)

- Ley 1581 de 2012, Art. 7, y Decreto 1377 de 2013: autorización previa y verificable del
  representante legal para menores antes de tratar sus datos de estudio.
- Política de Tratamiento de Datos publicada y versionada (`privacy_policy_version`).
- Canal ARCO trazable con plazos de 10 días hábiles (consultas) y 15 días hábiles (reclamos).
- MVP sin monetización mientras el frontend esté en Vercel Hobby.
