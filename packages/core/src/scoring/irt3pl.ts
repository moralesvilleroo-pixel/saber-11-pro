/**
 * Teoria de Respuesta al Item, modelo logistico de 3 parametros (TRI 3PL):
 *   P(theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
 * a: discriminacion, b: dificultad, c: pseudoadivinacion.
 */

export interface IrtItemParams {
  a: number;
  b: number;
  c: number;
}

export interface IrtResponse extends IrtItemParams {
  correct: boolean;
}

export interface ThetaEstimate {
  /** Habilidad estimada en escala logit, acotada a [thetaMin, thetaMax]. */
  theta: number;
  /** Error estandar = 1 / sqrt(informacion del test en theta). Infinity sin respuestas. */
  standardError: number;
  /** true si la estimacion quedo en un limite (p. ej. todo correcto o todo incorrecto). */
  atBound: boolean;
  responses: number;
}

export interface ThetaEstimateOptions {
  thetaMin?: number;
  thetaMax?: number;
}

export function probability3pl(theta: number, item: IrtItemParams): number {
  return item.c + (1 - item.c) / (1 + Math.exp(-item.a * (theta - item.b)));
}

/** Informacion de Fisher de un item 3PL en theta. */
export function itemInformation(theta: number, item: IrtItemParams): number {
  const p = probability3pl(theta, item);
  const q = 1 - p;
  if (p <= 0 || q <= 0) return 0;
  return (item.a ** 2 * ((p - item.c) ** 2 / (1 - item.c) ** 2) * q) / p;
}

export function logLikelihood(theta: number, responses: readonly IrtResponse[]): number {
  let ll = 0;
  for (const r of responses) {
    const p = Math.min(Math.max(probability3pl(theta, r), 1e-12), 1 - 1e-12);
    ll += r.correct ? Math.log(p) : Math.log(1 - p);
  }
  return ll;
}

function validateItem(item: IrtItemParams): void {
  if (!(item.a > 0) || !Number.isFinite(item.b) || !(item.c >= 0 && item.c < 1)) {
    throw new Error(`Parametros TRI invalidos: a=${item.a}, b=${item.b}, c=${item.c}`);
  }
}

/**
 * Estimacion de maxima verosimilitud acotada. La verosimilitud 3PL puede tener
 * varios maximos locales, por eso se hace una busqueda en rejilla (paso 0.05) y
 * luego se refina con seccion aurea alrededor del mejor punto.
 */
export function estimateTheta(
  responses: readonly IrtResponse[],
  options: ThetaEstimateOptions = {},
): ThetaEstimate {
  const thetaMin = options.thetaMin ?? -4;
  const thetaMax = options.thetaMax ?? 4;
  if (!(thetaMin < thetaMax)) throw new Error("thetaMin debe ser menor que thetaMax");
  responses.forEach(validateItem);

  if (responses.length === 0) {
    return { theta: 0, standardError: Infinity, atBound: false, responses: 0 };
  }

  const step = 0.05;
  let best = thetaMin;
  let bestLl = -Infinity;
  for (let t = thetaMin; t <= thetaMax + 1e-9; t += step) {
    const ll = logLikelihood(t, responses);
    if (ll > bestLl) {
      bestLl = ll;
      best = t;
    }
  }

  let lo = Math.max(thetaMin, best - step);
  let hi = Math.min(thetaMax, best + step);
  const g = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - g * (hi - lo);
  let x2 = lo + g * (hi - lo);
  let f1 = logLikelihood(x1, responses);
  let f2 = logLikelihood(x2, responses);
  for (let i = 0; i < 60 && hi - lo > 1e-7; i++) {
    if (f1 < f2) {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + g * (hi - lo);
      f2 = logLikelihood(x2, responses);
    } else {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - g * (hi - lo);
      f1 = logLikelihood(x1, responses);
    }
  }
  let theta = (lo + hi) / 2;
  // Si el maximo esta en un extremo, la rejilla lo detecta; se fija el limite exacto.
  if (logLikelihood(thetaMin, responses) >= logLikelihood(theta, responses)) theta = thetaMin;
  if (logLikelihood(thetaMax, responses) >= logLikelihood(theta, responses)) theta = thetaMax;

  const info = responses.reduce((acc, r) => acc + itemInformation(theta, r), 0);
  const atBound = Math.abs(theta - thetaMin) < 1e-6 || Math.abs(theta - thetaMax) < 1e-6;
  return {
    theta,
    standardError: info > 0 ? 1 / Math.sqrt(info) : Infinity,
    atBound,
    responses: responses.length,
  };
}

/**
 * Lleva theta a la escala de una prueba ICFES (media 50, desviacion 10), entero en [0, 100].
 * Es una aproximacion: el Icfes no publica su transformacion exacta.
 */
export function thetaToIcfesScore(theta: number): number {
  return Math.min(100, Math.max(0, Math.round(50 + 10 * theta)));
}
