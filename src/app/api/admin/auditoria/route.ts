import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/server";
import { exigirAsesorOAdmin } from "@/lib/autorizacion";

// Lista los casos pendientes de revisión humana por muestreo (ver
// src/rag/verificarCaso.ts). El psicólogo asesor los revisa aquí, no caso
// por caso de cada estudiante — esto es la verificación de fidelidad por
// muestreo descrita en 1.6/5.2.2, no una aprobación previa de cada caso.
export async function GET() {
  const auth = await exigirAsesorOAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("auditorias_fidelidad")
    .select("id, caso_id, fiel_a_la_fuente, notas, creado_en, casos(area, subcategoria, contenido, fuentes_citadas)")
    .is("fiel_a_la_fuente", null)
    .order("creado_en", { ascending: true })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pendientes: data });
}
