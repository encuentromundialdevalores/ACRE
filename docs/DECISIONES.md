# Decisiones de diseño — ACRE Consulting · Plataforma de Gestión Territorial

Fecha: 2026-11-13. Este documento registra las decisiones tomadas donde el prompt maestro dejaba margen, y los hallazgos de la verificación de fuentes externas.

## 1. Estructura y stack

| Decisión | Elección | Motivo |
|---|---|---|
| Framework | Next.js 14.2 (App Router) + React 18.3 + TypeScript | Stack definido en el reporte. |
| Node | 24 instalado localmente; el proyecto declara `engines >=20` | Next 14 requiere ≥18.17; Node 20 LTS sigue siendo la versión objetivo en Vercel. |
| ORM / migraciones | Drizzle ORM + drizzle-kit (SQL generado en `drizzle/`) | Ligero, SQL explícito, compatible con Neon y PostgreSQL 16 local. |
| Autenticación | Auth.js v5 (`next-auth@5 beta`) con proveedor Credentials y sesión JWT | Auth.js solo soporta Credentials con estrategia JWT. Rol incluido en el token y verificado en servidor. |
| Contraseñas | bcryptjs (coste 12) | Sin dependencias nativas, apto para Vercel. |
| Mapa | Leaflet 1.9.4 + Leaflet.draw 1.0.4 sin react-leaflet | Integración directa evita conflictos entre react-leaflet y Leaflet.draw. Componente cliente con `dynamic(..., { ssr:false })`. |
| Superficie | `@turf/area` (geodésico) + `@turf/kinks` (autointersección) + `@turf/pointOnFeature` | Área geodésica; punto representativo garantizado dentro del polígono. |
| Archivos | Adaptador de almacenamiento: `local` (disco, desarrollo) y `vercel-blob` (`access: 'private'`) | Las descargas siempre pasan por una ruta autenticada; nunca se expone una URL pública permanente. |
| Invitaciones | Token opaco de 32 bytes (base64url), se guarda solo `sha256(token)` | El enlace es `/compartido/<token>`; validación de expiración y revocación en servidor. |
| Validación | zod 4 | Esquemas compartidos entre API y formularios. |
| Pruebas | Vitest 3 | Vitest 5 exige `@types/node ≥22`; el proyecto usa `@types/node 20` para alinearse con Node 20 LTS. |

## 2. Roles y permisos

Roles: `ADMIN` (socio ACRE), `OWNER` (propietario), `BUYER` (comprador invitado).
La matriz de permisos vive en `src/lib/permissions.ts` (`can(user, action, recurso)`) y es configurable sin tocar las rutas.
Los compradores acceden principalmente por enlace de invitación (sin sesión). Si además inician sesión como `BUYER`, su dashboard lista las invitaciones vigentes dirigidas a su correo.

## 3. Modos de datos

`DATA_MODE=real|demo`.
- **real**: cada conector consulta su API oficial. Si faltan credenciales, el conector devuelve `PENDIENTE` con la nota "credenciales no configuradas"; nunca inventa datos.
- **demo**: todos los conectores devuelven datos sintéticos deterministas (derivados de las coordenadas) marcados con `is_demo = true` y fuente "Datos sintéticos de demostración". La interfaz los muestra con la etiqueta **Demostrativo** y no los cuenta como verificados.

## 4. Fuentes externas verificadas (13-nov-2026)

### DENUE (INEGI)
`GET https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/todos/{lat},{lng}/{metros}/{token}`. Radio máximo 5 000 m. Respuesta: arreglo con `Nombre`, `Clase_actividad`, `Latitud`, `Longitud`, etc. Sin token responde "No Autorizado". Punto de referencia: punto representativo del polígono (`pointOnFeature`), radio 500 m; la metodología se guarda en el campo `method` de cada dato.

### Google Maps Platform
- Geocoding API: `https://maps.googleapis.com/maps/api/geocode/json?latlng=...` → `route`, `sublocality`/`neighborhood`, `locality`.
- Places API (New) Nearby Search: `POST https://places.googleapis.com/v1/places:searchNearby` con `includedTypes` (`school`, `hospital`, `transit_station`) y `X-Goog-FieldMask`. Máximo 20 resultados por consulta; se informa "20 o más" cuando se alcanza el tope. Distancias en línea recta (Turf, geodésica), etiquetadas como tales.

### Atlas Nacional de Riesgos (CENAPRED)
Servidor ArcGIS público: `https://rmgir.proyectomesoamerica.org/server/rest/services/ANR`.
- **Peligro sísmico**: `Fenomenos_Geologicos/MapServer/467` "Regionalización sísmica (CFE, 2015)", campos `NAME` (Zona A–D) y `ZON2015` (Baja/Media/Alta/Muy alta). Consulta `query` por punto; responde en <1 s.
- **Susceptibilidad de laderas**: `Fenomenos_Geologicos/MapServer/382–386` (ráster "Mapa Nacional de Susceptibilidad de inestabilidad de laderas", clases Muy Bajo, Bajo, Medio, Alto, Muy Alto). Las capas ráster no admiten `query`; se usa `identify`, que devuelve `Pixel Value` 1–5 (NoData fuera de cobertura). La equivalencia 1→Muy Bajo … 5→Muy Alto se toma del orden de las subcapas publicadas por la fuente.
- **Peligro por inundación**: `Fenomenos_Hidrometeorologicos/MapServer/52` "Índice de peligro por inundación (CENAPRED, 2016)", campo `PELIGRO_IN` (Muy bajo … Muy alto), nivel municipal. Durante la verificación la capa tardó sistemáticamente >30 s en responder tanto a `query` como a `identify`; con el límite de 30 s el dato quedará **Pendiente** con la explicación hasta que el servicio responda. No se sustituye por otra clasificación.

Los endpoints son configurables por variables de entorno (`ANR_*`) para adaptarlos si CENAPRED cambia de servidor.

## 5. Métrica de tiempo de integración

Cada ejecución del motor se registra en `integration_runs` (inicio, fin, duración, modo, resumen por estado). El expediente muestra el tiempo transcurrido entre el registro del terreno y la última ejecución completada, y el dashboard el promedio. La meta (<40 min frente a ~120 min manuales) es una hipótesis a validar con los 20 polígonos de prueba (`scripts/import-polygons.ts`), no un resultado.

## 6. Fuera de alcance (confirmado)
Sin avalúos, precios, PostGIS, firma electrónica, pagos, catastro ni RPP.

## 7. Hallazgo durante la validación (13-nov-2026)

El servidor ArcGIS del Atlas responde de forma errática: en ejecuciones consecutivas distintas capas superaron los 30 s. El conector ANR usa una señal de aborto propia por indicador (límite global − 2 s) para que los indicadores que sí respondieron se conserven como **Confirmado** aunque otro quede **Pendiente**. La caché de 24 h evita repetir consultas ya resueltas; el botón «Sin caché» fuerza una nueva consulta.
