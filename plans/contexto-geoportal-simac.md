# Contexto técnico — Geoportal SIMAC (para rediseño)

> Documento de contexto generado a partir de la extracción del sitio **https://cdiac.manizales.unal.edu.co/geoportal-simac/**.
> Objetivo: describir **todo** lo que hace la aplicación (interfaz, peticiones, datos y tiempo real) para poder hacer un **rediseño conservando las funcionalidades**.
> Fecha de captura del tráfico: 2026‑10‑15 (≈57 min de navegación capturada).

---

## 1. Qué es el Geoportal SIMAC

Aplicación web **SPA (single page app)** del CDIAC (Centro de Datos e Indicadores Ambientales de Caldas, Universidad Nacional de Colombia – sede Manizales). Muestra en un **mapa interactivo** las estaciones de monitoreo ambiental del **SIMAC** (Sistema Integrado de Monitoreo Ambiental de Caldas): estaciones hidrometeorológicas, meteorológicas no telemétricas (comunitarias), freatrimétricas (aguas subterráneas), de calidad del aire y acelerográficas/sismológicas.

- Al hacer clic en una estación se abre una **barra lateral derecha** con su información, gráficas de variables (últimas 24 h), indicadores de precipitación (A3 y A25) y galería/hoja de vida.
- Un **canal en tiempo real (WebSocket, protocolo Pusher)** actualiza cada 5 minutos el estado meteorológico de las estaciones, lo que cambia el **icono del marcador** (día despejado, nublado, lluvia, noche, desconectada, etc.).
- Incluye buscador de estaciones, controles de capas por tipología, modales de **convenciones** (leyenda) y **colaboradores**, y accesos directos a otros sistemas del CDIAC.

Título de la página: `Geoportal-SIMAC` · favicon: `/geoportal-simac/clima.png` · Idioma del contenido: **español** (aunque el `<html lang="en">`).

---

## 2. Inventario de la extracción

Estructura en disco (raíz del proyecto):

```
geoportal_2.0/
├─ plans/                                       ← este documento
├─ http_cdiac.manizales.unal.edu.co.json        ← captura de 142 peticiones HTTP (2,3 MB)
├─ websockets_cdiac.manizales.unal.edu.co.json  ← 23 mensajes WebSocket (132 KB)
├─ rtc_cdiac.manizales.unal.edu.co.json         ← 4 eventos del capturador (WebRTC), no de la app
├─ net_cdiac.manizales.unal.edu.co.json         ← 521 eventos de red bajos (DNS/TLS/UDP)
└─ cdiac.manizales.unal.edu.co/
   ├─ geoportal-simac/
   │  ├─ index.html      ← shell de la SPA (repetido 11 veces · 11,5 KB)
   │  ├─ scripts.js      ← todos los cuerpos JS capturados, concatenados (24,5 MB)
   │  └─ styles.css      ← todos los cuerpos CSS capturados, concatenados (5,3 MB)
   ├─ etl-cdiac-api-apiGeo-getA3ById-255/index.html   ← respuesta API: [null]
   ├─ etl-cdiac-api-apiGeo-getAccumPpt/index.html     ← respuesta API: [null]
   ├─ etl-cdiac-broadcast/index.html                  ← respuesta /etl-cdiac/broadcast (vacía)
   └─ geoportal-simac-css-app.css/index.html          ← 404 de nginx (artefacto del extractor)
```

Notas de lectura:

- **`http_*.json`** tiene forma `{domain, count, requests:[...]}`; cada request incluye método, url, path, status, headers (string JSON), `request_body` y `response_body`. Los cuerpos grandes están **truncados a 50 000 caracteres**.
- **`scripts.js` / `styles.css`** son concatenaciones de las respuestas completas, precedidas por comentarios `// https://.../archivo.ext`. Contienen **varias copias** del mismo bundle (4 copias de `app.js`, 3 de `chunk-vendors.js`, 5–6 de los CSS) porque el capturador guardó cada carga de página. Para trabajar con ellos hay que **deduplicar por línea/comentario**.
- **`websockets_*.json`**: `{domain, count, messages:[{id, ts, from_client, content, flow_url, host}]}`; `from_client:1` = enviado por el cliente.
- **`net_*.json`**: `{domain, count, events:[...]}` con `proto` (`dns` 466, `tls` 37, `udp` 18) y `detail`. Solo documenta resolución DNS y traceroute al dominio (`cdiac.manizales.unal.edu.co` → **168.176.145.44**), TLS SNI y sondas UDP 33434+. No aporta datos de la app.
- **`rtc_*.json`**: solo el evento `rtc:agent` del propio capturador. No hay WebRTC en la app.
- `etl-cdiac-*/index.html` y el 404 de `css/app.css` son respuestas puntuales que el extractor intentó resolver como documentos.

### Shell HTML (`geoportal-simac/index.html`)

```html
<!DOCTYPE html><html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="icon" href="/geoportal-simac/clima.png">
  <title>Geoportal-SIMAC</title>
  <link href="/geoportal-simac/css/app.e501f511.css" rel="preload" as="style">
  <link href="/geoportal-simac/css/chunk-vendors.a925f28d.css" rel="preload" as="style">
  <link href="/geoportal-simac/js/app.4d082072.js" rel="preload" as="script">
  <link href="/geoportal-simac/js/chunk-vendors.4a7f4cea.js" rel="preload" as="script">
  <link href="/geoportal-simac/css/chunk-vendors.a925f28d.css" rel="stylesheet">
  <link href="/geoportal-simac/css/app.e501f511.css" rel="stylesheet">
</head>
<body>
  <noscript>…no funciona sin JavaScript…</noscript>
  <div id="app"></div>
  <script src="/geoportal-simac/js/chunk-vendors.4a7f4cea.js"></script>
  <script src="/geoportal-simac/js/app.4d082072.js"></script>
</body></html>
```

