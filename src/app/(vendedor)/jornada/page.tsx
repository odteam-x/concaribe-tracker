import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckInOutButton } from "@/components/vendedor/CheckInOutButton";

export default async function JornadaPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-marca-azul">Jornada</h1>
      <CheckInOutButton vendedorId={session!.user.id} />
    </div>
  );
}
