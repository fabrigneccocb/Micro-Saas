"use client";
import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";

export default function SeleccionArea({ params }: { params: Promise<{ area: string }> }) {
  const { area } = usePromise(params);
  const router = useRouter();
  const [subcategorias, setSubcategorias] = useState<string[]>([]);
  const [subcategoria, setSubcategoria] = useState("");
  const [modo, setModo] = useState<"predeterminado" | "libre">("predeterminado");
  const [variables, setVariables] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/areas/${area}/subcategorias`)
      .then((r) => r.json())
      .then((d) => {
        setSubcategorias(d.subcategorias ?? []);
        if (d.subcategorias?.[0]) setSubcategoria(d.subcategorias[0]);
      });
  }, [area]);

  async function empezar() {
    setCargando(true);
    setError(null);
    try {
      const resCaso = await fetch("/api/casos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          subcategoria,
          modo,
          variablesLibres: modo === "libre" ? variables : undefined,
        }),
      });
      const dataCaso = await resCaso.json();
      if (!resCaso.ok) throw new Error(dataCaso.error ?? "No se pudo generar el caso");

      const resSesion = await fetch("/api/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casoId: dataCaso.caso.id }),
      });
      const dataSesion = await resSesion.json();
      if (!resSesion.ok) throw new Error(dataSesion.error ?? "No se pudo crear la sesión");

      router.push(`/sesion/${dataSesion.sesion.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setCargando(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold capitalize">Psicología {area}</h1>

      <div className="space-y-2">
        <label className="block text-sm text-neutral-400">Subcategoría</label>
        <select
          value={subcategoria}
          onChange={(e) => setSubcategoria(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-panel px-3 py-2"
        >
          {subcategorias.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-neutral-400">Modo</label>
        <div className="flex gap-3">
          <button
            onClick={() => setModo("predeterminado")}
            className={`flex-1 rounded border px-3 py-2 ${modo === "predeterminado" ? "border-accent bg-accent/10" : "border-neutral-700"}`}
          >
            Predeterminado
          </button>
          <button
            onClick={() => setModo("libre")}
            className={`flex-1 rounded border px-3 py-2 ${modo === "libre" ? "border-accent bg-accent/10" : "border-neutral-700"}`}
          >
            Libre
          </button>
        </div>
      </div>

      {modo === "libre" && (
        <div className="space-y-2">
          <label className="block text-sm text-neutral-400">
            Describe qué variables específicas quieres (ej. &quot;pareja con un hijo pequeño y problemas económicos&quot;)
          </label>
          <textarea
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            rows={3}
            className="w-full rounded border border-neutral-700 bg-panel px-3 py-2"
          />
        </div>
      )}

      {error && <p className="text-riesgo text-sm">{error}</p>}

      <button
        onClick={empezar}
        disabled={cargando || !subcategoria}
        className="w-full rounded bg-accent px-4 py-2 text-black font-medium disabled:opacity-50"
      >
        {cargando ? "Preparando el caso..." : "Empezar entrevista"}
      </button>
    </main>
  );
}
