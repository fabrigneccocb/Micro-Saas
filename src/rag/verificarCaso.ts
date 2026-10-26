// Verificación de fidelidad caso-fuente (white paper 1.6/3.2.3/5.2.2).
// Dos capas, nunca solo una: (1) un chequeo automático barato que detecta
// problemas obvios; (2) una cola de auditoría por muestreo para que el
// psicólogo asesor revise humanamente una fracción, NUNCA el 100 % y nunca
// solo lo que diga el propio juez automático (ver 1.4.F: un juez de IA no
// sustituye la revisión humana).
import { anthropic } from "@/lib/anthropic";
import { crearClienteAdmin } from "@/lib/supabase/server";
import type { Caso } from "@/types/dominio";

export interface ResultadoVerificacionAutomatica {
  fiel: boolean;
  problemas: string[];
}

export async function verificarFidelidadAutomatica(
  caso: Caso
): Promise<ResultadoVerificacionAutomatica> {
  const citas = caso.fuentes_citadas
    .map((f) => `- (${f.titulo}) "${f.fragmento_usado}"`)
    .join("\n");

  const resp = await anthropic().messages.create({
    model: process.env.MODEL_EVALUADOR ?? "claude-sonnet-5-5",
    max_tokens: 600,
    tools: [
      {
        name: "reportar_verificacion",
        description: "Reporta si el caso es fiel a las fuentes citadas.",
        input_schema: {
          type: "object",
          properties: {
            fiel: { type: "boolean" },
            problemas: { type: "array", items: { type: "string" } },
          },
          required: ["fiel", "problemas"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "reportar_verificacion" },
    messages: [
      {
        role: "user",
        content: `Compara este caso clínico generado contra las fuentes que dice usar. Marca fiel=false si algún dato clínico (diagnóstico, síntoma, nivel de riesgo) contradice las fuentes o no tiene respaldo en ellas.

Caso generado:
${JSON.stringify(caso.contenido, null, 2)}

Fuentes citadas:
${citas}`,
      },
    ],
  });

  const bloque = resp.content.find((b) => b.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") return { fiel: false, problemas: ["sin respuesta del verificador"] };
  const input = bloque.input as { fiel: boolean; problemas: string[] };
  return { fiel: Boolean(input.fiel), problemas: input.problemas ?? [] };
}

// Encola el caso en auditorias_fidelidad para revisión humana. Se llama
// SIEMPRE que el chequeo automático marque fiel=false, y además para una
// muestra aleatoria de los que pasan (ver MUESTREO_AUDITORIA_PCT), nunca solo
// para los que fallan — eso sesgaría la auditoría hacia los casos ya sospechosos.
const MUESTREO_AUDITORIA_PCT = 0.15; // [S] 15% de los casos que pasan el chequeo automático, también se auditan

export async function registrarParaAuditoria(casoId: string, notaAutomatica: string) {
  const supabase = crearClienteAdmin();
  await supabase.from("auditorias_fidelidad").insert({
    caso_id: casoId,
    revisado_por: null,
    fiel_a_la_fuente: null, // pendiente de revisión humana
    notas: notaAutomatica,
  });
}

export async function procesarVerificacion(caso: Caso): Promise<void> {
  const resultado = await verificarFidelidadAutomatica(caso);
  const supabase = crearClienteAdmin();
  await supabase
    .from("casos")
    .update({ verificado_muestreo: resultado.fiel })
    .eq("id", caso.id);

  const entraPorMuestreo = resultado.fiel && Math.random() < MUESTREO_AUDITORIA_PCT;
  if (!resultado.fiel || entraPorMuestreo) {
    await registrarParaAuditoria(
      caso.id,
      resultado.fiel
        ? "Seleccionado por muestreo aleatorio (pasó el chequeo automático)."
        : `Chequeo automático encontró problemas: ${resultado.problemas.join("; ")}`
    );
  }
}
