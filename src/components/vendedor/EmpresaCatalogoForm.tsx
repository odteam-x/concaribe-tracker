"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { DuplicadoEmpresaWarning } from "@/components/oficina/DuplicadoEmpresaWarning";

interface EmpresaExistente {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  categoria: string | null;
  notas: string | null;
}

/** "Mis Empresas": CRUD del catálogo propio del vendedor, con geocodificación y aviso de duplicados. */
export function EmpresaCatalogoForm({ empresaExistente }: { empresaExistente?: EmpresaExistente }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(empresaExistente?.nombre ?? "");
  const [direccion, setDireccion] = useState(empresaExistente?.direccion ?? "");
  const [telefono, setTelefono] = useState(empresaExistente?.telefono ?? "");
  const [categoria, setCategoria] = useState(empresaExistente?.categoria ?? "");
  const [notas, setNotas] = useState(empresaExistente?.notas ?? "");
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    const res = await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direccion }),
    });
    if (!res.ok) {
      setError("No se pudo geocodificar la dirección. Verifícala e intenta de nuevo.");
      setGuardando(false);
      return;
    }
    const geocode = await res.json();

    if (!empresaExistente) {
      const { data: similares } = await supabaseBrowser.rpc("fn_buscar_empresas_similares", {
        p_nombre: nombre,
        p_lat: geocode.lat,
        p_lng: geocode.lng,
      });
      if (similares && similares.length > 0) setCandidatos(similares);
    }

    const {
      data: { user },
    } = await supabaseBrowser.auth.getUser();

    const payload = {
      vendedor_id: user!.id,
      nombre,
      direccion: geocode.direccionFormateada,
      ubicacion: `SRID=4326;POINT(${geocode.lng} ${geocode.lat})`,
      telefono: telefono || null,
      categoria: categoria || null,
      notas: notas || null,
      creado_por: user!.id,
    };

    const { error: dbError } = empresaExistente
      ? await supabaseBrowser.from("empresas").update(payload).eq("id", empresaExistente.id)
      : await supabaseBrowser.from("empresas").insert(payload);

    setGuardando(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.push("/mis-empresas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="block text-sm font-medium text-slate-700">Dirección</label>
        <input
          required
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Teléfono</label>
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Categoría</label>
        <input
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Notas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <DuplicadoEmpresaWarning candidatos={candidatos} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-md bg-marca-azul px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
