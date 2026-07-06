import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InvitarUsuarioForm } from "@/components/oficina/InvitarUsuarioForm";
import { TablaUsuarios } from "@/components/oficina/TablaUsuarios";

export default async function UsuariosPage() {
  const supabase = createSupabaseServerClient();

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol, activo")
    .order("nombre");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Usuarios</h1>
      <InvitarUsuarioForm />
      <TablaUsuarios usuarios={usuarios ?? []} />
    </div>
  );
}