Es un build clásico de **Vue CLI / webpack 4** (hashes en los nombres, `preload`).

---

## 3. Stack tecnológico

### Frontend (del bundle `app.js` + `chunk-vendors.js` + CSS)

| Librería | Versión | Uso en la app |
|---|---|---|
| Vue 2 | 2.x (bundle webpack 4, estilo Vue CLI) | Framework base de la SPA |
| Vuex | 3.x | Estado global (4 módulos, ver §4) |
| axios | 0.x | Todas las llamadas HTTP |
| Leaflet | **1.7.1** | Mapa base (tiles OSM) |
| vue2-leaflet | — | `<l-map>`, `<l-tile-layer>`, `<l-marker>`, `<l-tooltip>`, `<l-icon>`, `<l-geo-json>`, `<l-layer-group>`, `<l-control>`, `<l-control-zoom>`, `<l-control-scale>` |
| leaflet-control-search | — | Control "Buscar..." sobre el mapa |
| Highcharts | (con módulo *more*) | Todas las gráficas, incl. rosa de vientos polar |
| ant-design-vue | **1.7.8** | Tabs, collapse, carousel, iconos (`a-tabs`, `a-collapse`, `a-carousel`, `a-icon`) |
| bootstrap-vue | 2.x | `b-navbar`, `b-collapse`, `b-nav-item` (menú superior) |
| Bootstrap (CSS) | **5.3.2** | Se carga **dos veces** (en `chunk-vendors.css` y en `app.css`) |
| moment | **2.29.4** | (Incluido, con todos los locales; la app no lo usa explícitamente) |
| pusher-js | **7.6.0** | Cliente del WebSocket |
| laravel-echo | 1.x | Envuelve a pusher-js (`window.Echo`) |
| popper.js | 1.16.1 | Dependencia de bootstrap-vue |
| jQuery | — | **No** es dependencia real (solo referencias internas de Highcharts/popper) |

> ⚠️ Mezcla de **dos sistemas de diseño** (ant-design + bootstrap/bootstrap-vue) y de **Bootstrap 5 con BootstrapVue (pensado para BS4)**, además de doble carga de Bootstrap. Punto a resolver en el rediseño.

### Backend (inferido de las respuestas HTTP, no hay código fuente)

| Aspecto | Valor observado |
|---|---|
| Servidor web | nginx **1.21.0** (1.25.3 en el 404 estático) vía HTTPS (HSTS `max-age=31536000`) |
| Framework API | **Laravel** sobre **PHP 7.2.34** (`x-powered-by: PHP/7.2.34`, `laravel_session`, cabeceras `phpdebugbar-id`, `server-timing`) |
| CORS | `access-control-allow-origin: *` |
| Rate limit | `x-ratelimit-limit: 60` (60 req/min por IP; se ve decrementar `x-ratelimit-remaining`) |
| Caché | `cache-control: no-cache, private` |
| Tiempo real | Servidor WebSocket compatible con **protocolo Pusher 7** (laravel-websockets / Reverb / Soketi) en `wss://cdiac.manizales.unal.edu.co:443` |
| Compresión | `content-encoding: gzip` en varias respuestas API |

### Tamaño de los bundles

| Artefacto | Tamaño aprox. | Contenido |
|---|---|---|
| `chunk-vendors.4a7f4cea.js` | ≈ 3,1 MB | Vue, Vuex, axios, antd, bootstrap-vue, Leaflet+plugins, Highcharts, moment, popper, pusher-js, Echo |
| `app.4d082072.js` | ≈ 3,8 MB | Código de la app **+ GeoJSON embebido de ≈ 3,6 MB** (el código propio es ~200 KB) |
| `chunk-vendors.a925f28d.css` | ≈ 766 KB | Leaflet CSS (15 KB) + ant-design-vue (449 KB) + Bootstrap 5.3.2 (230 KB) + BootstrapVue custom (71 KB) |
| `app.e501f511.css` | ≈ 260 KB | Bootstrap 5.3.2 otra vez (230 KB) + **estilos propios de la app (15 KB, scoped)** |

---

## 4. Arquitectura de la aplicación

### 4.1 Árbol de componentes (render real)

```
App
└── InitialPage                     (div.container-index)
    ├── NavbarHeader                (logo + menú de iconos externos)
    ├── LeftMenu                    (5 botones de capas: hidro / acel / freat / aire / todas)
    ├── ButtonsFooter               ("Convenciones" y "Colaboradores")
    │   ├── ConventionsModal        (leyenda de iconos)
    │   └── ColaboratorsModal       (logos de entidades aliadas)
    ├── LoadingScreen  (= LoadingAccele)   ← overlay con GIF según tipología cargando
    ├── ErrorScreen                 ← modal "500 Error interno del servidor"
    ├── LeafletMap
    │   └── SearchStation           (control de búsqueda de estaciones)
    └── StationMenu                 ← barra lateral derecha (visible si showMenu)
        └── (por cada estación abierta) Menu (= StationListMenu)
            ├── Tab "Información" → Information
            ├── Tab "Variables"   → Variable
            │   ├── Rainfall  → Graph(×3)  [Precipitación 24h | Indicador A3 | Indicador A25]
            │   ├── Temperature → Graph
            │   ├── Humidity    → Graph
            │   ├── Velocity    → Graph
            │   ├── Direction   → GraphRose (rosa de vientos)
            │   ├── Pressure    → Graph
            │   ├── Radiation   → Graph
            │   └── Level       → Graph
            └── Tab "Galería"     → Galery (a-carousel con 2 fotos)
```

### 4.2 Estado global (Vuex) — 4 módulos `namespaced`

