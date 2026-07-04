import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/mapa-vivo", label: "Mapa en vivo" },
  { href: "/rutas", label: "Rutas (solo lectura)" },
  { href: "/vendedores", label: "Vendedores" },
  { href: "/usuarios", label: "Usuarios", soloAdmin: true },
  { href: "/empresas", label: "Empresas" },
  { href: "/visitas", label: "Visitas" },
  { href: "/desvios", label: "Desvíos" },
  { href: "/metricas", label: "Métricas" },
  { href: "/heatmap", label: "Heatmap" },
  { href: "/reportes", label: "Reportes" },
  { href: "/alertas", label: "Alertas" },
];

export default async function OficinaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: usuario } = await supabase.from("usuarios").select("rol, nombre").eq("id", session.user.id).single();

  if (usuario?.rol !== "admin_oficina" && usuario?.rol !== "supervisor") {
    redirect("/inicio");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-marca-azul-oscuro text-white">
        <div className="border-b border-white/10 px-6 py-5 text-lg font-semibold">Concaribe Oficina</div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.filter((item) => !item.soloAdmin || usuario?.rol === "admin_oficina").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 px-6 py-4 text-xs text-white/60">
          {usuario?.nombre} · {usuario?.rol}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
    </div>
  );
}
