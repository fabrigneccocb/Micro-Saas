import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ResultadoEvaluacion } from "@/types/dominio";

export default async function Informe({ params }: { params: Promise<{ id: string }> }) {
  const { id: sesionId } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("evaluaciones")
    .select("*, sesiones!inner(estudiante_id)")
    .eq("sesion_id", sesionId)
    .eq("sesiones.estudiante_id", user.id)
    .single();

  if (!data) {
    return (
      <main>
        <p className="text-neutral-400">Todavía no hay evaluación para esta sesión.</p>
      </main>
    );
  }

  const resultado = ResultadoEvaluacion.parse(data.resultado);

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Informe de evaluación</h1>
      <p className="text-3xl font-bold text-accent">{resultado.puntaje}/100</p>
      <p className="text-neutral-300">{resultado.resumen}</p>

      <div className="space-y-3">
        {resultado.por_criterio.map((c, i) => (
          <div key={i} className="rounded border border-neutral-800 bg-panel p-4">
            <div className="flex justify-between">
              <h3 className="font-medium">{c.criterio}</h3>
              <span className="text-accent">{c.puntaje}/100</span>
            </div>
            <p className="mt-1 text-sm text-neutral-400">{c.comentario}</p>
            <p className="mt-2 text-sm italic text-neutral-500">&quot;{c.cita_del_caso}&quot;</p>
          </div>
        ))}
      </div>
    </main>
  );
}
