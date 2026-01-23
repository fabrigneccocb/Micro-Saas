import { createClient } from '@supabase/supabase-js';

// 1. Leemos la URL y la KEY de las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. Verificamos que existan (para evitar el error que te salió)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase (URL o KEY).');
}

// 3. Exportamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);