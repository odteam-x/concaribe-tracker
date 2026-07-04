"use client";
import { useState } from "react";
import { ReplayPlayer } from "@/components/mapa/ReplayPlayer";

export default function ReplayPage({ params }: { params: { vendedorId: string } }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-marca-azul">Replay del recorrido</h1>
      <input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="mb-4 rounded-md border border-slate-300 px-3 py-2"
      />
      <ReplayPlayer vendedorId={params.vendedorId} fecha={fecha} />
    </div>
  );
}
