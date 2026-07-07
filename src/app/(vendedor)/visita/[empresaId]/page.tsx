import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VisitaResultadoForm } from "@/components/vendedor/VisitaResultadoForm";

export default async function VisitaPage({ params }: { params: { empresaId: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: empresa } = await supabase.from("empresas").select("nombre").eq("id", params.empresaId).single();
  const hoy = new Date().toISOString().slice(0, 10);
  // Toma la ruta EN CURSO de hoy (puede coexistir con rutas ya finalizadas/canceladas
  // del mismo día; sin el filtro de estado, maybeSingle fallaría con varias filas y la
  // visita quedaría sin asociar a la ruta → no contaría en el progreso).
  const { data: ruta } = await supabase
    .from("rutas")
    .select("id")
    .eq("vendedor_id", session!.user.id)
    .eq("fecha", hoy)
    .eq("estado", "en_curso")
    .maybeSingle();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Visita: {empresa?.nombre}</h1>
      <VisitaResultadoForm
        empresaId={params.empresaId}
        rutaId={ruta?.id ?? null}
        vendedorId={session!.user.id}
        llegadaAutomatica={false}
      />
    </div>
  );
}
