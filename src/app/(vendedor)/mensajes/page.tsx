import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default async function MensajesVendedorPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Cualquier admin sirve como receptor del insert; todos los de oficina ven el hilo.
  const { data: admin } = await supabase
    .from("usuarios")
    .select("id")
    .eq("rol", "admin_oficina")
    .limit(1)
    .maybeSingle();

  if (!admin) return <p className="text-slate-500">Aún no hay una cuenta de oficina creada.</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Chat con oficina</h1>
      <ChatWindow miId={session!.user.id} vendedorId={session!.user.id} receptorFallback={admin.id} />
    </div>
  );
}
