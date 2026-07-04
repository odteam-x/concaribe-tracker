"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/** Wrapper genérico de suscripción a un canal de Supabase Realtime (postgres_changes). */
export function useSupabaseRealtime<T extends { [key: string]: any } = { [key: string]: any }>(
  channelName: string,
  table: string,
  filter: string | undefined,
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void
) {
  useEffect(() => {
    const channel = supabaseBrowser
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload) => onChange(payload as RealtimePostgresChangesPayload<T>)
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, filter]);
}
