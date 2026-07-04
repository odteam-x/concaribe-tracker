"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function CerrarSesionButton({ className }: { className?: string }) {
  const router = useRouter();

  async function handleClick() {
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button onClick={handleClick} className={className ?? "text-sm font-medium text-white/70 hover:text-white"}>
      Cerrar sesión
    </button>
  );
}
