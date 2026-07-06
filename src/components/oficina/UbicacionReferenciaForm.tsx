"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BuscadorDireccionMapa } from "@/components/shared/BuscadorDireccionMapa";

const CATEGORIAS = [
  { value: "empresa", label: "Empresa" },
  { value: "almacen", label: "Almacén" },
  { value: "local", label: "Local" },
  { value: "otro", label: "Otro" },
];

interface UbicacionExistente {
  id: string;
  nombre: string;
  categoria: string;
  direccion: string | null;
  notas: string | null;
  lat?: number;
  lng?: number;
}

interface UbicacionConfirmada {
  direccion: string;
  lat: number;
  lng: number;
}

/** Puntos de referencia (almacenes, oficinas, locales) que solo admin_oficina gestiona, visibles para todos. */
export function UbicacionReferenciaForm({ ubicacionExistente }: { ubicacionExistente?: UbicacionExistente }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(ubicacionExistente?.nombre ?? "");
  const [categoria, setCategoria] = useState(ubicacionExistente?.categoria ?? "empresa");
  const [notas, setNotas] = useState(ubicacionExistente?.notas ?? "");
  const [ubicacion, setUbicacion] = useState<UbicacionConfirmada | null>(
    ubicacionExistente?.lat != null && ubicacionExistente?.lng != null
      ? { direccion: ubicacionExistente.direccion ?? "", lat: ubicacionExistente.lat, lng: ubicacionExistente.lng }
      : null
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ubicacion) {
      setError("Ubica el punto en el mapa antes de guardar.");
      return;
    }
    setGuardando(true);

    const {
      data: { user },
    } = await supabaseBrowser.auth.getUser();

    const payload = {
      nombre,
      categoria,
      direccion: ubicacion.direccion,
      ubicacion: `SRID=4326;POINT(${ubicacion.lng} ${ubicacion.lat})`,
      notas: notas || null,
      creado_por: user!.id,
      actualizado_en: new Date().toISOString(),
    };

    const { error: dbError } = ubicacionExistente
      ? await supabaseBrowser.from("ubicaciones_referencia").update(payload).eq("id", ubicacionExistente.id)
      : await supabaseBrowser.from("ubicaciones_referencia").insert(payload);

    setGuardando(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.push("/ubicaciones");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
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
        <label className="block text-sm font-medium text-slate-700">Categoría</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        >
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <BuscadorDireccionMapa
        valorInicial={ubicacionExistente?.direccion ?? ""}
        latInicial={ubicacionExistente?.lat}
        lngInicial={ubicacionExistente?.lng}
        onConfirmar={setUbicacion}
      />
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
