import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { crearClienteAdmin } from "@/lib/supabase/server";
import { exigirAsesorOAdmin } from "@/lib/autorizacion";
import { Area } from "@/types/dominio";
import { trocear, generarEmbedding } from "@/rag/embeddings";

const NuevaFuente = z.object({
  area: Area,
  titulo: z.string().min(1),
  urlODoi: z.string().optional(),
  tipo: z.enum(["manual", "articulo", "caso_publicado", "guia"]).default("articulo"),
  textoCompleto: z.string().min(200, "Pega el texto completo de la fuente (mínimo ~200 caracteres)."),
});

// Lista de fuentes (para el panel de administración).
export async function GET() {
  const auth = await exigirAsesorOAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("fuentes")
    .select("id, area, titulo, url_o_doi, tipo, aprobada, creado_en")
    .order("creado_en", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fuentes: data });
}

// Carga una fuente nueva: la trocea, calcula embeddings, y la guarda SIN
// aprobar (aprobada=false) — el psicólogo asesor debe aprobarla aparte
// (ver PATCH abajo) antes de que el generador de casos pueda usarla. Esto es
// la "lista blanca cerrada" de 5.2.2: nada entra al RAG automáticamente.
export async function POST(req: Request) {
  const auth = await exigirAsesorOAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = NuevaFuente.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { area, titulo, urlODoi, tipo, textoCompleto } = parsed.data;

  const admin = crearClienteAdmin();
  const fuenteId = randomUUID();
  const { error: errFuente } = await admin.from("fuentes").insert({
    id: fuenteId,
    area,
    titulo,
    url_o_doi: urlODoi ?? null,
    tipo,
    texto_completo: textoCompleto,
    cargado_por: auth.userId,
    aprobada: false,
  });
  if (errFuente) return NextResponse.json({ error: errFuente.message }, { status: 500 });

  const fragmentos = trocear(textoCompleto);
  for (let i = 0; i < fragmentos.length; i++) {
    const texto = fragmentos[i]!;
    try {
      const embedding = await generarEmbedding(texto, "document");
      await admin.from("fuentes_fragmentos").insert({
        fuente_id: fuenteId,
        orden: i,
        texto,
        embedding,
      });
    } catch (e) {
      console.error(`No se pudo generar el embedding del fragmento ${i} de "${titulo}":`, e);
    }
  }

  return NextResponse.json({ fuenteId, fragmentos: fragmentos.length });
}

// Aprueba (o retira) una fuente — body: { fuenteId, aprobada }
const CambioAprobacion = z.object({ fuenteId: z.string().uuid(), aprobada: z.boolean() });
export async function PATCH(req: Request) {
  const auth = await exigirAsesorOAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = CambioAprobacion.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "payload inválido" }, { status: 400 });

  const admin = crearClienteAdmin();
  const { error } = await admin
    .from("fuentes")
    .update({ aprobada: parsed.data.aprobada })
    .eq("id", parsed.data.fuenteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
