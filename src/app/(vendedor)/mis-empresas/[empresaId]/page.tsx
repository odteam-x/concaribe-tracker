import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmpresaCatalogoForm } from "@/components/vendedor/EmpresaCatalogoForm";

function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}

export default async function EditarEmpresaVendedorPage({ params }: { params: { empresaId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nombre, direccion, telefono, categoria, notas, ubicacion")
    .eq("id", params.empresaId)
    .single();

  if (!empresa) return <p className="text-slate-500">Empresa no encontrada.</p>;

  const [lng, lat] = parsePunto(empresa.ubicacion as unknown as string);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Editar empresa</h1>
      <EmpresaCatalogoForm empresaExistente={{ ...empresa, lat, lng }} />
    </div>
  );
}
