import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CerrarSesionButton } from "@/components/shared/CerrarSesionButton";
import { AutoRefresh } from "@/components/shared/AutoRefresh";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/mapa-vivo", label: "Mapa en vivo" },
  { href: "/rutas", label: "Rutas (solo lectura)" },
  { href: "/vendedores", label: "Vendedores" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/empresas", label: "Clientes" },
  { href: "/ubicaciones", label: "Ubicaciones" },
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

  if (usuario?.rol !== "admin_oficina") {
    redirect("/inicio");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-marca-azul-oscuro text-white">
        <div className="border-b border-white/10 bg-white px-6 py-4">
          <Image src="/logo.png" alt="Concaribe" width={160} height={0} style={{ height: "auto" }} priority />
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 px-6 py-4">
          <p className="mb-2 text-xs text-white/60">{usuario?.nombre} · oficina</p>
          <CerrarSesionButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <AutoRefresh />
        {children}
      </main>
    </div>
  );
}
