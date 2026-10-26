"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) return setError(error.message);
    router.push("/areas");
    router.refresh();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <form onSubmit={entrar} className="space-y-3">
        <input
          type="email"
          required
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-panel px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-panel px-3 py-2"
        />
        {error && <p className="text-riesgo text-sm">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded bg-accent px-4 py-2 text-black font-medium disabled:opacity-50"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="text-sm text-neutral-400">
        ¿No tienes cuenta? <Link href="/registro" className="underline">Regístrate</Link>
      </p>
    </main>
  );
}
