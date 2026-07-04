import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VisitaResultadoForm } from "@/components/vendedor/VisitaResultadoForm";

export default async function VisitaPage({ params }: { params: { empresaId: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: empresa } = await supabase.from("empresas").select("nombre").eq("id", params.empresaId).single();
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: ruta } = await supabase
    .from("rutas")
    .select("id")
    .eq("vendedor_id", session!.user.id)
    .eq("fecha", hoy)
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
