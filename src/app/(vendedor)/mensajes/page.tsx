import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function MensajesVendedorPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: yo } = await supabase.from("usuarios").select("supervisor_id").eq("id", session!.user.id).single();

  let otroId = yo?.supervisor_id ?? null;
  if (!otroId) {
    const { data: admin } = await supabase.from("usuarios").select("id").eq("rol", "admin_oficina").limit(1).maybeSingle();
    otroId = admin?.id ?? null;
  }

  if (!otroId) return <p className="text-slate-500">Aún no hay un contacto de oficina asignado.</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Mensajes con oficina</h1>
      <ChatWindow miId={session!.user.id} otroId={otroId} />
    </div>
  );
}
