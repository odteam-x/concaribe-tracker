export function MensajeBubble({ contenido, esPropio, timestamp }: { contenido: string; esPropio: boolean; timestamp: string }) {
  return (
    <div className={`flex ${esPropio ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
          esPropio ? "bg-marca-azul text-white" : "bg-slate-200 text-slate-800"
        }`}
      >
        <p>{contenido}</p>
        <p className={`mt-1 text-[10px] ${esPropio ? "text-white/70" : "text-slate-500"}`}>
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
