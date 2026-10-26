// Prompt del agente evaluador. Nunca ve la identidad del estudiante (barrera
// de información inversa, 3.2.4 / 4.3.1) — solo la transcripción, el caso
// completo (incluida la formulación de referencia) y la formulación del
// estudiante. Siempre debe citar el caso al calificar (4.3.4).
import type { CasoContenido } from "@/types/dominio";

export function promptEvaluador(
  contenido: CasoContenido,
  transcripcion: { autor: string; contenido: string }[],
  formulacionEstudiante: string,
  cie11Estudiante: string | undefined
): string {
  const historial = transcripcion
    .map((t) => `${t.autor === "estudiante" ? "Estudiante" : "Consultante"}: ${t.contenido}`)
    .join("\n");

  return `Evalúas la entrevista de un estudiante de psicología contra este caso de referencia. Debes CITAR el caso (entre comillas) en cada criterio que califiques — nunca des un puntaje sin una cita concreta que lo respalde.

Caso de referencia (el estudiante NO vio esto):
${JSON.stringify(contenido, null, 2)}

Transcripción de la entrevista:
${historial}

Formulación del estudiante: "${formulacionEstudiante}"
Código CIE-11 que dio el estudiante: ${cie11Estudiante ?? "(no dio uno)"}

Califica con la herramienta reportar_evaluacion. Criterios sugeridos: apertura y rapport, manejo de la divulgación progresiva (¿llegó al nivel_3 o se quedó en nivel_1?), señales de riesgo (¿las detectó si existían?), precisión de la formulación final frente a formulacion_referencia, y manejo general de la entrevista. El resumen debe ser honesto, no genérico — si el estudiante no llegó a nada, dilo.`;
}

export const HERRAMIENTA_REPORTAR_EVALUACION = {
  name: "reportar_evaluacion",
  description: "Reporta la evaluación de la entrevista.",
  input_schema: {
    type: "object" as const,
    properties: {
      puntaje: { type: "number" },
      por_criterio: {
        type: "array",
        items: {
          type: "object",
          properties: {
            criterio: { type: "string" },
            puntaje: { type: "number" },
            comentario: { type: "string" },
            cita_del_caso: { type: "string" },
          },
          required: ["criterio", "puntaje", "comentario", "cita_del_caso"],
        },
      },
      resumen: { type: "string" },
    },
    required: ["puntaje", "por_criterio", "resumen"],
  },
};
