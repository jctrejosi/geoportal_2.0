# Implementación del rediseño — estado y verificación

> Auditoría del prototipo en `Frontend/` contra el brief de `plans/redesign.md`.
> Fecha de verificación: 2026-10-15 · Commit base: sin commitear (todo `Frontend/` es nuevo).

## 1. Cómo correrlo

Desde la **raíz del repositorio** (donde está `dev.js`):

```bash
node dev.js          # instala dependencias si faltan y arranca en el primer puerto libre
```

Salida típica (el 8443 está ocupado por otro proyecto local):

```
Geoportal SIMAC · entorno de desarrollo
  Aplicación: …/geoportal_2.0/Frontend
  Puerto 8443 estaba ocupado · se usará 8444
  URL: http://localhost:8444/
```

Opciones de `dev.js`: `--port=PUERTO`, `--strict-port`, `--no-install`, `--open`, `--help`.
Cualquier otro argumento se pasa a Vite (`node dev.js --host`). También respeta la variable `PORT`.

Equivalente manual, desde `Frontend/`:

```bash
cd Frontend
pnpm install        # solo la primera vez
pnpm dev            # http://localhost:8443 (puerto por defecto en vite.config.ts)
env PORT=8444 pnpm dev   # si el 8443 está ocupado
pnpm build          # build de producción en dist/
npx tsc --noEmit    # type-check (el script build no lo ejecuta)
```

El puerto se lee de `process.env.PORT || '8443'` con `strictPort: true` en `vite.config.ts`.

Requisitos verificados: Node 26.8.1, pnpm 10.34.3. Stack: React 19 · Vite 8 · TypeScript 5.7.

## 2. Estado de la verificación

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ sin errores |
| `pnpm build` | ✅ 231.7 kB JS (72.7 kB gzip) · 33.3 kB CSS (8.1 kB gzip) |
| Errores de consola en runtime (Chromium headless, CDP) | ✅ ninguno |
| Overflow horizontal/vertical en 390 × 844 | ✅ ninguno |
| Capturas revisadas | escritorio 1440 × 900 y móvil 390 × 844 |

## 3. Matriz de conservación §14 — verificación ítem por ítem

| # | Funcionalidad | Estado | Dónde está en `src/App.tsx` |
|---|---|---|---|
| 1 | Mapa a pantalla completa | ✅ | `MapView` (`.map`, `.map-inner`) |
| 2 | Capa de límites municipales | ✅ | grupo `.municipal` del SVG + nota en la leyenda |
| 3 | Marcadores por tipología con tooltip | ✅ | `.marker` + `.tooltip` (nombre, tipología, estado, última transmisión, temp/lluvia) |
| 4 | Filtros de capas (5) + Todas | ✅ | `<nav className="filters">` con contadores 159/79/50/12/8/10 |
| 5 | Iconos dinámicos por clima y conexión (10 estados) | ✅ | `paths` (`sun`, `cloud`, `rain`, `moon`, `moonRain`, `offline`, `users`) + badges `live/partial/out/offline` |
| 6 | Actualización en vivo cada 5 min | ✅ | `.live-pill`; simulación a 5 s (14:37 → 14:42 + lluvia en Río Tapias) |
| 7 | Buscador con zoom al resultado | ✅ | `Search` + `choose(id, true)`: el mapa vuela a `scale(1.6)` y centra el marcador por `translate` |
| 8 | Coordenadas GMS + escala + zoom | ✅ | `.map-tools` (cursor en GMS, zoom vertical, escala km) |
| 9 | Varias estaciones a la vez, cierre individual y total | ✅ | `.panel-stack` con `open: number[]` + botón "Cerrar todas (n)" |
| 10 | Pestañas Información / Variables / Galería | ✅ | `StationPanel` (Galería y Variables se ocultan si no aplican) |
| 11 | Ficha completa | ✅ | `Info` (código, tipo, red, altitud, coordenadas, ubicación, municipio, cuenca, sub-cuenca, tara, propietario, activa desde; los vacíos se omiten) |
| 12 | Hoja de vida PDF y Aforo | ✅ | `Info` → `HV_URL`, `AFORO_URL`; sin hoja de vida → aviso `.no-cv` |
| 13 | Las 8 variables | ✅ | `variableNames` en `Variables` |
| 14 | Precipitación 24 h (A1) + acumulada | ✅ | sub-vista `24 h (A1)` + `runSum` |
| 15 | Indicador A3 (72 h) | ✅ | sub-vista con 864 lecturas |
| 16 | Indicador A25 (24 días) máx/mín | ✅ | sub-vista con `DAILY_PPT` (25 días) y KPIs de máx/mín |
| 17 | Rosa de vientos diurna/nocturna (16 sectores) | ✅ | `WindRose` (32 pétalos, leyenda diurna/nocturna) |
| 18 | Nivel con Tara y máx/media/mín 24 h | ✅ | KPI `Nivel actual` con nota `Tara …` |
| 19 | % datos recuperados y última transmisión **por variable** | ✅ | `.vmeta` en `Variables` (valor determinista por estación+variable) |
| 20 | Zoom, exportación y pantalla completa en gráficas | ✅ | `Chart` (arrastre para zoom + "Restablecer zoom"), menú PNG/SVG/JPEG/PDF/Imprimir, `.fullchart` a 60 vh |
| 21 | Galería con lightbox y fallback | ✅ | `Gallery` (contador, flechas, lightbox con nombre de la estación) |
| 22 | Modal de Convenciones | ✅ | `Legend` (tipos, estados, estado del tiempo, nota de capas) |
| 23 | Modal de Colaboradores (10 entidades) | ✅ | `Collaborators` (grid 2×5) |
| 24 | Menú de recursos externos (7 accesos) | ✅ | `resources[]` en el menú `⋮` |
| 25 | Estados de carga y error | ✅ | skeletons de chips, pill "Cargando estaciones… n/5", toast sin conexión, navegador online/offline |
| 26 | Estaciones sin datos → sin pestaña Variables | ✅ | Filadelfia (`hasData: false`): solo Información, con aviso |

