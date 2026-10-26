import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/areas");

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Simulador de casos de psicología</h1>
      <p className="text-neutral-400">
        Practica entrevistas con un paciente simulado por IA y recibe una evaluación
        citando el caso. MVP: solo área clínica.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-accent px-4 py-2 text-black font-medium">
          Entrar
        </Link>
        <Link href="/registro" className="rounded border border-neutral-700 px-4 py-2">
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
