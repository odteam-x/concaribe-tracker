import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmpresaCatalogoForm } from "@/components/vendedor/EmpresaCatalogoForm";

export default async function EditarEmpresaVendedorPage({ params }: { params: { empresaId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nombre, direccion, telefono, categoria, notas")
    .eq("id", params.empresaId)
    .single();

  if (!empresa) return <p className="text-slate-500">Empresa no encontrada.</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Editar empresa</h1>
      <EmpresaCatalogoForm empresaExistente={empresa} />
    </div>
  );
}
