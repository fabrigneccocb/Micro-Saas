import { NextResponse } from "next/server";
import { Area, SUBCATEGORIAS } from "@/types/dominio";

export async function GET(_req: Request, { params }: { params: Promise<{ area: string }> }) {
  const { area: areaCruda } = await params;
  const parsed = Area.safeParse(areaCruda);
  if (!parsed.success) {
    return NextResponse.json({ error: "Área inválida" }, { status: 400 });
  }
  return NextResponse.json({ subcategorias: SUBCATEGORIAS[parsed.data] });
}
