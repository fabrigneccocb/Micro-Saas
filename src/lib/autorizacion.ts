import { crearClienteServidor } from "@/lib/supabase/server";

// Confirma que el usuario autenticado tiene rol psicologo_asesor o admin.
// Usar SIEMPRE antes de cualquier escritura en /api/admin/* — la biblioteca
// de fuentes es compartida entre todos los estudiantes, así que su escritura
// no se protege con RLS por fila (ver nota al final de 0001_init.sql).
export async function exigirAsesorOAdmin() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "No autenticado" };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (!perfil || !["psicologo_asesor", "admin"].includes(perfil.rol)) {
    return { ok: false as const, status: 403, error: "Requiere rol psicólogo_asesor o admin" };
  }
  return { ok: true as const, userId: user.id };
}
