import { crearClienteAdmin } from "@/lib/supabase/server";
import { generarEmbedding } from "./embeddings";
import type { Area } from "@/types/dominio";

export interface FragmentoRecuperado {
  fragmento_id: string;
  fuente_id: string;
  titulo: string;
  url_o_doi: string | null;
  texto: string;
  similitud: number;
}

// Recupera los fragmentos más afines de la biblioteca de fuentes del área dada.
// Esto es el "anclaje" del generador de casos (ver white paper 1.4.F / 4.3.0):
// el caso se construye a partir de ESTO, no de lo que el modelo "recuerde".
export async function buscarFragmentos(
  consulta: string,
  area: Area,
  limite = 8
): Promise<FragmentoRecuperado[]> {
  const supabase = crearClienteAdmin();
  const embedding = await generarEmbedding(consulta, "query");
  const { data, error } = await supabase.rpc("buscar_fragmentos", {
    query_embedding: embedding,
    area_filtro: area,
    limite,
  });
  if (error) throw new Error(`Búsqueda RAG falló: ${error.message}`);
  return (data ?? []) as FragmentoRecuperado[];
}