**`stations`** — listas de estaciones por tipología (se cargan al crear `App`):

```
hydrometereologicalStations[], nonTelemetricMeteorologicalStations[],
accelerographicStations[], phreatrimeticStations[], airqualityStations[]
```

**`station_id`** — detalle y panel lateral:

```
state:  infoStation[], dataStation[], rainfallA3[], rainfallA25[],
        loadingHydro|loadingAccele|loadingPhrea|loadingAirq, showMenu, error
actions: Get_Station_Id(id)   → 4 llamadas en serie (ver §6) y abre la barra lateral
         Close_Station(index), Close_Sidebar(), Catch_Error()
```

**`markers`** — visibilidad de capas:

```
state:  markersHidro, markersAcele, markersPhrea, markersAirq, allMarkers (todos true), newKey
acción: Modify_Marker_Group(i)  → 0=hidro 1=acel 2=freat 3=aire 4=todas (toggle + "solo esta" cuando estaban todas)
```

**`modals`** — `showColaborators`, `showConventions`.

### 4.3 Bootstrap de la app

```js
window.Pusher = pusher;                              // librería global
window.Echo = new Echo({
  broadcaster: 'pusher',
  key: 'rzepj8yg4v00xe12sxt2',
  wsHost: 'cdiac.manizales.unal.edu.co',
  wsPort: '443',
  forceTLS: true,
  disableStats: true,
  enabledTransports: ['ws', 'wss'],
});
new Vue({ store, render: h => h(App) }).$mount('#app');
```

Además se reemplazan los iconos por defecto de Leaflet (`iconRetinaUrl`, `iconUrl`, `shadowUrl` con PNGs en base64).

### 4.4 Flujo principal

1. **Carga inicial** → 5 `POST` a `getListStationsByTypology/{typología}` → se dibujan 5 grupos de marcadores + botones de capa.
2. **Clic en marcador** → si la estación no está abierta: `Change_State_Loading(tipología)` y `Get_Station_Id(id)` → 4 llamadas (§6) → `Open_Sidebar` → pestañas.
3. **Tiempo real** → Echo escucha `channelFiveMinutes` / evento `GeoPortal.EveryFiveMinutes` → actualiza `dataWebsocket` → **los iconos de los marcadores se recalculan** (lógica en §8).
4. **2 s después del montaje** → `GET /etl-cdiac/broadcast` (axios) — precalienta la sesión Laravel (devuelve vacío + cookie `laravel_session`).
5. **Cierre** → `x` de una estación la quita del panel; `x` del panel cierra la barra completa.

---

## 5. Interfaz de usuario (diseño actual, componente por componente)

### 5.1 Mapa (pantalla completa)

- **Ocupa todo el viewport** (`#map { position:absolute; inset:0; z-index:0 }`).
- **Capa base**: OpenStreetMap — `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
- **Centro inicial**: `[5.29, -75.2]`, **zoom 10** (cubre Caldas).
- **GeoJSON superpuesto** (límites municipales de Caldas + perímetros urbanos): trazo `#6b6b6b` peso 2, relleno `#919191` con opacidad 0.2 (embebido en el bundle, ver §7).
- **Controles** (todos abajo‑izquierda salvo el buscador): zoom, escala (métrica + imperial) y un `<span id="coordinates">` con la **lat/lng bajo el cursor en GMS** p. ej. `5° 17' 27.4'' N , 75° 41' 34.0'' W`, actualizado en `mousemove`.
- **Buscador** (`leaflet-control-search`): arriba‑izquierda, `position:fixed; left:17em` (21em ≥1500px; 14em ≤600px), placeholder **"Buscar..."**, lista desplegable de estaciones, zoom al resultado = 17, círculo de resaltado de 40 px.
- **Marcadores**: un `<l-marker>` por estación con tooltip = nombre y `<l-icon>` con imagen según tipología/estado (§8). Visibilidad por grupos con `visible`.
- Nota: los iconos se actualizan con un hack de `newKey` (al alternar capas) para forzar re‑render del `l-layer-group`.

### 5.2 Encabezado (`NavbarHeader`)

- **Logo SIMAC** (`img/logo simac.svg`) arriba‑izquierda, enlace a Facebook de SIMAC. `#logo { position:absolute; top:5px; left:5px; width:12em }` (10em en móvil).
- **Barra de iconos** (bootstrap-vue `b-navbar`, `type:"dark"`) arriba‑derecha: fondo `rgba(30,30,30,.7)`, esquina inferior izquierda redondeada 1em, sombra. Cada icono con efecto **hover → cambia a versión `_hover` del SVG** (mouseover/mouseleave) y se abre en pestaña nueva:

| Icono | Enlace |
|---|---|
| Geoportal (IDEA) | `http://idea.manizales.unal.edu.co` |
| Inicio (geoportal SIMAC) | `https://cdiac.manizales.unal.edu.co/geoportal-simac` |
| Reporte meteorológico | `http://idea.manizales.unal.edu.co/reporte-meteorologico.html` |
| CDIAC (indicadores) | `https://cdiac.manizales.unal.edu.co/indicadores/public/index` |
| Facebook | `https://www.facebook.com/SIMACUNAL/` |
| Twitter/X | `https://twitter.com/simac_unal` |
| Correo (solicitud de información) | `https://cdiac.manizales.unal.edu.co/gestion-riesgo/web/gestion_riesgo/solicitud_informacion/seleccionar_formulario` |

- Con la **barra lateral abierta**, la nav se desplaza (`right:35em`, transición 0.5 s) y el colapso responsivo pasa de `xl` a `xxxl` (`class nav / nav2`).

### 5.3 Menú de capas (`LeftMenu`) — columna izquierda flotante

