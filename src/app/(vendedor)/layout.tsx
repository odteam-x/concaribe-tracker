import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SyncStatusIndicator } from "@/components/vendedor/SyncStatusIndicator";
import { SolicitarUbicacionBanner } from "@/components/shared/SolicitarUbicacionBanner";
import { CerrarSesionButton } from "@/components/shared/CerrarSesionButton";
import { BackgroundTrackingController } from "@/components/native/BackgroundTrackingController";
import { PosicionReporter } from "@/components/vendedor/PosicionReporter";

const NAV = [
  { href: "/inicio", label: "Inicio" },
  { href: "/mis-empresas", label: "Mis Empresas" },
  { href: "/ruta/iniciar", label: "Ruta" },
  { href: "/historial", label: "Historial" },
  { href: "/mensajes", label: "Mensajes" },
];

export default async function VendedorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: usuario } = await supabase.from("usuarios").select("rol").eq("id", session.user.id).single();
  if (usuario?.rol !== "vendedor") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Image src="/logo.png" alt="Concaribe" width={120} height={0} style={{ height: "auto" }} priority />
        <div className="flex items-center gap-3">
          <SyncStatusIndicator />
          <CerrarSesionButton className="text-xs font-medium text-slate-500 hover:text-marca-azul" />
        </div>
      </header>
      <BackgroundTrackingController />
      <PosicionReporter />
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <SolicitarUbicacionBanner />
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-slate-200 bg-white py-2">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-marca-azul">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
