import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/server";
import { SUBCATEGORIAS, type Area } from "@/types/dominio";

// Un área se "habilita" cuando tiene al menos una fuente aprobada
// (white paper RF-12: el panel solo muestra áreas con biblioteca suficiente).
export async function GET() {
  const supabase = crearClienteAdmin();
  const areas = Object.keys(SUBCATEGORIAS) as Area[];
  const habilitadas: { area: Area; fuentes_aprobadas: number }[] = [];

  for (const area of areas) {
    const { count } = await supabase
      .from("fuentes")
      .select("id", { count: "exact", head: true })
      .eq("area", area)
      .eq("aprobada", true);
    if ((count ?? 0) > 0) habilitadas.push({ area, fuentes_aprobadas: count ?? 0 });
  }

  return NextResponse.json({ areas: habilitadas });
}