5 botones cuadrados (ancho 4.5em × alto 3.5em), fondo naranja `#e96729`, radio 0.5em, sombra, opacidad 0.75. El icono **rota 45° en hover**. Estado activo: fondo `rgb(233,103,41)`; inactivo: `rgb(94,107,93)` + icono `_disable`.

| # | id | Título (tooltip) | Icono activo |
|---|---|---|---|
| 0 | `hidro` | Estaciones hidrometeorológicas | `hydro.svg` (mapa usa iconos dinámicos) |
| 1 | `ace` | Estaciones Acelerográficas | `accele.svg` |
| 2 | `phrea` | Estaciones Freatrimétricas | PNG base64 embebido |
| 3 | `airq` | Estaciones de Calidad Del Aire | PNG base64 embebido |
| 4 | `all` | Mostrar todos | `allMarkers.svg` |

Comportamiento al hacer clic: si **todas** están activas → activa **solo** la elegida; si no → toggle; si quedan todas activas → `allMarkers = true`.

### 5.4 Barra lateral de estación (`StationMenu`)

- `position:absolute; right:0; width:35em; height:100%`, fondo `hsla(0,0%,86.3%,.8)`, borde gris 2 px, scroll propio estilizado (scrollbar `#aaa` redondeado, solo WebKit). En móvil (`≤600px` o alto ≤412px) **ocupa el 100% del ancho**.
- Cabecera con `x` para cerrar todo el panel.
- **Se pueden abrir varias estaciones a la vez**: cada una es un `a-collapse` con el nombre de la estación como cabecera y una `x` propia para cerrarla.

**Pestañas por estación** (`a-tabs`, tipo línea):

1. **Información** — ficha con etiquetas en negrita:
   `Código`, `Tipo de Estación`, `Red`, `Latitud`/`Longitud` (GMS), `Altitud` (m.s.n.m), `Ubicación`, `Municipio`, `Cuenca`*, `Sub‑Cuenca`*, `Tara`*, `Propietario`, `Activa Desde`, `Aforo`* (enlace "AFORO"), `Detalle`: enlace **"Hoja de vida"** (PDF) o texto rojo *"Estación sin hoja de vida"*.
   Al final: "Para más información, acceda a: " con logo CDIAC enlazado.
   (*) campos condicionales.
2. **Variables** (solo si hay datos distintos de `null`; el chequeo del código mira `humidity`, `precipitation`, `presure`, `radiation`, `temperature` y `windDirection` — nota: **no** incluye `windSpeed` ni `level`) — título centrado **"VARIABLES MONITOREADAS"**; sub‑pestañas tipo tarjeta, **solo las que tengan datos**:

   | Pestaña | Métricas mostradas | Gráfica |
   |---|---|---|
   | Precipitación | actual, acumulada (A1), % datos recuperados, última transmisión; y sub‑tabs **Indicador A3** (máx/retención 72 h + % datos) y **Indicador A25** (máx/mín + % datos) | área acumulada + columnas discretizadas |
   | Temperatura | actual, máx/media/mín 24 h, % datos, última transmisión | área roja ‑  `rgba(214,54,21,…)` · °C |
   | Humedad | actual, máx/media/mín, % datos, última transmisión | área verde ‑ `rgba(29,138,1,…)` · % |
   | Velocidad | actual, máx/media 24 h (+"m/s"), % datos, última transmisión | línea violeta ‑ `rgba(165,115,235,.9)` · m/s |
   | Dirección | dirección actual (°), % datos **jornada diurna** y **nocturna**, última transmisión | **rosa de vientos** polar con 16 sectores (N, NNE, … NNO), 2 series: Jornada Diurna / Nocturna (frecuencia relativa %) |
   | Presión | actual, máx/media/mín, % datos, última transmisión | línea naranja ‑ `rgb(237,126,47,.8)` · mmHg |
   | Radiación | actual, máx/media, % datos, última transmisión | línea amarilla ‑ `rgba(237,213,33,.9)` · W/m² |
   | Nivel | actual, `Tara (cm)`, máx/media/mín 24 h, % datos, última transmisión | área azul ‑ `rgba(85,96,226,…)` · cm |

3. **Galería** (solo si hay imágenes) — `a-carousel` (antd) con hasta 2 fotos de la estación; si una imagen falla se reemplaza por `imagen_no_disponible.png`.

**Gráficas (Highcharts)**: fondo degradado blanco→`rgb(240,240,255)`, borde `rgba(255,115,0,.8)`, `zoomType: y`, subtítulo **"Fuente: IDEA"**, créditos desactivados, menú de exportación con: *viewFullscreen, printChart, downloadPNG, downloadSVG, downloadJPEG, downloadPDF*. Botón de **pantalla completa** propia (overlay con gráfica al 80%).

### 5.5 Botones inferiores

- Arriba‑derecha a la derecha de los controles: botones oscuros `btn btn-dark` **"Convenciones"** y **"Colaboradores"** (`position:absolute; right:.7rem; bottom:1rem`; con sidebar abierta `right:35.5rem`).

**Modal Convenciones** (fondo oscuro 70 %, contenido `#ebebeb` 70 %×70 %, scroll): 4 secciones con iconos y texto:

- **Estaciones Hidrometeorológicas**: Día despejado, Día parcialmente nublado, Día nublado, Día con lluvia, Noche nublada, Noche con lluvia, Estaciones comunitarias, Estación con funcionamiento parcial, Estación temporalmente fuera de servicio, Estación sin conexión.
- **Estaciones Acelerográficas**, **Estaciones Aguas Subterráneas**, **Estaciones Calidad del Aire** (un icono cada una).

