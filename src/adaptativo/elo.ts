// Modelo de dificultad adaptativa (white paper 3.2.4), estilo Elo:
// theta = habilidad estimada del estudiante en el área/dominio
// delta = dificultad del caso
// La probabilidad de que el estudiante tenga un buen desempeño en un caso de
// dificultad delta, dado theta, sigue una función logística estándar.

export function probabilidadEsperada(theta: number, delta: number): number {
  return 1 / (1 + Math.pow(10, (delta - theta) / 4));
}

const K = 0.6; // [S] tasa de aprendizaje del ajuste — más alto = se adapta más rápido, más ruidoso

export interface EstadoAdaptativo {
  theta: number;
}

// resultado: 0 a 1 (ej. puntaje del evaluador / 100), no binario —
// permite que un desempeño parcial mueva theta parcialmente.
export function actualizar(
  estado: EstadoAdaptativo,
  delta: number,
  resultado: number
): EstadoAdaptativo {
  const esperado = probabilidadEsperada(estado.theta, delta);
  const theta = estado.theta + K * (resultado - esperado);
  return { theta };
}

// Elige, de una lista de casos candidatos (cada uno con su `dificultad`), el
// que más cerca esté de producir la probabilidad objetivo (0.7 por defecto:
// ligeramente desafiante, no abrumador) dado el theta actual del estudiante.
export function elegirCaso<T extends { dificultad: number }>(
  theta: number,
  candidatos: T[],
  objetivo = 0.7
): T | undefined {
  if (candidatos.length === 0) return undefined;
  return candidatos.reduce((mejor, actual) => {
    const diffActual = Math.abs(probabilidadEsperada(theta, actual.dificultad) - objetivo);
    const diffMejor = Math.abs(probabilidadEsperada(theta, mejor.dificultad) - objetivo);
    return diffActual < diffMejor ? actual : mejor;
  });
}
