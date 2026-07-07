import { DashboardLive } from "@/components/oficina/DashboardLive";

export default function DashboardPage() {
  const fechaBonita = new Date().toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-marca-azul">Resumen del día</h1>
      <p className="mb-6 text-sm capitalize text-slate-500">{fechaBonita}</p>
      <DashboardLive />
    </div>
  );
}
