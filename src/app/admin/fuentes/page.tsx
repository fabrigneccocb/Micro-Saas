"use client";
import { useEffect, useState } from "react";

interface Fuente {
  id: string;
  area: string;
  titulo: string;
  url_o_doi: string | null;
  tipo: string;
  aprobada: boolean;
  creado_en: string;
}

const AREAS = ["clinica", "educativa", "organizacional", "forense"];

export default function AdminFuentes() {
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [area, setArea] = useState("clinica");
  const [titulo, setTitulo] = useState("");
  const [urlODoi, setUrlODoi] = useState("");
  const [tipo, setTipo] = useState("articulo");
  const [textoCompleto, setTextoCompleto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/admin/fuentes");
    const data = await res.json();
    if (res.ok) setFuentes(data.fuentes);
    else setError(data.error);
  }
  useEffect(() => {
    cargar();
  }, []);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setMensaje(null);
    try {
      const res = await fetch("/api/admin/fuentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, titulo, urlODoi: urlODoi || undefined, tipo, textoCompleto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data.error ?? data));
      setMensaje(`Fuente cargada con ${data.fragmentos} fragmentos indexados. Apruébala abajo para activarla.`);
      setTitulo("");
      setUrlODoi("");
      setTextoCompleto("");
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  async function aprobar(fuenteId: string, aprobada: boolean) {
    await fetch("/api/admin/fuentes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fuenteId, aprobada }),
    });
    cargar();
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Biblioteca de fuentes (RAG)</h1>
        <p className="text-sm text-neutral-400">
          Solo visible para psicólogo asesor / admin. Una fuente solo alimenta al generador de
          casos una vez la apruebas aquí (lista blanca cerrada, ver white paper 5.2.2).
        </p>
      </div>

      <form onSubmit={agregar} className="space-y-3 rounded border border-neutral-800 bg-panel p-4">
        <h2 className="font-medium">Cargar fuente nueva</h2>
        <div className="flex gap-3">
          <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded border border-neutral-700 bg-bg px-3 py-2">
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded border border-neutral-700 bg-bg px-3 py-2">
            <option value="manual">manual</option>
            <option value="articulo">artículo</option>
            <option value="caso_publicado">caso publicado</option>
            <option value="guia">guía</option>
          </select>
        </div>
        <input
          required
          placeholder="Título de la fuente"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-bg px-3 py-2"
        />
        <input
          placeholder="URL o DOI (opcional)"
          value={urlODoi}
          onChange={(e) => setUrlODoi(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-bg px-3 py-2"
        />
        <textarea
          required
          placeholder="Pega aquí el texto completo de la fuente"
          value={textoCompleto}
          onChange={(e) => setTextoCompleto(e.target.value)}
          rows={8}
          className="w-full rounded border border-neutral-700 bg-bg px-3 py-2"
        />
        {error && <p className="text-riesgo text-sm">{error}</p>}
        {mensaje && <p className="text-sm text-green-400">{mensaje}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="rounded bg-accent px-4 py-2 text-black font-medium disabled:opacity-50"
        >
          {cargando ? "Indexando..." : "Cargar e indexar"}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="font-medium">Fuentes existentes</h2>
        {fuentes.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded border border-neutral-800 bg-panel p-3">
            <div>
              <p className="font-medium">{f.titulo}</p>
              <p className="text-xs text-neutral-500">{f.area} · {f.tipo}</p>
            </div>
            <button
              onClick={() => aprobar(f.id, !f.aprobada)}
              className={`rounded px-3 py-1 text-sm ${f.aprobada ? "bg-green-900 text-green-300" : "bg-neutral-800 text-neutral-400"}`}
            >
              {f.aprobada ? "Aprobada" : "Aprobar"}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