**Modal Colaboradores**: 10 logos enlazados → UNAL, Corpocaldas, Alcaldía de Manizales, Gobernación de Caldas, Aguas de Manizales, CHEC, EMAS/Veolia, GAIA‑FROAC, GTA‑Ingeniería Hidráulica IDEA, Gestión del Riesgo Manizales.

### 5.6 Overlays

- **LoadingScreen**: overlay `rgba(154,207,221,.4)` a pantalla completa con **GIF animado según la tipología en carga** (`hydro.gif`, `accele.gif`, `phrea.gif`, `airq.gif`), opacidad 0.6.
- **ErrorScreen**: modal con **"500 / Error interno del servidor"**, texto *"¡Vaya parece que algo salió mal! Trata de volver a cargar esta estación. Si el problema persiste no dudes en contactar con nosotros"*, botón de cierre (bootstrap `btn-close`).

### 5.7 Estilo y sistema visual

- **Colores propios**: naranja `#e96729` / `#ff7300` (acento), grises `#ebebeb`, `#969696`, `#1b1b1b`, `#aaa`, overlays `rgba(30,30,30,.7)`, celeste `#9acfdd` (hover de bordes), azul `#6495ed`, rojo error `#ad5757`.
- **Tipografías**: por defecto de Bootstrap 5 (system‑ui / Segoe UI / Roboto…). No hay `@font-face` ni fuente de marca.
- **CSS scoped por componente** (`data-v-*`), nomenclatura BEM, transiciones suaves (hover rotate 0.5s, sidebar right 0.5s).
- **Breakpoints propios**: `max-width:600px`, `min-width:1500px`, `max-height:500/560px`, `max-height:412px`. El resto es Bootstrap.
- Sin modo oscuro, sin tokens CSS ni variables propias (solo los `--bs-*` de Bootstrap).

---

## 6. API HTTP (contrato observado)

Todas las llamadas son **POST** (excepto `broadcast`), sin autenticación, sin CSRF, `Accept: application/json`, y con `Origin/Referer` del propio geoportal. Base:

```
https://cdiac.manizales.unal.edu.co/etl-cdiac/api/apiGeo/
```

| Nombre en el código | Método y ruta | Cuerpo | Devuelve |
|---|---|---|---|
| `stations_typology` | `POST /getListStationsByTypology/{tipología}` | vacío | Array de estaciones (ver 6.1) |
| `station_info` | `POST /getStation/{id}` | vacío | Array con 1 estación (ficha completa, 6.2) |
| `station_data` | `POST /getLastDayDataByStation/{id}` | vacío | Serie 24 h (288 registros de 5 min, 6.3) |
| `precipitation_A3` | `POST /getA3ById/{id}` | vacío | Serie ~72 h (5 min) solo `date, time, precipitation` (6.4) |
| `precipitation_A25` | `POST /getAccumPpt` | `{"id":<int>,"period":"24"}` | Objeto con acumulados diarios + máx/mín (6.5) |
| `broadcast_websocket` | `GET /etl-cdiac/broadcast` | — | Cuerpo vacío, 200, setea cookie `laravel_session` |

Tipologías (`{tipología}`) y conteos observados:

| Ruta | N | `typology` devuelta |
|---|---|---|
| `hydrometeorological` | 79 | `Hidrometeorológica` (49) y `Meteorológica` (30) |
| `nonTelemetricMeteorological` | 50 | `Meteorológica no telemétrica` (se pintan con icono "comunitarias") |
| `phreatrimetric` | 12 | `Aguas Freáticas` |
| `airQuality` | 8 | `Calidad del aire` |
| `accelerograph` | 10 | `Sismológica` |

**Total: 159 estaciones** en las listas; 82 tienen datos en el canal en tiempo real.

### 6.1 Lista de estaciones (ejemplo real)

```json
[{"idStation":292,"name":"Río Supía - San Cayetano","typology":"Hidrometeorológica",
  "latitude":"5.45461111111111","longitude":"-75.6677777777778"}, …]
```

Campos: `idStation` (int), `name`, `typology`, `latitude`/`longitude` **como string** (WGS84 decimal).

### 6.2 Ficha de estación

```json
[{"idStation":63,"name":"Río Tapias","net":"Caldas","typology":"Hidrometeorológica",
  "simac_code":"174860302002","latitude":"5.222675","longitude":"-75.6377416666667",
  "altitude":"825","municipality":"Neira","location":"Unión Río Tapias - Río Tareas",
  "basin":null,"sub_basin":null,"owner_name":"Corpocaldas",
  "start_operation":"2013-07-18","tare":"537 cm"}]
```

`basin`, `sub_basin`, `tare`, `simac_code` pueden ser `null`.

### 6.3 Datos últimas 24 h (`getLastDayDataByStation`)

288 registros cada ~5 min. Campos (según tipo de estación):

```json
[{"date":"2026-10-14","time":"13:12:12","precipitation":0,"temperature":31.4522,"level":219.368}, …]
```

- Hidrometeorológica: `precipitation`, `temperature`, `level`.
- Meteorológica: además `humidity`, `windSpeed`, `windDirection`, `radiation`, `presure` *(sic, typo del backend, así se consume)*.
- Estación sin datos (p. ej. comunitaria id 255): `[null]` → la app oculta Variables y muestra icono de desconexión.

### 6.4 Indicador A3 (`getA3ById/{id}`)

```json
[{"date":"2026-10-12","time":"13:16:18","precipitation":0}, …]   // ~72 h, paso 5 min
```

Sin datos: `[null]`. En la UI se recalcula el acumulado en el cliente y se muestra como *"Indicador A3"* (“Precipitación últimas 72 horas” en la serie de columnas).

### 6.5 Indicador A25 (`getAccumPpt`) — petición `{"id":63,"period":"24"}`

