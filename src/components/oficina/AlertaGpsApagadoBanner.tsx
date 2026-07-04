"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

interface Alerta {
  id: string;
  vendedor_id: string;
  minutos_sin_reportar: number | null;
  resuelto: boolean;
  usuarios?: { nombre: string };
}

export function AlertaGpsApagadoBanner() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser
        .from("gps_alertas")
        .select("id, vendedor_id, minutos_sin_reportar, resuelto, usuarios(nombre)")
        .eq("resuelto", false)
        .order("timestamp", { ascending: false });
      setAlertas((data as any) ?? []);
    })();
  }, []);

  useSupabaseRealtime<Alerta>("gps_alertas:oficina", "gps_alertas", undefined, (payload) => {
    if (payload.eventType === "INSERT" && payload.new) {
      setAlertas((prev) => [payload.new as Alerta, ...prev]);
    }
  });

  async function resolver(id: string) {
    await supabaseBrowser.from("gps_alertas").update({ resuelto: true, resuelto_en: new Date().toISOString() }).eq("id", id);
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  }

  if (alertas.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {alertas.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-md border border-estado-desviado/40 bg-estado-desviado/10 px-4 py-3">
          <span className="text-sm text-estado-desviado">
            {a.usuarios?.nombre ?? "Vendedor"} sin GPS hace {a.minutos_sin_reportar ?? "?"} min
          </span>
          <button onClick={() => resolver(a.id)} className="text-xs font-medium text-estado-desviado underline">
            Marcar resuelto
          </button>
        </div>
      ))}
    </div>
  );
}
