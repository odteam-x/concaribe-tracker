import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmpresaCatalogoAdminForm } from "@/components/oficina/EmpresaCatalogoAdminForm";

export default async function EditarEmpresaPage({ params }: { params: { empresaId: string } }) {
  const supabase = createSupabaseServerClient();
  const [{ data: vendedores }, { data: empresa }] = await Promise.all([
    supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor").order("nombre"),
    supabase
      .from("empresas")
      .select("id, vendedor_id, nombre, direccion, telefono, categoria, notas, lat, lng")
      .eq("id", params.empresaId)
      .single(),
  ]);

  if (!empresa) return <p className="text-slate-500">Empresa no encontrada.</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Editar empresa</h1>
      <EmpresaCatalogoAdminForm vendedores={vendedores ?? []} empresaExistente={empresa} />
    </div>
  );
}
