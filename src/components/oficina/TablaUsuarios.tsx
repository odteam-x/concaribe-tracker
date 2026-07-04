"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  supervisor_id: string | null;
  activo: boolean;
}

const ROLES = ["vendedor", "supervisor", "admin_oficina"];

export function TablaUsuarios({ usuarios, supervisores }: { usuarios: Usuario[]; supervisores: { id: string; nombre: string }[] }) {
  const [filas, setFilas] = useState(usuarios);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  async function actualizar(id: string, cambios: Partial<Usuario>) {
    setGuardandoId(id);
    const { error } = await supabaseBrowser.from("usuarios").update(cambios).eq("id", id);
    if (!error) {
      setFilas((prev) => prev.map((u) => (u.id === id ? { ...u, ...cambios } : u)));
    }
    setGuardandoId(null);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Correo</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Supervisor</th>
            <th className="px-4 py-3">Activo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{u.nombre}</td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">
                <select
                  value={u.rol}
                  disabled={guardandoId === u.id}
                  onChange={(e) => actualizar(u.id, { rol: e.target.value })}
                  className="rounded-md border border-slate-300 px-2 py-1"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  value={u.supervisor_id ?? ""}
                  disabled={guardandoId === u.id || u.rol !== "vendedor"}
                  onChange={(e) => actualizar(u.id, { supervisor_id: e.target.value || null })}
                  className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
                >
                  <option value="">Sin supervisor</option>
                  {supervisores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={u.activo}
                  disabled={guardandoId === u.id}
                  onChange={(e) => actualizar(u.id, { activo: e.target.checked })}
                  className="h-4 w-4"
                />
              </td>
            </tr>
          ))}
          {filas.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                No hay usuarios registrados todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
