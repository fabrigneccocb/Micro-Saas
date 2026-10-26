// Generador de casos por RAG (white paper 3.2.2 / 4.3.0).
// Flujo: construir consulta -> recuperar fragmentos de la biblioteca de fuentes
// -> generar el caso citando esos fragmentos -> validar con Zod -> guardar.
import { randomUUID } from "crypto";
import { anthropic } from "@/lib/anthropic";
import { crearClienteAdmin } from "@/lib/supabase/server";
import { buscarFragmentos, type FragmentoRecuperado } from "./buscar";
import { procesarVerificacion } from "./verificarCaso";
import { CasoContenido, type Area, type Caso, type FuenteCitada } from "@/types/dominio";

interface PedidoGeneracion {
  area: Area;
  subcategoria: string;
  modo: "predeterminado" | "libre";
  variablesLibres?: string; // texto libre que el estudiante escribió, solo si modo = 'libre'
}

// El "esquema de salida" que fuerza al modelo a citar: por cada campo relevante,
// un índice al fragmento recuperado que lo respalda (1-based, tal como se le
// numeran en el prompt). Esto es lo que hace trazable cada elemento del caso.
const HERRAMIENTA_REGISTRAR_CASO = {
  name: "registrar_caso",
  description:
    "Registra el caso clínico generado, con la lista de fragmentos de fuente usados.",
  input_schema: {
    type: "object" as const,
    properties: {
      persona: {
        type: "object",
        properties: {
          edad: { type: "integer" },
          ocupacion: { type: "string" },
          contexto: { type: "string" },
        },
        required: ["edad", "ocupacion", "contexto"],
      },
      modelo_cognitivo: {
        type: "object",
        properties: {
          insight: { type: "string", enum: ["bajo", "medio", "alto"] },
          afecto_base: { type: "string" },
          reacciones: { type: "array", items: { type: "string" } },
        },
        required: ["insight", "afecto_base", "reacciones"],
      },
      divulgacion: {
        type: "object",
        properties: {
          nivel_1: { type: "string" },
          nivel_2: { type: "string" },
          nivel_3: { type: "string" },
        },
        required: ["nivel_1", "nivel_2", "nivel_3"],
      },
      riesgo: {
        type: "object",
        properties: {
          nivel: { type: "string", enum: ["bajo", "medio", "alto"] },
          senales_crisis: { type: "array", items: { type: "string" } },
        },
        required: ["nivel", "senales_crisis"],
      },
      principios: { type: "array", items: { type: "string" } },
      formulacion_referencia: {
        type: "object",
        properties: {
          cie11: { type: "string" },
          justificacion: { type: "string" },
        },
        required: ["cie11", "justificacion"],
      },
      fragmentos_usados: {
        type: "array",
        description:
          "Índices (1-based) de los fragmentos de la lista numerada que respaldan este caso. Mínimo 1.",
        items: { type: "integer" },
      },
    },
    required: [
      "persona",
      "modelo_cognitivo",
      "divulgacion",
      "riesgo",
      "principios",
      "formulacion_referencia",
      "fragmentos_usados",
    ],
  },
};

function construirConsulta(p: PedidoGeneracion): string {
  const base = `psicología ${p.area}, caso de ${p.subcategoria.replace(/_/g, " ")}`;
  return p.modo === "libre" && p.variablesLibres ? `${base}: ${p.variablesLibres}` : base;
}

function construirPrompt(p: PedidoGeneracion, fragmentos: FragmentoRecuperado[]): string {
  const lista = fragmentos
    .map((f, i) => `[${i + 1}] (${f.titulo}) ${f.texto}`)
    .join("\n\n");
  const variables =
    p.modo === "libre" && p.variablesLibres
      ? `\n\nEl estudiante pidió específicamente: "${p.variablesLibres}". Incorpora esto de forma realista.`
      : "";
  return `Eres un generador de casos clínicos de entrenamiento para estudiantes de psicología en Colombia, área ${p.area}, subcategoría "${p.subcategoria}".

Usa EXCLUSIVAMENTE la información de los siguientes fragmentos de fuentes reales y citables. No inventes datos clínicos que no estén respaldados por ellos — si necesitas un detalle que no está ahí, usa algo genérico y verosímil, no un hecho clínico específico sin respaldo.

Fragmentos disponibles:
${lista}
${variables}

Genera UN caso con la herramienta registrar_caso. El campo "divulgacion" define qué cuenta el paciente simulado en tres niveles de profundidad de entrevista, no el diagnóstico — el estudiante debe llegar a la formulación por su cuenta. "formulacion_referencia" es la respuesta de referencia que usará el evaluador, no lo que el paciente dice. Usa CIE-11 (OMS), nunca DSM-5. Lista en "fragmentos_usados" los números de TODOS los fragmentos que efectivamente usaste.`;
}

