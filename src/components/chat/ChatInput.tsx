"use client";
import { useState } from "react";

export function ChatInput({ onEnviar }: { onEnviar: (contenido: string) => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    await onEnviar(texto.trim());
    setTexto("");
    setEnviando(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 p-3">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe un mensaje..."
        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-marca-azul px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        Enviar
      </button>
    </form>
  );
}
