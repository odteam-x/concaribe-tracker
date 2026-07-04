import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Guarda la suscripción Web Push (VAPID) del usuario autenticado en "dispositivos".
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const subscription = await req.json();
  const { endpoint, keys } = subscription as { endpoint: string; keys: { p256dh: string; auth: string } };

  const { error } = await supabase.from("dispositivos").upsert(
    {
      usuario_id: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: req.headers.get("user-agent") ?? null,
      activo: true,
      ultima_actividad: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
