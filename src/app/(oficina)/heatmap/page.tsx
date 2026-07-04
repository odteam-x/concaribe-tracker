"use client";
import { useState } from "react";
import { HeatmapLayer } from "@/components/mapa/HeatmapLayer";

export default function HeatmapPage() {
  const [hasta] = useState(new Date().toISOString().slice(0, 10));
  const [desde] = useState(new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-marca-azul">Heatmap de visitas</h1>
      <HeatmapLayer desde={desde} hasta={hasta} />
    </div>
  );
}
