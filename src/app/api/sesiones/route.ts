import { NextResponse } from "next/server";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/server";

const PedidoSesion = z.object({ casoId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PedidoSesion.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "casoId inválido" }, { status: 400 });

  const { data, error } = await supabase
    .from("sesiones")
    .insert({ estudiante_id: user.id, caso_id: parsed.data.casoId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sesion: data });
}
