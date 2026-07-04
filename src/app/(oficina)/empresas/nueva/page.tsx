import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmpresaCatalogoAdminForm } from "@/components/oficina/EmpresaCatalogoAdminForm";

export default async function NuevaEmpresaPage() {
  const supabase = createSupabaseServerClient();
  const { data: vendedores } = await supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor").order("nombre");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Nueva empresa</h1>
      <EmpresaCatalogoAdminForm vendedores={vendedores ?? []} />
    </div>
  );
}
