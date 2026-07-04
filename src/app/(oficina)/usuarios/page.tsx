import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InvitarUsuarioForm } from "@/components/oficina/InvitarUsuarioForm";
import { TablaUsuarios } from "@/components/oficina/TablaUsuarios";

// Solo admin_oficina gestiona usuarios (supervisor solo ve seguimiento de su equipo).
export default async function UsuariosPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data: yo } = await supabase.from("usuarios").select("rol").eq("id", session!.user.id).single();
  if (yo?.rol !== "admin_oficina") redirect("/dashboard");

  const [{ data: usuarios }, { data: supervisores }] = await Promise.all([
    supabase.from("usuarios").select("id, nombre, email, rol, supervisor_id, activo").order("nombre"),
    supabase.from("usuarios").select("id, nombre").eq("rol", "supervisor").order("nombre"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Usuarios</h1>
      <InvitarUsuarioForm supervisores={supervisores ?? []} />
      <TablaUsuarios usuarios={usuarios ?? []} supervisores={supervisores ?? []} />
    </div>
  );
}
