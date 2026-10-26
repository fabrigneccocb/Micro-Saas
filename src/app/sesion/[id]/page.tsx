"use client";
import { useEffect, useRef, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

interface Turno {
  autor: "estudiante" | "consultante" | "sistema";
  contenido: string;
  orden: number;
}

export default function Sesion({ params }: { params: Promise<{ id: string }> }) {
  const { id: sesionId } = usePromise(params);
  const router = useRouter();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pausada, setPausada] = useState(false);
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [formulacion, setFormulacion] = useState("");
  const [cie11, setCie11] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = crearClienteNavegador();
    (async () => {
      const { data: sesion } = await supabase
        .from("sesiones")
        .select("estado")
        .eq("id", sesionId)
        .single();
      if (sesion?.estado === "pausada_crisis") setPausada(true);

      const { data } = await supabase
        .from("turnos")
        .select("autor, contenido, orden")
        .eq("sesion_id", sesionId)
        .order("orden", { ascending: true });
      setTurnos((data as Turno[]) ?? []);
    })();
  }, [sesionId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnos]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!mensaje.trim() || pausada) return;
    setEnviando(true);
    setError(null);
    const textoEnviado = mensaje;
    setMensaje("");
    setTurnos((t) => [...t, { autor: "estudiante", contenido: textoEnviado, orden: t.length }]);

    try {
      const res = await fetch(`/api/sesiones/${sesionId}/turnos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: textoEnviado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error enviando el mensaje");
      setTurnos((t) => [
        ...t,
        { autor: data.pausadaPorCrisis ? "sistema" : "consultante", contenido: data.respuesta, orden: t.length },
      ]);
      if (data.pausadaPorCrisis) setPausada(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setEnviando(false);
    }
  }

  async function cerrarSesion(e: React.FormEvent) {
    e.preventDefault();
    setCerrando(true);
    setError(null);
    try {
      const res = await fetch(`/api/sesiones/${sesionId}/cierre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formulacion, cie11: cie11 || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error cerrando la sesión");
      router.push(`/sesion/${sesionId}/informe`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setCerrando(false);
    }
  }

  return (
    <main className="space-y-4">
      <div className="space-y-3 rounded border border-neutral-800 bg-panel p-4 max-h-[60vh] overflow-y-auto">
        {turnos.length === 0 && (
          <p className="text-neutral-500 text-sm">Empieza la entrevista escribiendo abajo.</p>
        )}
        {turnos.map((t, i) => (
          <div
            key={i}
            className={
              t.autor === "estudiante"
                ? "text-right"
                : t.autor === "sistema"
                  ? "text-center"
                  : "text-left"
            }
          >
            <span
              className={`inline-block rounded px-3 py-2 max-w-[85%] ${
                t.autor === "estudiante"
                  ? "bg-accent/20"
                  : t.autor === "sistema"
                    ? "bg-riesgo/20 text-riesgo"
                    : "bg-neutral-800"
              }`}
            >
              {t.contenido}
            </span>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      {error && <p className="text-riesgo text-sm">{error}</p>}

      {!pausada && !mostrarCierre && (
        <form onSubmit={enviar} className="flex gap-2">
          <input
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe tu mensaje..."
            disabled={enviando}
            className="flex-1 rounded border border-neutral-700 bg-panel px-3 py-2"
          />
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-accent px-4 py-2 text-black font-medium disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      )}

      {!pausada && !mostrarCierre && (
        <button
          onClick={() => setMostrarCierre(true)}
          className="w-full rounded border border-neutral-700 px-4 py-2 text-sm"
        >
          Terminar entrevista y dar mi formulación
        </button>
      )}

      {mostrarCierre && (
        <form onSubmit={cerrarSesion} className="space-y-3 rounded border border-neutral-800 bg-panel p-4">
          <h2 className="font-medium">Tu formulación de cierre</h2>
          <textarea
            required
            value={formulacion}
            onChange={(e) => setFormulacion(e.target.value)}
            rows={4}
            placeholder="¿Qué concluyes de este caso?"
            className="w-full rounded border border-neutral-700 bg-bg px-3 py-2"
          />
          <input
            value={cie11}
            onChange={(e) => setCie11(e.target.value)}
            placeholder="Código CIE-11 (opcional)"
            className="w-full rounded border border-neutral-700 bg-bg px-3 py-2"
          />
          <button
            type="submit"
            disabled={cerrando}
            className="w-full rounded bg-accent px-4 py-2 text-black font-medium disabled:opacity-50"
          >
            {cerrando ? "Evaluando..." : "Enviar y ver evaluación"}
          </button>
        </form>
      )}
    </main>
  );
}
