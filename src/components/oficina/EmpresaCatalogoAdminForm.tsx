"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BuscadorDireccionMapa } from "@/components/shared/BuscadorDireccionMapa";

interface Vendedor {
  id: string;
  nombre: string;
}

interface EmpresaExistente {
  id: string;
  vendedor_id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  categoria: string | null;
  notas: string | null;
  lat?: number;
  lng?: number;
}

interface UbicacionConfirmada {
  direccion: string;
  lat: number;
  lng: number;
}

/** CRUD de empresas con selector de vendedor propietario — oficina tiene control total sobre cualquier catálogo. */
export function EmpresaCatalogoAdminForm({
  vendedores,
  empresaExistente,
}: {
  vendedores: Vendedor[];
  empresaExistente?: EmpresaExistente;
}) {
  const router = useRouter();
  const [vendedorId, setVendedorId] = useState(empresaExistente?.vendedor_id ?? vendedores[0]?.id ?? "");
  const [nombre, setNombre] = useState(empresaExistente?.nombre ?? "");
  const [ubicacion, setUbicacion] = useState<UbicacionConfirmada | null>(
    empresaExistente?.lat != null && empresaExistente?.lng != null
      ? { direccion: empresaExistente.direccion ?? "", lat: empresaExistente.lat, lng: empresaExistente.lng }
      : null
  );
  const [telefono, setTelefono] = useState(empresaExistente?.telefono ?? "");
  const [categoria, setCategoria] = useState(empresaExistente?.categoria ?? "");
  const [notas, setNotas] = useState(empresaExistente?.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ubicacion) {
      setError("Busca y selecciona la ubicación del local en el mapa antes de guardar.");
      return;
    }
    setGuardando(true);

    const {
      data: { user },
    } = await supabaseBrowser.auth.getUser();

    const payload = {
      vendedor_id: vendedorId,
      nombre,
      direccion: ubicacion.direccion,
      ubicacion: `SRID=4326;POINT(${ubicacion.lng} ${ubicacion.lat})`,
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
    router.push("/empresas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Vendedor propietario</label>
        <select
          value={vendedorId}
          onChange={(e) => setVendedorId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        >
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
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
      <BuscadorDireccionMapa
        valorInicial={empresaExistente?.direccion ?? ""}
        latInicial={empresaExistente?.lat}
        lngInicial={empresaExistente?.lng}
        onConfirmar={setUbicacion}
      />
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="rounded-md bg-marca-azul px-4 py-2 font-medium text-white hover:bg-marca-azul-claro disabled:opacity-60"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
