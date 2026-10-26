"use client";
import { useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    setCargando(false);
    if (error) return setError(error.message);
    setListo(true);
  }

  if (listo) {
    return (
      <main className="space-y-4">
        <h1 className="text-xl font-semibold">Revisa tu correo</h1>
        <p className="text-neutral-400">
          Te enviamos un enlace de confirmación a {email}. Confírmalo y luego{" "}
          <Link href="/login" className="underline">entra aquí</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Crear cuenta</h1>
      <form onSubmit={registrar} className="space-y-3">
        <input
          required
          placeholder="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-panel px-3 py-2"
        />
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
          minLength={6}
          placeholder="contraseña (mínimo 6 caracteres)"
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
          {cargando ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
    </main>
  );
}
