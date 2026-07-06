import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UbicacionReferenciaForm } from "@/components/oficina/UbicacionReferenciaForm";

export default async function EditarUbicacionPage({ params }: { params: { ubicacionId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: ubicacion } = await supabase
    .from("ubicaciones_referencia")
    .select("id, nombre, categoria, direccion, notas, lat, lng")
    .eq("id", params.ubicacionId)
    .single();

  if (!ubicacion) return <p className="text-slate-500">Ubicación no encontrada.</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Editar ubicación</h1>
      <UbicacionReferenciaForm ubicacionExistente={ubicacion} />
    </div>
  );
}
