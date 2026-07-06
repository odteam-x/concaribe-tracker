import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UbicacionReferenciaForm } from "@/components/oficina/UbicacionReferenciaForm";

function parsePunto(valor: string): [number, number] {
  const match = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(valor);
  if (!match) return [0, 0];
  return [parseFloat(match[1]), parseFloat(match[2])];
}

export default async function EditarUbicacionPage({ params }: { params: { ubicacionId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: ubicacion } = await supabase
    .from("ubicaciones_referencia")
    .select("id, nombre, categoria, direccion, notas, ubicacion")
    .eq("id", params.ubicacionId)
    .single();

  if (!ubicacion) return <p className="text-slate-500">Ubicación no encontrada.</p>;

  const [lng, lat] = parsePunto(ubicacion.ubicacion as unknown as string);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Editar ubicación</h1>
      <UbicacionReferenciaForm ubicacionExistente={{ ...ubicacion, lat, lng }} />
    </div>
  );
}
