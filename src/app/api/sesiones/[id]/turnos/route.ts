import { NextResponse } from "next/server";
import { z } from "zod";
import { crearClienteServidor, crearClienteAdmin } from "@/lib/supabase/server";
import { procesarTurno } from "@/simulacion/orquestador";
import { Caso } from "@/types/dominio";

const PedidoTurno = z.object({ mensaje: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sesionId } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PedidoTurno.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "mensaje inválido" }, { status: 400 });

  const { data: sesion } = await supabase
    .from("sesiones")
    .select("*")
    .eq("id", sesionId)
    .eq("estudiante_id", user.id)
    .single();
  if (!sesion) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (sesion.estado !== "en_curso") {
    return NextResponse.json(
      { error: `La sesión está "${sesion.estado}", no se pueden enviar más turnos.` },
      { status: 409 }
    );
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
    const resultado = await procesarTurno(
      sesionId,
      caso,
      parsed.data.mensaje,
      historial ?? []
    );
    return NextResponse.json(resultado);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error procesando el turno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
