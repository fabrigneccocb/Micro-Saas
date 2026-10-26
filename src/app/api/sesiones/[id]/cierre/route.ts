import { NextResponse } from "next/server";
import { z } from "zod";
import { crearClienteServidor, crearClienteAdmin } from "@/lib/supabase/server";
import { evaluarSesion } from "@/simulacion/evaluar";
import { Caso } from "@/types/dominio";

const PedidoCierre = z.object({
  formulacion: z.string().min(1).max(3000),
  cie11: z.string().max(50).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sesionId } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PedidoCierre.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "formulación inválida" }, { status: 400 });

  const { data: sesion } = await supabase
    .from("sesiones")
    .select("*")
    .eq("id", sesionId)
    .eq("estudiante_id", user.id)
    .single();
  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (sesion.estado === "cerrada") {
    return NextResponse.json({ error: "Esta sesión ya está cerrada" }, { status: 409 });
  }

  const admin = crearClienteAdmin();
  const { data: filaCaso } = await admin.from("casos").select("*").eq("id", sesion.caso_id).single();
  if (!filaCaso) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  const caso = Caso.parse(filaCaso);

  const { data: historial } = await supabase
    .from("turnos")
    .select("autor, contenido")
    .eq("sesion_id", sesionId)
    .order("orden", { ascending: true });

  try {
    const resultado = await evaluarSesion(
      caso,
      historial ?? [],
      parsed.data.formulacion,
      parsed.data.cie11
    );

    await supabase.from("evaluaciones").insert({
      sesion_id: sesionId,
      formulacion_estudiante: parsed.data.formulacion,
      cie11_estudiante: parsed.data.cie11 ?? null,
      resultado,
      modelo_evaluador: process.env.MODEL_EVALUADOR ?? "claude-sonnet-5-5",
    });
    await supabase
      .from("sesiones")
      .update({ estado: "cerrada", cerrada_en: new Date().toISOString() })
      .eq("id", sesionId);

    return NextResponse.json({ resultado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error evaluando la sesión";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
