"use client";
import { useState } from "react";
import imageCompression from "browser-image-compression";

export function FotoCapture({ onFoto }: { onFoto: (blob: Blob | null, nombre: string | null) => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) {
      onFoto(null, null);
      setPreviewUrl(null);
      return;
    }
    const comprimido = await imageCompression(archivo, { maxSizeMB: 0.6, maxWidthOrHeight: 1280 });
    onFoto(comprimido, archivo.name);
    setPreviewUrl(URL.createObjectURL(comprimido));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Foto (opcional)</label>
      <input type="file" accept="image/*" capture="environment" onChange={handleChange} className="mt-1 w-full text-sm" />
      {previewUrl && <img src={previewUrl} alt="Vista previa" className="mt-2 h-32 w-32 rounded-md object-cover" />}
    </div>
  );
}
