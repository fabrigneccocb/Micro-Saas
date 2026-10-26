import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteAdmin } from "@/lib/supabase/server";
import { SUBCATEGORIAS, type Area } from "@/types/dominio";

const NOMBRES: Record<Area, string> = {
  clinica: "Clínica",
  educativa: "Educativa",
  organizacional: "Organizacional",
  forense: "Forense",
};

export default async function Areas() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = crearClienteAdmin();
  const areas = Object.keys(SUBCATEGORIAS) as Area[];
  const habilitadas: Area[] = [];
  for (const area of areas) {
    const { count } = await admin
      .from("fuentes")
      .select("id", { count: "exact", head: true })
      .eq("area", area)
      .eq("aprobada", true);
    if ((count ?? 0) > 0) habilitadas.push(area);
  }

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Elige un área</h1>
      {habilitadas.length === 0 && (
        <p className="text-neutral-400">
          Todavía no hay ningún área habilitada — necesita al menos una fuente aprobada.
          Si eres el psicólogo asesor, ve a <Link href="/admin/fuentes" className="underline">/admin/fuentes</Link>.
        </p>
      )}
      <div className="grid gap-3">
        {areas.map((area) => {
          const habilitada = habilitadas.includes(area);
          return habilitada ? (
            <Link
              key={area}
              href={`/areas/${area}`}
              className="rounded border border-neutral-700 bg-panel p-4 hover:border-accent"
            >
              {NOMBRES[area]}
            </Link>
          ) : (
            <div
              key={area}
              className="rounded border border-neutral-800 p-4 text-neutral-600"
              title="Sin fuentes aprobadas todavía"
            >
              {NOMBRES[area]} (no disponible)
            </div>
          );
        })}
      </div>
    </main>
  );
}
