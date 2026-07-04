"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const { error: authError } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    setCargando(false);
    if (authError) {
      setError("Credenciales inválidas. Verifica tu correo y contraseña.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <Image src="/logo.png" alt="Concaribe" width={180} height={0} style={{ height: "auto" }} priority />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Correo</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-marca-azul focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Contraseña</label>
          <div className="relative mt-1">
            <input
              type={mostrarPassword ? "text" : "password"}
              required
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-md bg-marca-azul px-4 py-2 font-medium text-white transition hover:bg-marca-azul-claro disabled:opacity-60"
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
        <p className="text-center text-xs text-slate-500">
          Las cuentas se crean por invitación de oficina. Contacta a tu administrador si no tienes acceso.
        </p>
      </form>
    </div>
  );
}
