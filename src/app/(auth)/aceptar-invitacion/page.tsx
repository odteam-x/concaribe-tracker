"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AceptarInvitacionPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // El cliente de Supabase detecta automáticamente el token de invitación en el
    // fragmento de la URL (#access_token=...) y establece una sesión temporal.
    // onAuthStateChange nos avisa apenas queda lista.
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") setListo(true);
    });
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) setListo(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
    setGuardando(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (!listo) {
    return (
      <p className="text-center text-sm text-slate-500">
        Verificando invitación... si tardó mucho, revisa que hayas abierto el link más reciente que te
        llegó por correo.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <Image src="/logo.png" alt="Concaribe" width={180} height={0} style={{ height: "auto" }} priority />
      </div>
      <h1 className="mb-4 text-center text-lg font-semibold text-marca-azul">Crea tu contraseña</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
          <div className="relative mt-1">
            <input
              type={mostrarPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 pr-16 focus:border-marca-azul focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setMostrarPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-marca-azul"
            >
              {mostrarPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Confirmar contraseña</label>
          <input
            type={mostrarPassword ? "text" : "password"}
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-marca-azul focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-md bg-marca-azul px-4 py-2 font-medium text-white transition hover:bg-marca-azul-claro disabled:opacity-60"
        >
          {guardando ? "Guardando..." : "Guardar y entrar"}
        </button>
      </form>
    </div>
  );
}