```json
{"resultCumulativePpt":[{"date":"2026-09-21","cumulativePpt":9.4,"precipitation":0}, …25 días],
 "maxPpt":143.99999999999997,"minPpt":9.2}
```

Sin datos: `[null]`. La UI muestra máx/mín (`maxPpt`/`minPpt`), serie diaria de acumulado (área) y precipitación diaria (columnas).

### 6.6 Cabeceras relevantes (todas las respuestas API)

```
content-type: application/json
x-powered-by: PHP/7.2.34
cache-control: no-cache, private
x-ratelimit-limit: 60        (decrementa por petición)
access-control-allow-origin: *
server-timing: app;desc="Booting";dur=… , app;desc="Application";dur=…   (≈100–450 ms)
phpdebugbar-id: …            (¡Debugbar activa en producción!)
```

### 6.7 Peticiones estáticas (capturadas)

- `GET /geoportal-simac/` (HTML, 1 052 B, `last-modified: 2023‑11‑22`).
- CSS/JS de `css/` y `js/` (respuestas truncadas a 50 KB en el JSON; completas en `scripts.js`/`styles.css`).
- 24 imágenes de `img/` (ver §9), favicon `clima.png`.
- `GET /geoportal-simac/css/app.css` → **404** (el extractor lo pidió; no existe).
- Actualización WebSocket `GET /app/rzepj8yg4v00xe12sxt2?protocol=7&client=js&version=7.6.0&flash=false` → **101 Switching Protocols**.

---

## 7. Tiempo real (WebSocket / Laravel Echo)

Configuración del cliente (visible en el bundle):

```js
window.Echo = new Echo({
  broadcaster: 'pusher',
  key: 'rzepj8yg4v00xe12sxt2',
  wsHost: 'cdiac.manizales.unal.edu.co', wsPort: '443', forceTLS: true,
  disableStats: true, enabledTransports: ['ws', 'wss']
});
// suscripción:
window.Echo.channel('channelFiveMinutes').listen('GeoPortal.EveryFiveMinutes', payload => {
  this.dataWebsocket = payload;
});
```

### Flujo de mensajes capturado (23 mensajes, 4 conexiones)

1. `pusher:connection_established` → `{"socket_id":"…","activity_timeout":30}`
2. `pusher:subscribe` → `{"auth":"","channel":"channelFiveMinutes"}` (canal **público**, sin auth)
3. `pusher_internal:subscription_succeeded`
4. Cada ~5 min: evento **`App\Events\GeoPortal\EveryFiveMinutes`** en `channelFiveMinutes`
5. `pusher:ping` / `pusher:pong` cada ~30 s (keepalive)

### Payload del evento (84 elementos = 82 estaciones con datos + 2 nulos)

```json
[
  {"292":[{"time":"12:28:19","temperature":34.846,"precipitation":0},
          {"time":"12:32:58","temperature":34.954,"precipitation":0},
          {"time":"12:38:05","temperature":35.548,"precipitation":0},
          {"time":"12:43:16","temperature":35.278,"precipitation":0}]},
  {"155":[{"time":"12:27:00","temperature":null,"precipitation":null}, …]},
  [null], …
]
```

- Claves = `idStation` (como string), valor = **hasta 4 muestras** (una por cada 5 minutos del último bloque de 20 min) con `time`, `temperature`, `precipitation` (pueden ser `null`).
- IDs presentes en la captura (82): `292,155,209,153,151,162,170,165,152,164,163,161,179,32,182,178,181,169,11,66,68,64,10,13,14,4,8,71,208,69,16,9,63,2,5,3,157,1,154,158,6,248,76,23,175,167,193,205,74,180,7,61,26,31,22,19,20,27,25,28,18,24,29,30,166,156,34,72,70,195,160,35,21,67,65,202,17,177,36,12,210,62`.
- Las estaciones **no presentes** en el payload o sin datos → icono "sin conexión".

Ver §8 para la lógica de estado meteorológico derivada de este payload.

---

## 8. Lógica de negocio clave (a conservar)

### 8.1 Estado e icono de cada marcador (actualización cada 5 min)

A partir del payload `dataWebsocket[bloque][idStation]` (4 muestras):

1. Estación **ausente** del payload o lista vacía → **sin conexión** (`sinConexion.svg`).
2. Algunas muestras con `temperature` y/o `precipitation` `null`:
   - todas (4) con nulos → **temporalmente fuera de servicio** (`desconectada.svg`);
   - entre 1 y 3 → **funcionamiento parcial** (`desconectadaParcial.svg`).
3. Sin nulos, se usa la **última muestra**:
   - **Noche** (hora ≤ `06:00:00` o > `18:00:00`, comparación de strings): sin lluvia → *Noche nublada*; con lluvia → *Noche con lluvia*.
   - **Día** (06:00–18:00): con lluvia → si `temperature ≤ 21` *Día con lluvia*, si no *Día nublado*; sin lluvia → `>24` *Día despejado*; `21–24` *Día parcialmente nublado*; `≤21` *Día nublado*.
4. Estaciones **no telemétricas/comunitarias** usan siempre el icono `comunitarias.svg` (no reciben datos en tiempo real).

### 8.2 Series y estadísticas calculadas en el cliente

- **% datos recuperados** = `(n_filas_no_nulas / n_filas_totales) * 100` — repetido en cada pestaña.
- **Última transmisión** = `date + " " + time` de la última fila válida.
- **Precipitación 24 h**: valor actual (última muestra), acumulado total (etiquetado *A1*), serie acumulada (área) + serie discretizada (columnas).
- **Indicador A3**: acumulado 72 h recalculado en cliente (área) + valores por muestra (columnas).
- **Indicador A25**: acumulado diario servido por el backend (área) + precipitación diaria (columnas) + máx/mín del periodo (24 días).
- **Rosa de vientos**: clasifica la dirección en 16 sectores; separa **jornada diurna (06:00–18:00)** y **nocturna**; muestra % de datos recuperados por jornada.
- **Coordenadas**: conversión decimal → GMS con N/S/E/W tanto en la ficha como en el control del mapa.

