// Guardarraíles de seguridad en tiempo real (white paper 2.4 / 4.3.3).
// Dos capas, en este orden, SIEMPRE antes de mostrar cualquier respuesta:
// 1) reglas deterministas (gratis, instantáneas, sin falsos negativos en las
//    frases más explícitas) sobre lo que ESCRIBE EL ESTUDIANTE;
// 2) un clasificador con LLM (barato, Haiku) sobre cada turno generado,
//    porque las reglas fijas no atrapan matices.
// Independiente del origen del caso (predeterminado o libre, ver 3.2/5.2.2):
// esto corre siempre igual.
import { anthropic } from "@/lib/anthropic";
import { ClasificacionSeguridad } from "@/types/dominio";

// [H] Frases explícitas de riesgo inminente. Lista corta a propósito: es la
// red determinista, no el detector principal — el clasificador cubre lo demás.
// Mantenla en español coloquial colombiano, no en jerga clínica.
const PATRONES_CRISIS_EXPLICITA = [
  /quiero\s+(matarme|suicidarme|morir(me)?)/i,
  /me\s+quiero\s+(matar|morir|suicidar)/i,
  /no\s+(quiero|puedo)\s+(seguir|vivir)\s+m[áa]s/i,
  /me\s+voy\s+a\s+(matar|suicidar)/i,
  /pensando\s+en\s+(quitarme|acabar con)\s+(mi\s+vida|todo)/i,
];

export function MENSAJE_CRISIS(): string {
  return (
    "Esta conversación es una simulación de entrenamiento, no un servicio de " +
    "atención en crisis. Si tú o alguien que conoces está en riesgo, por favor " +
    "contacta ahora:\n\n" +
    "• Línea 106 (Bogotá, 24 horas, atendida por psicólogos)\n" +
    "• Línea 192, opción 4 (nacional, Ministerio de Salud)\n\n" +
    "La simulación queda pausada aquí."
  );
}

export function reglaDeterminista(texto: string): boolean {
  return PATRONES_CRISIS_EXPLICITA.some((re) => re.test(texto));
}

// Clasificador en tiempo real sobre CUALQUIER texto que esté a punto de
// mostrarse (lo que escribe el consultante simulado, principalmente).
export async function clasificarRiesgo(texto: string): Promise<ClasificacionSeguridad> {
  const resp = await anthropic().messages.create({
    model: process.env.MODEL_SEGURIDAD ?? "claude-haiku-5-5",
    max_tokens: 150,
    tools: [
      {
        name: "clasificar",
        description: "Clasifica si el texto contiene señales reales de crisis.",
        input_schema: {
          type: "object",
          properties: {
            riesgo_detectado: { type: "boolean" },
            tipo: {
              type: "string",
              enum: ["ninguno", "ideacion_suicida", "autolesion", "abuso", "violencia", "otro"],
            },
            confianza: { type: "number" },
          },
          required: ["riesgo_detectado", "tipo", "confianza"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "clasificar" },
    messages: [
      {
        role: "user",
        content: `Clasifica si este texto de una simulación de entrevista psicológica contiene señales REALES de crisis (no solo que el PERSONAJE simulado esté triste, sino lenguaje que ameritaría una intervención de seguridad real). Texto:\n\n"${texto}"`,
      },
    ],
  });
  const bloque = resp.content.find((b) => b.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") {
    return { riesgo_detectado: false, tipo: "ninguno", confianza: 0 };
  }
  return ClasificacionSeguridad.parse(bloque.input);
}

// Revisión completa de un texto antes de mostrarlo: regla determinista primero
// (más barata), clasificador después. true = hay que pausar y mostrar MENSAJE_CRISIS().
export async function debePausarPorCrisis(texto: string): Promise<boolean> {
  if (reglaDeterminista(texto)) return true;
  const clasificacion = await clasificarRiesgo(texto);
  return clasificacion.riesgo_detectado && clasificacion.confianza >= 0.6;
}
