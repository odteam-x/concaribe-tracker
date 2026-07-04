"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { MensajeBubble } from "./MensajeBubble";
import { ChatInput } from "./ChatInput";

interface Mensaje {
  id: string;
  emisor_id: string;
  contenido: string;
  timestamp: string;
}

/** Chat directo entre dos usuarios (oficina-vendedor). Realtime mientras la ventana está abierta. */
export function ChatWindow({ miId, otroId }: { miId: string; otroId: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser
        .from("mensajes")
        .select("id, emisor_id, contenido, timestamp")
        .or(`and(emisor_id.eq.${miId},receptor_id.eq.${otroId}),and(emisor_id.eq.${otroId},receptor_id.eq.${miId})`)
        .order("timestamp", { ascending: true })
        .limit(200);
      setMensajes(data ?? []);
    })();
  }, [miId, otroId]);

  useSupabaseRealtime<Mensaje>("mensajes:chat", "mensajes", undefined, (payload) => {
    const nuevo = payload.new as Mensaje | undefined;
    if (!nuevo) return;
    const esDeEstaConversacion =
      (nuevo.emisor_id === miId || nuevo.emisor_id === otroId) &&
      ((nuevo as any).receptor_id === miId || (nuevo as any).receptor_id === otroId);
    if (esDeEstaConversacion) setMensajes((prev) => [...prev, nuevo]);
  });

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  async function enviar(contenido: string) {
    await supabaseBrowser.from("mensajes").insert({ emisor_id: miId, receptor_id: otroId, contenido });
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensajes.map((m) => (
          <MensajeBubble key={m.id} contenido={m.contenido} esPropio={m.emisor_id === miId} timestamp={m.timestamp} />
        ))}
        <div ref={finRef} />
      </div>
      <ChatInput onEnviar={enviar} />
    </div>
  );
}
