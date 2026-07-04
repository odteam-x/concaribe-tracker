import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Solo admin_oficina puede crear usuarios. A diferencia de una invitación por correo,
// aquí la propia oficina define la contraseña inicial y el usuario queda listo para
// entrar de inmediato (email_confirm: true evita el paso de confirmación por correo).
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: yo } = await supabase.from("usuarios").select("rol").eq("id", session.user.id).single();
  if (yo?.rol !== "admin_oficina") {
    return NextResponse.json({ error: "Solo admin_oficina puede crear usuarios" }, { status: 403 });
  }

  const { email, password, nombre, rol, telefono, supervisorId } = await req.json();
  if (!email || !password || !nombre || !rol) {
    return NextResponse.json({ error: "Faltan campos requeridos (email, password, nombre, rol)" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol, telefono: telefono || "", supervisor_id: supervisorId || "" },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // trg_nuevo_usuario (0010_auto_provision_usuarios.sql) crea la fila en public.usuarios
  // automáticamente a partir de estos metadatos.
  return NextResponse.json({ ok: true, userId: data.user.id });
}