**Resultado: 26/26.**

## 4. Correcciones aplicadas en esta revisión

| Problema | Solución |
|---|---|
| El lightbox de la galería mostraba siempre "Río Tapias", sin importar la estación | `photo: { name, i, total }` en el estado; el caption usa el nombre y el índice reales |
| El buscador no hacía zoom al resultado (§14 #7, S6) | `pan` + vuelo a `scale(1.6)` centrando el marcador; al cerrar esa estación (o "Cerrar todas") la vista vuelve a `scale(1)` |
| `% recuperado` y última transmisión eran de la estación, no de la variable (§14 #19) | `.vmeta` por variable (derivado determinista de `station.id` + variable) |
| El estado "temporalmente fuera de servicio" estaba solo en la leyenda | `Status` incluye `"out"`, `statusText` y `.marker.out` (sistema completo de 10 estados) |
| La rosa de vientos se veía pequeña y con pétalos muy finos | viewBox ceñido al dibujo, `maxR` 70, pétalos de ~9.75° y altura 12.5 rem (60 vh en pantalla completa) |
| Con 8 variables, las últimas pills quedaban ocultas tras un scroll horizontal sin señal visual | `.variable-pills` usa `flex-wrap` (2 filas en escritorio y móvil); las 8 variables siempre visibles |

## 5. Decisiones que se desvían del brief (conscientes)

1. **`Dirección` conserva su propia pill** con la rosa de vientos, en vez de fusionarse dentro de `Viento` (§S3 lo sugería). Se priorizó §8.3 y la matriz §14 #13, que enumeran las 8 variables por separado; fusionarlas habría difuminado el acceso directo a la rosa.
2. **Las pills de variables envuelven en varias filas** en lugar del scroll horizontal de §S9: en móvil una fila desplazable escondía `Radiación` y `Nivel`.
3. **La galería usa un `div.scene` en CSS** como imagen de la estación (placeholder del prototipo); el brief pedía el fallback `imagen_no_disponible`, que aquí cubre el caso de las estaciones sin galería (pestaña oculta).

## 6. Datos simulados que un desarrollo real debería conectar

| Prototipo | Origen real |
|---|---|
| `stations[]` (10 estaciones) | `GET /estaciones/listar` (159 estaciones) |
| `buildSeries()` (series deterministas) | API de históricos por variable |
| Simulación a 5 s de "En vivo" | WebSocket Pusher (canal de tiempo real, ciclo de 5 min) |
| Navegador online/offline | Mismo evento `navigator.onLine`; en producción, estado del WebSocket |
| Contadores de los chips (159/79/50/12/8/10) | Conteos derivados de la lista real |
| Reintento de conexión | Reconexión al WebSocket |

Enlaces externos reales ya cableados: `HV_URL` (hoja de vida), `AFORO_URL`, `CDIAC_URL` y los 7 recursos del menú `⋮`.

## 7. Pendientes menores

- **Favicon**: `public/favicon.svg` es el genérico del export de Figma Make; el `clima.png` del sitio original no está en la extracción.
- **Mapa base**: el SVG simula la geografía; para producción hay que montar el mapa real (OSM/Leaflet) manteniendo la capa de límites municipales.
- **`export` de gráficas**: el menú PNG/SVG/JPEG/PDF/Imprimir es visual; falta implementar la serialización del SVG.
- **`localStorage`**: solo se usa para descartar la bienvenida (`simac-welcome`).
