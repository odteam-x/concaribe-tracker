"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function PerfilPage() {
  const router = useRouter();
  const { soportado, suscrito, suscribir } = usePushSubscription();
  const [usuario, setUsuario] = useState<{ nombre: string; email: string; telefono: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser();
      if (!user) return;
      const { data } = await supabaseBrowser.from("usuarios").select("nombre, email, telefono").eq("id", user.id).single();
      setUsuario(data);
    })();
  }, []);

  async function cerrarSesion() {
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-marca-azul">Perfil</h1>
      {usuario && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium">{usuario.nombre}</p>
          <p className="text-slate-500">{usuario.email}</p>
          <p className="text-slate-500">{usuario.telefono ?? "sin teléfono"}</p>
        </div>
      )}
      {soportado && !suscrito && (
        <button onClick={suscribir} className="w-full rounded-md border border-marca-azul px-4 py-3 font-medium text-marca-azul">
          Activar notificaciones
        </button>
      )}
      <button onClick={cerrarSesion} className="w-full rounded-md border border-red-300 px-4 py-3 font-medium text-red-600">
        Cerrar sesión
      </button>
    </div>
  );
}
