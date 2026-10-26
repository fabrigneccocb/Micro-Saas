// Embeddings vía Voyage AI (socio recomendado por Anthropic; no hay API de
// embeddings propia de Claude). Llamada REST directa: no vale la pena una
// dependencia extra para un solo endpoint.
const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

export async function generarEmbedding(
  texto: string,
  tipo: "query" | "document" = "document"
): Promise<number[]> {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error("Falta VOYAGE_API_KEY. Revisa docs/DESPLIEGUE.md.");
  }
  const resp = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [texto],
      model: process.env.MODEL_EMBEDDINGS ?? "voyage-3.5",
      input_type: tipo,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Voyage AI respondió ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as { data: { embedding: number[] }[] };
  const emb = data.data[0]?.embedding;
  if (!emb) throw new Error("Voyage AI no devolvió un embedding.");
  return emb;
}

// Trocea un texto largo en fragmentos de ~800 palabras con solapamiento de 100,
// para indexarlo en fuentes_fragmentos. Ingenuo a propósito: separa por
// párrafos y agrupa, no corta a mitad de oración si se puede evitar.
export function trocear(texto: string, palabrasPorFragmento = 800, solape = 100): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const fragmentos: string[] = [];
  let inicio = 0;
  while (inicio < palabras.length) {
    const fin = Math.min(inicio + palabrasPorFragmento, palabras.length);
    fragmentos.push(palabras.slice(inicio, fin).join(" "));
    if (fin === palabras.length) break;
    inicio = fin - solape;
  }
  return fragmentos;
}