### 8.3 Datos embebidos en el bundle (no vienen de la API)

| Dato | Detalle |
|---|---|
| **GeoJSON de límites** | `FeatureCollection` de **29 polígonos**, sin `properties`, ≈3,6 MB embebidos en `app.js`; cubre Caldas (27 municipios aprox.) incluido el perímetro urbano de Manizales (20 299 puntos). BBox: lon −75.92…−74.62, lat 4.80…5.78. |
| **Galería / hojas de vida** | JSON de **175 estaciones** con `{id, nombre, ruta1, ruta2, rutaPdf, aforo}` (ids = `idStation`). Imágenes → `https://cdiac.manizales.unal.edu.co/gestion-riesgo/web/resources/uploads/images/{ruta}`; PDFs → `https://cdiac.manizales.unal.edu.co/hv{rutaPdf}`; `aforo:true` en 35 estaciones. |
| **Convenciones** | Lista de secciones/iconos/títulos del modal (ver §5.5). |
| **Colaboradores** | 10 logos + URLs (ver §5.5). |
| **Enlaces de configuración** | `aforo.php`, `galery_images`, `galery_pdf` (`/hv`), `cdiac` (indicadores), `facebook`, `inicio`, `reporte_metereologico`, `generar_reporte`, `reporte_grafico`, `twitter`, `email`, `idea`. |

---

## 9. Inventario de assets (51 referencias + favicon)

| Grupo | Archivos |
|---|---|
| Marca | `logo simac.svg`, `geoportal.png`/`_hover`, `cdiac.svg` (nav) y `cdiac.947094eb.svg` (blanco, ficha), `inicio.svg`/`_hover`, `meteorologico.svg`/`_hover` |
| Redes | `facebook.svg`/`_hover`, `twitter.svg`/`_hover`, `correo.svg`/`_hover` |
| Capas (mapa/menú) | `hydro.svg`, `hydro_disable.svg`, `hydro.gif`; `accele.svg`, `accele_disable.svg`, `accele.gif`; `phrea.gif` (+ PNG base64 activo/desactivado); `airq.gif` (+ PNG base64 activo/desactivado); `allMarkers.svg`, `allMarkers_disable.svg` |
| Marcadores | `acelerografica.svg` (acelerográficas), `aguaSubterranea.svg` (freatrimétricas), `calidad_aire.svg` (aire), `comunitarias.svg` (no telemétricas) |
| Estados | `despejado.svg`, `nubladoParcial.svg`, `nublado.svg`, `lluvia.svg`, `nubladoNoche.svg`, `lluviaNoche.svg`, `desconectada.svg`, `desconectadaParcial.svg`, `sinConexion.svg` |
| UI | `fullscreen.png`, `imagen_no_disponible.png`, iconos base64 de Leaflet (marker, marker‑2x, shadow) |
| Colaboradores | `logoUnal.png`, `logoCorpocaldas.png`, `logoAlcaldia.png`, `logoGobernacion.png`, `logoAguas.png`, `logoChec.png`, `logoEmas.png`, `logoGaia.svg`, `logoGta.png`, `logoGestion.png` |
| Otros | favicon `clima.png`; logos con versión `_hover` donde aplica |

---

## 10. Funcionalidades a conservar en el rediseño (checklist)

**Mapa**
- [ ] Mapa a pantalla completa con OSM, centro `[5.29,−75.2]`, zoom 10.
- [ ] Capa GeoJSON de límites (municipios de Caldas + perímetro urbano) con estilo tenue.
- [ ] Controles: zoom, escala métrica+imperial, coordenadas GMS en vivo.
- [ ] Buscador de estaciones por nombre con zoom al resultado.
- [ ] Marcadores con tooltip (nombre) y clic → detalle.

**Capas y estados**
- [ ] 5 grupos conmutables (hidrometeorológicas, acelerográficas, freatrimétricas, calidad del aire, todas) con estado activo/inactivo visible.
- [ ] Iconos dinámicos por estado meteorológico y estado de conexión (10 iconos de estado).
- [ ] Reglas de negocio de §8.1 (día/noche, lluvia, umbrales 21/24 °C, parcial/fuera de servicio).
- [ ] Actualización en vivo cada 5 min vía Echo/Pusher (canal `channelFiveMinutes`, evento `GeoPortal.EveryFiveMinutes`).

**Panel de estación**
- [ ] Varias estaciones abiertas a la vez; cierre individual y cierre del panel.
- [ ] Ficha de información completa con enlaces a hoja de vida y aforo.
- [ ] Pestañas Variables (8 variables, visibilidad condicional) y Galería (carousel de 2 imágenes con fallback).
- [ ] Estadísticas por variable (actual, máx/media/mín 24 h, % datos recuperados, última transmisión).
- [ ] Precipitación con 3 vistas: 24 h (A1), Indicador A3 (72 h), Indicador A25 (24 días, máx/mín).
- [ ] Rosa de vientos diurna/nocturna con 16 sectores.
- [ ] Gráficas con zoom, exportación (PNG/SVG/JPEG/PDF/print) y pantalla completa.
- [ ] Manejo de estaciones sin datos (`[null]`): ocultar Variables, mostrar estado desconectada.

**UI general**
- [ ] Menú superior de accesos externos (IDEA, inicio, reporte meteorológico, CDIAC, redes, correo) con hover states.
- [ ] Modal de Convenciones (leyenda de todos los iconos).
- [ ] Modal de Colaboradores (10 entidades enlazadas).
- [ ] Overlays de carga por tipología y modal de error 500.
- [ ] Diseño responsive (móvil: panel 100 %, iconos más pequeños).

