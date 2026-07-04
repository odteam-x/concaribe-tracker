import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmpresaCatalogoAdminForm } from "@/components/oficina/EmpresaCatalogoAdminForm";

function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}

export default async function EditarEmpresaPage({ params }: { params: { empresaId: string } }) {
  const supabase = createSupabaseServerClient();
  const [{ data: vendedores }, { data: empresa }] = await Promise.all([
    supabase.from("usuarios").select("id, nombre").eq("rol", "vendedor").order("nombre"),
    supabase
      .from("empresas")
      .select("id, vendedor_id, nombre, direccion, telefono, categoria, notas, ubicacion")
      .eq("id", params.empresaId)
      .single(),
  ]);

  if (!empresa) return <p className="text-slate-500">Empresa no encontrada.</p>;

  const [lng, lat] = parsePunto(empresa.ubicacion as unknown as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Editar empresa</h1>
      <EmpresaCatalogoAdminForm vendedores={vendedores ?? []} empresaExistente={{ ...empresa, lat, lng }} />
    </div>
  );
}
