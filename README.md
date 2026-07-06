# Concaribe Tracker

Seguimiento de vendedores en tiempo real. Dos paneles: **Oficina** (solo seguimiento — mapa en vivo,
replay, métricas, heatmap, reportes, alertas, y control total del catálogo de empresas) y **Vendedor**
(dueño de su propia ruta diaria: selecciona empresas de su catálogo, confirma orden de visita,
tracking GPS con geofencing y detección de desvío, funciona offline).

La especificación completa de arquitectura (esquema de datos, RLS, lógica de negocio, flujos) está en
`.claude/plans` de esta sesión. Este README cubre solo los pasos para levantar el proyecto.

## Stack

Next.js (App Router) + PWA · Supabase (Postgres/PostGIS + Realtime + Auth + Storage) · Google Maps
Platform (Maps JavaScript API, Places API, Directions API, Geocoding API) · Web Push (VAPID) · Dexie
(IndexedDB offline) · turf.js (geofencing y cálculo de desvío) · Tailwind CSS.

## Configuración paso a paso

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear proyecto Supabase

Consola de Supabase → New Project → elegir región cercana a la operación → guardar la contraseña
generada de la base de datos.

### 3. Habilitar extensiones

Ya están en la primera migración (`supabase/migrations/0001_extensions.sql`), pero si prefieres
habilitarlas manualmente antes: `postgis`, `pg_cron`, `pgcrypto`, `pg_trgm`, `unaccent` (Database →
Extensions en el dashboard, o vía SQL editor).

### 4. Correr las migraciones

```bash
supabase login
supabase link --project-ref <tu-project-ref>
supabase db push
```

Esto aplica en orden: extensiones → enums → tablas (con PostGIS) → índices → políticas RLS →
funciones/triggers → vistas y RPCs de métricas → políticas de Storage.

**Importante:** en `supabase/migrations/0007_views_metrics.sql`, reemplaza `<project-ref>` por el ref
real de tu proyecto en las URLs de `net.http_post` antes de aplicar (o hazlo después con
`cron.alter_job`).

### 5. Configurar Auth

Authentication → Providers → habilitar Email/Password. Los usuarios los crea directamente un
`admin_oficina` desde Oficina → Usuarios (correo + contraseña definida ahí mismo, sin correo de
invitación ni autoregistro). Configura Site URL / Redirect URLs al dominio de despliegue.

### 6. Configurar Storage

Crea manualmente el bucket **`visitas-fotos`** como **privado** (las políticas ya están en
`0008_storage_policies.sql`) y opcionalmente un bucket público `logos` para assets de marca.

### 7. Google Maps Platform

Google Cloud Console → crea un proyecto → vincula facturación (pay-as-you-go; con el volumen de este
proyecto normalmente el uso real cae dentro de la cuota gratuita mensual de cada API — configura un
presupuesto con alerta en Billing → Budgets & alerts como red de seguridad). Luego, **APIs & Services
→ Library**, habilita estas 4:
- **Maps JavaScript API**
- **Places API** (búsqueda de negocios por nombre)
- **Directions API** (rutas + optimización de orden de visita)
- **Geocoding API**

Crea dos API keys en **APIs & Services → Credentials**:
- Pública (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): restringida por HTTP referrer a tu dominio de Vercel,
  restringida a **Maps JavaScript API** únicamente.
- Privada (`GOOGLE_MAPS_SERVER_API_KEY`): sin restricción de referrer (se usa solo desde Route
  Handlers server-side), restringida a **Places API + Directions API + Geocoding API**.

### 8. Claves VAPID (Web Push)

```bash
npx web-push generate-vapid-keys
```

Guarda `publicKey` en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `privateKey` en `VAPID_PRIVATE_KEY`.

### 9. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa todos los valores. Las mismas variables
server-side (`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
deben configurarse también como secretos de las Edge Functions:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=...
```

### 10. Desplegar las Edge Functions

```bash
supabase functions deploy detectar-gps-apagado
supabase functions deploy generar-rutas-recurrentes
supabase functions deploy enviar-push
```

### 11. Generar los tipos de TypeScript del esquema real

```bash
supabase gen types typescript --project-id <tu-project-ref> > src/lib/supabase/types.ts
```

(Reemplaza el placeholder `Database = any` en ese archivo.)

### 12. Iconos PWA

Genera `icon-192.png`, `icon-512.png` e `icon-maskable-512.png` a partir de `logo.png` (con fondo
sólido `#1B3A6B` para la versión maskable) y colócalos en `public/icons/`.

### 13. Correr en desarrollo

```bash
npm run dev
```

### 14. Desplegar en Vercel

Conecta el repositorio, carga todas las variables de `.env.local.example` en Production/Preview, y
despliega. Verifica que `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAPS_SERVER_API_KEY` y `VAPID_PRIVATE_KEY`
nunca lleven el prefijo `NEXT_PUBLIC_` ni se usen fuera de Route Handlers/Server Components.

## Notas de seguridad

- RLS activo en todas las tablas: el vendedor tiene control total sobre sus propias empresas y rutas;
  oficina tiene lectura total de todo, y escritura solo sobre el catálogo de empresas (de cualquier
  vendedor) y sobre `gps_alertas` (para resolverlas).
- Bucket `visitas-fotos` es privado — la app siempre usa `createSignedUrl` (`src/lib/supabase/signedUrl.ts`),
  nunca URLs públicas permanentes.
- Cambios al catálogo de empresas quedan auditados en `auditoria_empresas`.
- Ubicaciones crudas se purgan a los 90 días (job `purgar-ubicaciones-antiguas`); las métricas
  agregadas sobreviven en `mv_metricas_diarias`.
