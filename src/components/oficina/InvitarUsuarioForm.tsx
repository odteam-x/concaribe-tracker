"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "vendedor", label: "Vendedor" },
  { value: "admin_oficina", label: "Admin oficina" },
];

export function InvitarUsuarioForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("vendedor");
  const [telefono, setTelefono] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);

    const res = await fetch("/api/usuarios/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nombre, rol, telefono }),
    });

    setEnviando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error ?? "No se pudo crear el usuario." });
      return;
    }

    setMensaje({ tipo: "ok", texto: `Usuario ${email} creado. Ya puede entrar con la contraseña que definiste.` });
    setEmail("");
    setPassword("");
    setNombre("");
    setTelefono("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 grid max-w-2xl grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="col-span-2">
        <h2 className="text-lg font-medium text-slate-700">Crear nuevo usuario</h2>
        <p className="text-xs text-slate-500">
          Tú defines la contraseña directamente — no se envía ningún correo. Comparte el correo y la
          contraseña con la persona por el medio que prefieras.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Contraseña</label>
        <div className="relative mt-1">
          <input
            type={mostrarPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 pr-16"
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
        <label className="block text-sm font-medium text-slate-700">Nombre</label>
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Rol</label>
        <select value={rol} onChange={(e) => setRol(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Teléfono (opcional)</label>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      {mensaje && (
        <p className={`col-span-2 text-sm ${mensaje.tipo === "ok" ? "text-marca-lima-oscuro" : "text-red-600"}`}>
          {mensaje.texto}
        </p>
      )}
      <div className="col-span-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-marca-azul px-4 py-2 font-medium text-white hover:bg-marca-azul-claro disabled:opacity-60"
        >
          {enviando ? "Creando..." : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
