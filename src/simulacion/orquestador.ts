// Orquestador de un turno de entrevista (white paper 2.4, diagrama "flujo de
// una sesión"). Nota de diseño: el caso generado SÍ se podría transmitir
// token a token al estudiante (streaming), pero el filtro de seguridad de
// salida necesita el texto COMPLETO de la respuesta antes de decidir si se
// muestra o se bloquea — así que este MVP genera la respuesta entera en el
// servidor, la filtra, y SOLO ENTONCES la envía. Es más lento que streaming
// puro, pero es la decisión correcta dado 4.3.3: nunca mostrar algo sin
// filtrar primero.
import { anthropic } from "@/lib/anthropic";
import { crearClienteAdmin } from "@/lib/supabase/server";
import { debePausarPorCrisis, MENSAJE_CRISIS } from "./seguridad";
import { promptSistemaConsultante } from "./prompts/consultante";
import type { Caso } from "@/types/dominio";

export interface ResultadoTurno {
  respuesta: string;
  pausadaPorCrisis: boolean;
}

async function generarRespuestaConsultante(
  caso: Caso,
  historial: { autor: string; contenido: string }[]
): Promise<string> {
  const mensajes = historial
    .filter((t) => t.autor !== "sistema")
    .map((t) => ({
      role: (t.autor === "estudiante" ? "user" : "assistant") as "user" | "assistant",
      content: t.contenido,
    }));

  const resp = await anthropic().messages.create({
    model: process.env.MODEL_CONSULTANTE ?? "claude-haiku-5-5",
    max_tokens: 400,
    system: promptSistemaConsultante(caso.contenido),
    messages: mensajes,
  });
  const bloque = resp.content.find((b) => b.type === "text");
  return bloque && bloque.type === "text" ? bloque.text : "";
}

export async function procesarTurno(
  sesionId: string,
  caso: Caso,
  mensajeEstudiante: string,
  historialPrevio: { autor: string; contenido: string }[]
): Promise<ResultadoTurno> {
  const supabase = crearClienteAdmin();

  // 1) ¿Lo que escribió el estudiante ya es, en sí mismo, una señal de crisis real?
  //    (no del personaje — del estudiante, fuera de la ficción)
  const crisisEnEntrada = await debePausarPorCrisis(mensajeEstudiante);
  if (crisisEnEntrada) {
    await supabase.from("sesiones").update({ estado: "pausada_crisis" }).eq("id", sesionId);
    const mensaje = MENSAJE_CRISIS();
    await supabase.from("turnos").insert([
      {
        sesion_id: sesionId,
        orden: historialPrevio.length,
        autor: "estudiante",
        contenido: mensajeEstudiante,
        marcado_riesgo: true,
      },
      {
        sesion_id: sesionId,
        orden: historialPrevio.length + 1,
        autor: "sistema",
        contenido: mensaje,
        marcado_riesgo: true,
      },
    ]);
    return { respuesta: mensaje, pausadaPorCrisis: true };
  }

  // 2) Genera la respuesta del consultante, con un reintento si el filtro de salida la bloquea.
  const historialConMensaje = [
    ...historialPrevio,
    { autor: "estudiante", contenido: mensajeEstudiante },
  ];
  let respuesta = await generarRespuestaConsultante(caso, historialConMensaje);
  let bloqueada = await debePausarPorCrisis(respuesta);
  if (bloqueada) {
    // Reintento único (4.3.3): a veces el modelo improvisa hacia un lugar que
    // no debía; una segunda pasada con el mismo contexto suele corregirlo.
    respuesta = await generarRespuestaConsultante(caso, historialConMensaje);
    bloqueada = await debePausarPorCrisis(respuesta);
  }

  if (bloqueada) {
    await supabase.from("sesiones").update({ estado: "pausada_crisis" }).eq("id", sesionId);
    const mensaje = MENSAJE_CRISIS();
    await supabase.from("turnos").insert([
      {
        sesion_id: sesionId,
        orden: historialPrevio.length,
        autor: "estudiante",
        contenido: mensajeEstudiante,
        marcado_riesgo: false,
      },
      {
        sesion_id: sesionId,
        orden: historialPrevio.length + 1,
        autor: "sistema",
        contenido: mensaje,
        marcado_riesgo: true,
      },
    ]);
    return { respuesta: mensaje, pausadaPorCrisis: true };
  }

  await supabase.from("turnos").insert([
    {
      sesion_id: sesionId,
      orden: historialPrevio.length,
      autor: "estudiante",
      contenido: mensajeEstudiante,
      marcado_riesgo: false,
    },
    {
      sesion_id: sesionId,
      orden: historialPrevio.length + 1,
      autor: "consultante",
      contenido: respuesta,
      marcado_riesgo: false,
    },
  ]);

  return { respuesta, pausadaPorCrisis: false };
}
