import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  if (usuario?.rol === "admin_oficina" || usuario?.rol === "supervisor") {
    redirect("/dashboard");
  }
  redirect("/inicio");
}
