# ACRE Consulting — Plataforma de Gestión Territorial

Aplicación web para registrar terrenos del Área Metropolitana de Monterrey, dibujar su polígono, consultar fuentes oficiales (INEGI DENUE, Google Maps Platform, Atlas Nacional de Riesgos) y generar un expediente técnico con fuente, fecha y estado de verificación de cada dato, que puede compartirse mediante enlaces privados y temporales.

> La plataforma **no** realiza avalúos ni emite dictámenes de viabilidad. Centraliza información territorial verificable para análisis preliminares.

## Stack

Next.js 14 · React 18 · TypeScript · Tailwind CSS · Auth.js v5 (Credentials + JWT) · Drizzle ORM · PostgreSQL 16 · Leaflet 1.9 + Leaflet.draw · Turf.js 6.5 · Vitest · Vercel / Neon / Vercel Blob.

Las decisiones de diseño y los hallazgos de la verificación de APIs están en [`docs/DECISIONES.md`](docs/DECISIONES.md).

## Ejecución local

Requisitos: Node ≥ 20 y PostgreSQL 16 (local o Neon).

```bash
cd acre-platform
npm install
cp .env.example .env            # edita DATABASE_URL y AUTH_SECRET
createdb acre_platform          # si usas PostgreSQL local
npm run db:migrate              # aplica las migraciones de drizzle/
npm run db:seed                 # crea las cuentas de prueba
npm run dev                     # http://localhost:3000
```

Cuentas creadas por el seed (cámbialas en producción):

| Rol | Correo | Contraseña |
|---|---|---|
| Socio ACRE (ADMIN) | admin@acre.local | Admin1234! |
| Propietario (OWNER) | propietario@acre.local | Owner1234! |
| Comprador (BUYER) | comprador@acre.local | Buyer1234! |

### Polígonos de prueba

`data/poligonos-prueba-amm.geojson` contiene 20 polígonos ficticios (500–20 000 m²) en el AMM.

```bash
npm run db:import-polygons                  # importa los 20 terrenos
npm run db:import-polygons -- --consultar   # importa y ejecuta el motor de consultas, midiendo el tiempo
```

También puede importarse cualquier GeoJSON desde el formulario de registro («Importar GeoJSON»).

### Pruebas

```bash
npm test          # Vitest: geometría, permisos, invitaciones, conectores (fallos simulados), estado del expediente
npm run typecheck
npm run build
```

## Variables de entorno

Ver `.env.example`. Resumen:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL (local o Neon). |
| `AUTH_SECRET` / `AUTH_URL` | Auth.js. Genera el secreto con `openssl rand -base64 32`. |
| `DATA_MODE` | `demo` (datos sintéticos etiquetados) o `real` (APIs oficiales). |
| `INEGI_DENUE_TOKEN` | Token gratuito de INEGI para la API DENUE. |
| `GOOGLE_MAPS_API_KEY` | Clave con Geocoding API y Places API (New) habilitadas. |
| `ANR_*` | Endpoints ArcGIS del Atlas Nacional de Riesgos (sin credenciales; valores verificados por defecto). |
| `CONNECTOR_TIMEOUT_MS` / `CONNECTOR_CACHE_TTL_HOURS` | Límite por fuente (30 s) y vigencia de caché. |
| `STORAGE_DRIVER` | `local` (disco, desarrollo) o `vercel-blob` (requiere `BLOB_READ_WRITE_TOKEN` y un store **privado**). |

Las credenciales sólo se usan en el servidor; nunca llegan al navegador.

## Modos de datos

- **Real**: cada conector consulta su API oficial. Si falta una credencial, sus campos quedan **Pendiente** con la razón. Si una fuente no responde en 30 s, el dato queda **Pendiente** (nunca se convierte en "sin riesgo" o "0 establecimientos"). Si la fuente confirma que no tiene el dato, queda **No disponible**.
- **Demo**: todos los conectores devuelven datos sintéticos deterministas marcados como **Demostrativo**, con fuente "Datos sintéticos de demostración". No se atribuyen a ninguna institución y el expediente nunca se muestra como "Completo", sino como "Completo (demostración)".

La superficie siempre se calcula realmente con Turf.js, en ambos modos.

## Flujo principal

Socio inicia sesión → registra terreno (dibuja o importa polígono, superficie automática) → en el expediente pulsa **Ejecutar consultas** → revisa fuente, fecha y estado de cada dato (sección G) → adjunta documentos y fotografías → **Compartir expediente** genera un enlace `/compartido/<token>` con vigencia → el comprador consulta el expediente en solo lectura → el socio puede revocar el enlace.

## Despliegue en Vercel

1. Crea el proyecto en Vercel desde el repositorio (raíz: `acre-platform`).
2. Provisiona Neon (Marketplace) y copia `DATABASE_URL`.
3. Crea un Blob store **privado** y define `STORAGE_DRIVER=vercel-blob` + `BLOB_READ_WRITE_TOKEN`.
4. Define `AUTH_SECRET`, `AUTH_URL=https://<dominio>`, `DATA_MODE`, `INEGI_DENUE_TOKEN`, `GOOGLE_MAPS_API_KEY`.
5. Ejecuta las migraciones contra Neon: `DATABASE_URL=... npm run db:migrate && npm run db:seed`.
6. Despliega. La ruta `/api/terrenos/[id]/consultar` declara `maxDuration = 60` para tolerar fuentes lentas.

## Estructura

```
src/app            Rutas (App Router): login, (app)/dashboard|terrenos|expedientes|invitaciones|cuenta, compartido/[token], api/*
src/components     UI, mapa (Leaflet), expediente, formularios
src/lib/connectors Motor de consultas: fields, types, runner (timeout/caché/logs), denue, google, anr, demo
src/lib/services   Lógica de negocio: terrenos, invitaciones, dashboard, acceso
src/lib/db         Esquema Drizzle y cliente PostgreSQL
src/lib/storage    Adaptador de archivos (local / Vercel Blob privado)
drizzle/           Migraciones SQL
scripts/           seed.ts, import-polygons.ts
tests/             Vitest
docs/              Decisiones de diseño
```
