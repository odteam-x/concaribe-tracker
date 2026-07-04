import Dexie, { type Table } from "dexie";

export interface UbicacionLocal {
  clientUuid: string; // PK, generado en dispositivo — evita duplicados en upsert
  vendedorId: string;
  jornadaId: string | null;
  lat: number;
  lng: number;
  precisionMetros: number | null;
  velocidadKmh: number | null;
  timestampDispositivo: string;
  sincronizado: boolean;
  intentos: number;
}

export interface DesvioLocal {
  clientUuid: string;
  vendedorId: string;
  rutaId: string;
  lat: number;
  lng: number;
  distanciaMetros: number;
  timestampDispositivo: string;
  motivo: string | null;
  sincronizado: boolean;
  intentos: number;
}

export interface VisitaLocal {
  clientUuid: string;
  empresaId: string;
  rutaId: string | null;
  vendedorId: string;
  resultado: string;
  comentario: string | null;
  fotoBlob: Blob | null; // se guarda como Blob hasta poder subirla a Storage
  fotoNombre: string | null;
  lat: number;
  lng: number;
  timestampDispositivo: string;
  llegadaAutomatica: boolean;
  sincronizado: boolean;
  intentos: number;
}

export class ConcaribeDB extends Dexie {
  ubicaciones!: Table<UbicacionLocal, string>;
  desvios!: Table<DesvioLocal, string>;
  visitas!: Table<VisitaLocal, string>;

  constructor() {
    super("concaribe_offline_db");
    this.version(1).stores({
      ubicaciones: "clientUuid, vendedorId, sincronizado, timestampDispositivo",
      desvios: "clientUuid, vendedorId, sincronizado, timestampDispositivo",
      visitas: "clientUuid, empresaId, vendedorId, sincronizado, timestampDispositivo",
    });
  }
}

export const db = new ConcaribeDB();
