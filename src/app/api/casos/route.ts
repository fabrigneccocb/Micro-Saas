import { NextResponse } from "next/server";
import { z } from "zod";
import { Area } from "@/types/dominio";
import { generarCaso, obtenerCasoPredeterminado } from "@/rag/generarCaso";

const PedidoCaso = z.object({
  area: Area,
  subcategoria: z.string().min(1),
  modo: z.enum(["predeterminado", "libre"]),
  variablesLibres: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PedidoCaso.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { area, subcategoria, modo, variablesLibres } = parsed.data;

  try {
    const caso =
      modo === "predeterminado"
        ? await obtenerCasoPredeterminado(area, subcategoria)
        : await generarCaso({ area, subcategoria, modo, variablesLibres });
    return NextResponse.json({ caso });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando el caso";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
