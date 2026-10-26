// Cliente Supabase para código de servidor (API routes, server components).
// Usa cookies de la petición para saber quién es el usuario (RLS se aplica con su sesión).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() llamado desde un Server Component sin poder escribir cookies —
            // se ignora porque el middleware ya refresca la sesión.
          }
        },
      },
    }
  );
}

// Cliente con la service role key: SOLO para rutas de servidor que necesitan
// saltarse RLS a propósito (ej. escribir la biblioteca de fuentes compartida).
// Nunca importar esto en código que corra en el navegador.
import { createClient } from "@supabase/supabase-js";

export function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
