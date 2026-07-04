import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Solo admin_oficina puede invitar usuarios. La sesión del que llama se valida con
// el cliente normal (respeta RLS); la invitación en sí requiere el Admin API,
// que solo el cliente con service_role puede usar.
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: yo } = await supabase.from("usuarios").select("rol").eq("id", session.user.id).single();
  if (yo?.rol !== "admin_oficina") {
    return NextResponse.json({ error: "Solo admin_oficina puede invitar usuarios" }, { status: 403 });
  }

  const { email, nombre, rol, telefono, supervisorId } = await req.json();
  if (!email || !nombre || !rol) {
    return NextResponse.json({ error: "Faltan campos requeridos (email, nombre, rol)" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nombre, rol, telefono: telefono || "", supervisor_id: supervisorId || "" },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // trg_nuevo_usuario (0010_auto_provision_usuarios.sql) crea la fila en public.usuarios
  // automáticamente a partir de estos metadatos.
  return NextResponse.json({ ok: true, userId: data.user.id });
}
