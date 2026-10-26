import { anthropic } from "@/lib/anthropic";
import { promptEvaluador, HERRAMIENTA_REPORTAR_EVALUACION } from "./prompts/evaluador";
import { ResultadoEvaluacion, type Caso } from "@/types/dominio";

export async function evaluarSesion(
  caso: Caso,
  transcripcion: { autor: string; contenido: string }[],
  formulacionEstudiante: string,
  cie11Estudiante: string | undefined
): Promise<ResultadoEvaluacion> {
  const resp = await anthropic().messages.create({
    model: process.env.MODEL_EVALUADOR ?? "claude-sonnet-5-5",
    max_tokens: 2000,
    tools: [HERRAMIENTA_REPORTAR_EVALUACION],
    tool_choice: { type: "tool", name: "reportar_evaluacion" },
    messages: [
      {
        role: "user",
        content: promptEvaluador(
          caso.contenido,
          transcripcion.filter((t) => t.autor !== "sistema"),
          formulacionEstudiante,
          cie11Estudiante
        ),
      },
    ],
  });
  const bloque = resp.content.find((b) => b.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") {
    throw new Error("El evaluador no devolvió un resultado.");
  }
  return ResultadoEvaluacion.parse(bloque.input);
}
