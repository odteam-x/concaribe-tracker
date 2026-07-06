import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function ChatOficinaPage({ params }: { params: { vendedorId: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data: vendedor } = await supabase.from("usuarios").select("nombre").eq("id", params.vendedorId).single();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Chat con {vendedor?.nombre}</h1>
      <ChatWindow miId={session!.user.id} vendedorId={params.vendedorId} receptorFallback={params.vendedorId} />
    </div>
  );
}
