import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// SOLO server-side (Route Handlers). Usa SUPABASE_SERVICE_ROLE_KEY, que bypasea RLS
// y puede invitar/crear usuarios vía Admin API — nunca importar desde un componente
// "use client" ni exponer al bundle del navegador.
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
