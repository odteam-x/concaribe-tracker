"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { MensajeBubble } from "./MensajeBubble";
import { ChatInput } from "./ChatInput";

interface Mensaje {
  id: string;
  emisor_id: string;
  receptor_id: string;
  contenido: string;
  timestamp: string;
}

/**
 * Chat vendedor ↔ oficina. El hilo se identifica por el VENDEDOR (no por el par
 * exacto emisor/receptor): cualquier admin de oficina ve y responde la misma
 * conversación, así el vendedor "habla con la oficina" y no con una persona fija.
 *
 * - miId: usuario autenticado (vendedor o admin)
 * - vendedorId: dueño del hilo
 * - receptorFallback: a quién dirigir el insert cuando escribe el vendedor
 *   (cualquier admin sirve; el resto de admins lo ve por la política de oficina).
 */
export function ChatWindow({
  miId,
  vendedorId,
  receptorFallback,
}: {
  miId: string;
  vendedorId: string;
  receptorFallback: string;
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser
        .from("mensajes")
        .select("id, emisor_id, receptor_id, contenido, timestamp")
        .or(`emisor_id.eq.${vendedorId},receptor_id.eq.${vendedorId}`)
        .order("timestamp", { ascending: true })
        .limit(200);
      setMensajes((data as Mensaje[]) ?? []);
    })();
  }, [vendedorId]);

  useSupabaseRealtime<Mensaje>("mensajes:chat", "mensajes", undefined, (payload) => {
    const nuevo = payload.new as Mensaje | undefined;
    if (!nuevo) return;
    const esDeEsteHilo = nuevo.emisor_id === vendedorId || nuevo.receptor_id === vendedorId;
    if (esDeEsteHilo) {
      setMensajes((prev) => (prev.some((m) => m.id === nuevo.id) ? prev : [...prev, nuevo]));
    }
  });

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  async function enviar(contenido: string) {
    const receptor = miId === vendedorId ? receptorFallback : vendedorId;
    const { data } = await supabaseBrowser
      .from("mensajes")
      .insert({ emisor_id: miId, receptor_id: receptor, contenido })
      .select("id, emisor_id, receptor_id, contenido, timestamp")
      .single();
    // Eco local inmediato (el realtime lo deduplica por id si también llega por ahí)
    if (data) setMensajes((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Mensaje]));
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensajes.map((m) => (
          <MensajeBubble
            key={m.id}
            contenido={m.contenido}
            esPropio={miId === vendedorId ? m.emisor_id === vendedorId : m.emisor_id !== vendedorId}
            timestamp={m.timestamp}
          />
        ))}
        <div ref={finRef} />
      </div>
      <ChatInput onEnviar={enviar} />
    </div>
  );
}
