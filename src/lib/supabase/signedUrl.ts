import { supabaseBrowser } from "./client";

/**
 * El bucket "visitas-fotos" es privado: nunca se genera una URL pública permanente.
 * Se llama justo antes de renderizar cada <img>, no se cachea más allá de la sesión de vista.
 */
export async function obtenerUrlFirmadaFoto(path: string, expiraEnSegundos = 300): Promise<string> {
  const { data, error } = await supabaseBrowser.storage
    .from("visitas-fotos")
    .createSignedUrl(path, expiraEnSegundos);

  if (error) throw error;
  return data.signedUrl;
}
