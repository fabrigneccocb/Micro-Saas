// Tipos de dominio — reflejan el esquema de 3.2.2 del white paper.
// Toda forma que cruza una frontera (API, LLM, DB) se valida con Zod, no se asume.
import { z } from "zod";

export const Area = z.enum(["clinica", "educativa", "organizacional", "forense"]);
export type Area = z.infer<typeof Area>;

export const Modo = z.enum(["predeterminado", "libre"]);
export type Modo = z.infer<typeof Modo>;

// Subcategorías predeterminadas del MVP (solo área clínica por ahora).
// Al habilitar una nueva área, agrega su lista aquí — es lo único que el código necesita tocar.
export const SUBCATEGORIAS: Record<Area, string[]> = {
  clinica: ["pareja", "amigos", "emociones", "malestar_general"],
  educativa: [],
  organizacional: [],
  forense: [],
};

export const FuenteCitada = z.object({
  fuente_id: z.string().uuid(),
  fragmento_id: z.string().uuid().optional(),
  titulo: z.string(),
  url_o_doi: z.string().optional(),
  fragmento_usado: z.string(), // qué parte de la fuente respalda este elemento del caso
});
export type FuenteCitada = z.infer<typeof FuenteCitada>;

// El caso clínico que genera el RAG. Cada campo clínico relevante debe tener
// al menos una fuente citada en `fuentes_citadas` a nivel del caso completo
// (ver src/rag/generarCaso.ts — el prompt exige esto explícitamente).
export const CasoContenido = z.object({
  persona: z.object({
    edad: z.number().int().min(16).max(90),
    ocupacion: z.string(),
    contexto: z.string(),
  }),
  modelo_cognitivo: z.object({
    insight: z.enum(["bajo", "medio", "alto"]),
    afecto_base: z.string(),
    reacciones: z.array(z.string()).min(1),
  }),
  divulgacion: z.object({
    nivel_1: z.string(), // lo que el consultante dice sin que le pregunten
    nivel_2: z.string(), // lo que dice si el estudiante pregunta bien
    nivel_3: z.string(), // lo que solo sale con una entrevista hábil
  }),
  riesgo: z.object({
    nivel: z.enum(["bajo", "medio", "alto"]),
    senales_crisis: z.array(z.string()),
  }),
  principios: z.array(z.string()).min(1),
  formulacion_referencia: z.object({
    cie11: z.string(),
    justificacion: z.string(),
  }),
});
export type CasoContenido = z.infer<typeof CasoContenido>;

export const Caso = z.object({
  id: z.string().uuid(),
  area: Area,
  subcategoria: z.string(),
  modo: Modo,
  generado_por: z.string(),
  dificultad: z.number(),
  contenido: CasoContenido,
  fuentes_citadas: z.array(FuenteCitada).min(1),
  verificado_muestreo: z.boolean(),
  reutilizaciones: z.number().int().nonnegative(),
});
export type Caso = z.infer<typeof Caso>;

export const ClasificacionSeguridad = z.object({
  riesgo_detectado: z.boolean(),
  tipo: z.enum(["ninguno", "ideacion_suicida", "autolesion", "abuso", "violencia", "otro"]),
  confianza: z.number().min(0).max(1),
});
export type ClasificacionSeguridad = z.infer<typeof ClasificacionSeguridad>;

export const ResultadoEvaluacion = z.object({
  puntaje: z.number().min(0).max(100),
  por_criterio: z.array(
    z.object({
      criterio: z.string(),
      puntaje: z.number().min(0).max(100),
      comentario: z.string(),
      cita_del_caso: z.string(), // la evaluación siempre cita el caso, nunca opina "a ciegas"
    })
  ),
  resumen: z.string(),
});
export type ResultadoEvaluacion = z.infer<typeof ResultadoEvaluacion>;
