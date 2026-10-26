import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sesionId } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("evaluaciones")
    .select("*, sesiones!inner(estudiante_id)")
    .eq("sesion_id", sesionId)
    .eq("sesiones.estudiante_id", user.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  return NextResponse.json({ evaluacion: data });
}