**Datos/API**
- [ ] Consumir los 6 endpoints tal cual (o documentar su reemplazo) con sus formas de respuesta incluidas las variantes `[null]`.
- [ ] Mantener los enlaces profundos a PDFs de hojas de vida, imágenes de galería, aforo y demás sistemas CDIAC.

---

## 11. Observaciones, riesgos y oportunidades (para el rediseño)

**Deuda técnica / hallazgos**
1. **Bootstrap 5 + BootstrapVue 2 (BS4)** mezclados y **Bootstrap CSS duplicado** (vendors + app). Elegir un solo sistema (o migrar a un design system propio/tailwind/antd moderno).
2. **Dos librerías de UI simultáneas** (ant-design-vue 1.7.8 + bootstrap-vue): unificar.
3. **GeoJSON de 3,6 MB embebido en el bundle**: sacarlo a archivo estático/API (TopoJSON simplificado) reduciría el JS de ~3,8 MB a ~200 KB.
4. **Sin enrutado**: no hay URLs profundas a estación/pestaña; en el rediseño conviene rutas (`/estacion/:id/variables`).
5. **Sin i18n real** (textos hardcodeados en español) y `lang="en"` incorrecto; posibles mejoras de accesibilidad (aria, foco, alt, navegación por teclado; los marcadores no son accesibles por teclado).
6. **Iconos como `<img>` dentro del marcador** con hack de re‑render (`newKey`); un rediseño puede usar `L.divIcon` o capas GeoJSON con estilos reactivos.
7. **Errores silenciosos** en la carga de listas (`console.log` solamente). El modal de error solo cubre el detalle de estación.
8. **Rate limit de 60 req/min**: cada estación abierta consume 4 peticiones; revisar estrategia (caché, deduplicación).
9. **PHP 7.2 (EOL), Debugbar activa en producción** (`phpdebugbar-id`), `no-cache` en todas las respuestas.
10. **Inconsistencias de nombre**: "Freatrimétricas" (menú) vs "Aguas Freáticas" (tipo) vs "Aguas Subterráneas" (convenciones); "Hidrometeorológicas" vs `hydrometeorological`; campo `presure` (typo) del backend.
11. Fechas/horas sin zona horaria explícita (todo hora local del servidor).
12. La sesión Laravel (`/etl-cdiac/broadcast`) se precalienta aunque el canal es público — posible simplificación.

**Oportunidades de UX**
- Estado de conexión por estación visible en la lista/buscador (hoy solo en el icono del mapa).
- Unificar leyenda y buscador en un panel de estaciones (filtro por tipología, municipio, red, estado).
- Gráficas más legibles (hoy: muchas pestañas anidadas, textos redundantes de "% datos recuperados").
- Deep links compartibles, favoritos y exportación de datos (CSV/JSON) — la API ya entrega series completas.
- PWA/offline y carga diferida del GeoJSON.

---

## Anexo A — Cómo inspeccionar la extracción

```bash
# Ver todas las peticiones capturadas (método, status, tamaño, ruta)
python3 -c "
import json
d = json.load(open('http_cdiac.manizales.unal.edu.co.json'))
for r in sorted(d['requests'], key=lambda x: x['ts_start']):
    print(r['method'], r['status_code'], len(r.get('response_body') or ''), r['path'])
"

# Mensajes WebSocket decodificados
python3 -c "
import json
d = json.load(open('websockets_cdiac.manizales.unal.edu.co.json'))
for m in d['messages']:
    print('>' if m['from_client'] else '<', m['content'][:200])
"

# Localizar un componente dentro del bundle (scripts.js contiene ~4 copias)
grep -o 'name:\"StationMenu\"' cdiac.manizales.unal.edu.co/geoportal-simac/scripts.js
```

## Anexo B — Fragmentos de referencia del bundle

**Config de endpoints y enlaces (objeto `u` + `W`):**

```js
W = {
  stations_typology: "https://cdiac.manizales.unal.edu.co/etl-cdiac/api/apiGeo/getListStationsByTypology/",
  station_info:      "https://cdiac.manizales.unal.edu.co/etl-cdiac/api/apiGeo/getStation/",
  station_data:      "https://cdiac.manizales.unal.edu.co/etl-cdiac/api/apiGeo/getLastDayDataByStation/",
  precipitation_A25: "https://cdiac.manizales.unal.edu.co/etl-cdiac/api/apiGeo/getAccumPpt",
  precipitation_A3:  "https://cdiac.manizales.unal.edu.co/etl-cdiac/api/apiGeo/getA3ById/",
  broadcast_websocket: "https://cdiac.manizales.unal.edu.co/etl-cdiac/broadcast"
}
u = {
  aforo: ".../aforo.php",
  galery_images: ".../gestion-riesgo/web/resources/uploads/images/",
  galery_pdf: ".../hv",
  cdiac: ".../indicadores/public/index",
  facebook: "https://www.facebook.com/SIMACUNAL/",
  inicio: "https://cdiac.manizales.unal.edu.co/geoportal-simac",
  reporte_metereologico: "http://idea.manizales.unal.edu.co/reporte-meteorologico.html",
  twitter: "https://twitter.com/simac_unal",
  email: ".../solicitud_informacion/seleccionar_formulario",
  idea: "http://idea.manizales.unal.edu.co"
}
```

**Acción `Get_Station_Id` (4 llamadas en serie):**

```js
const info = await axios.post(W.station_info + id);
const data = await axios.post(W.station_data + id);
const a3   = await axios.post(W.precipitation_A3 + id);
const a25  = await axios.post(W.precipitation_A25, { id, period: "24" });
```