export async function generarCaso(pedido: PedidoGeneracion): Promise<Caso> {
  const consulta = construirConsulta(pedido);
  const fragmentos = await buscarFragmentos(consulta, pedido.area, 8);
  if (fragmentos.length === 0) {
    throw new Error(
      `No hay fuentes aprobadas para el área "${pedido.area}". Carga y aprueba fuentes en /admin/fuentes antes de generar casos ahí.`
    );
  }

  const prompt = construirPrompt(pedido, fragmentos);
  const respuesta = await anthropic().messages.create({
    model: process.env.MODEL_GENERADOR_CASOS ?? "claude-sonnet-5-5",
    max_tokens: 2500,
    tools: [HERRAMIENTA_REGISTRAR_CASO],
    tool_choice: { type: "tool", name: "registrar_caso" },
    messages: [{ role: "user", content: prompt }],
  });

  const bloqueHerramienta = respuesta.content.find((b) => b.type === "tool_use");
  if (!bloqueHerramienta || bloqueHerramienta.type !== "tool_use") {
    throw new Error("El generador de casos no devolvió una llamada a registrar_caso.");
  }
  const crudo = bloqueHerramienta.input as Record<string, unknown>;
  const fragmentosUsados = (crudo.fragmentos_usados as number[] | undefined) ?? [];
  if (fragmentosUsados.length === 0) {
    throw new Error(
      "El caso generado no citó ningún fragmento de fuente. Se descarta: no cumple el requisito de trazabilidad."
    );
  }

  const contenido = CasoContenido.parse({
    persona: crudo.persona,
    modelo_cognitivo: crudo.modelo_cognitivo,
    divulgacion: crudo.divulgacion,
    riesgo: crudo.riesgo,
    principios: crudo.principios,
    formulacion_referencia: crudo.formulacion_referencia,
  });

  const fuentesCitadas: FuenteCitada[] = fragmentosUsados
    .map((i) => fragmentos[i - 1])
    .filter((f): f is FragmentoRecuperado => Boolean(f))
    .map((f) => ({
      fuente_id: f.fuente_id,
      fragmento_id: f.fragmento_id,
      titulo: f.titulo,
      url_o_doi: f.url_o_doi ?? undefined,
      fragmento_usado: f.texto.slice(0, 280),
    }));

  const caso: Caso = {
    id: randomUUID(),
    area: pedido.area,
    subcategoria: pedido.subcategoria,
    modo: pedido.modo,
    generado_por: "rag-v1",
    dificultad: 0,
    contenido,
    fuentes_citadas: fuentesCitadas,
    verificado_muestreo: false,
    reutilizaciones: 0,
  };

  const supabase = crearClienteAdmin();
  const { error } = await supabase.from("casos").insert({
    id: caso.id,
    area: caso.area,
    subcategoria: caso.subcategoria,
    modo: caso.modo,
    variables_libres: pedido.modo === "libre" ? { texto: pedido.variablesLibres } : null,
    generado_por: caso.generado_por,
    dificultad: caso.dificultad,
    contenido: caso.contenido,
    fuentes_citadas: caso.fuentes_citadas,
    verificado_muestreo: false,
    reutilizaciones: 0,
  });
  if (error) throw new Error(`No se pudo guardar el caso generado: ${error.message}`);

  // Verificación de fidelidad (automática + cola de muestreo humano) ANTES de
  // devolver el caso, para que verificado_muestreo refleje la realidad desde
  // el primer uso. No bloquea indefinidamente: es una llamada más al modelo.
  try {
    await procesarVerificacion(caso);
  } catch (e) {
    console.error("Verificación de fidelidad falló (el caso queda sin verificar):", e);
  }

  return caso;
}

// Busca un caso predeterminado reutilizable para esta subcategoría (ver 2.4 /
// el diagrama "generación de casos"). Si existe uno ya verificado por
// muestreo con menos reutilizaciones que el límite, se reutiliza y se cuenta;
// si no, se genera uno nuevo.
export async function obtenerCasoPredeterminado(area: Area, subcategoria: string): Promise<Caso> {
  const supabase = crearClienteAdmin();
  const limiteReutilizaciones = Number(process.env.REUTILIZACIONES_CASO_PREDETERMINADO ?? 20);

  const { data: existentes } = await supabase
    .from("casos")
    .select("*")
    .eq("area", area)
    .eq("subcategoria", subcategoria)
    .eq("modo", "predeterminado")
    .lt("reutilizaciones", limiteReutilizaciones)
    .order("creado_en", { ascending: true })
    .limit(1);

  const fila = existentes?.[0];
  if (fila) {
    await supabase
      .from("casos")
      .update({ reutilizaciones: fila.reutilizaciones + 1 })
      .eq("id", fila.id);
    return Caso.parse({ ...fila, reutilizaciones: fila.reutilizaciones + 1 });
  }

  return generarCaso({ area, subcategoria, modo: "predeterminado" });
}
