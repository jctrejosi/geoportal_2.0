import { useEffect, useMemo, useState } from "react";

/* ============================================================
   Geoportal SIMAC — prototipo interactivo (rediseño Figma Make)
   Referencias: plans/redesign.md · plans/contexto-geoportal-simac.md
   ============================================================ */

/* ----------------------------- Iconos ----------------------------- */

type IconName =
  | "search" | "layers" | "users" | "more" | "close" | "external" | "file" | "expand"
  | "download" | "plus" | "minus" | "map" | "sun" | "cloud" | "rain" | "moon" | "moonRain"
  | "offline" | "check" | "left" | "right" | "chevron";

const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></>,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  cloud: <path d="M17.5 19H7a5 5 0 1 1 1.8-9.7A6 6 0 0 1 20 12.5 3.5 3.5 0 0 1 17.5 19Z" />,
  rain: <><path d="M17 15H7a5 5 0 1 1 1.8-9.7A6 6 0 0 1 20 8.5 3.5 3.5 0 0 1 17 15Z" /><path d="m8 19-1 2M13 19l-1 2M18 19l-1 2" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  moonRain: <><path d="M20.2 13.6A8.4 8.4 0 1 1 10.4 3.8a6.3 6.3 0 0 0 9.8 9.8Z" /><path d="m8.5 19.5-.8 1.8M13 19.5l-.8 1.8M17.5 19.5l-.8 1.8" /></>,
  offline: <><path d="M5 5 19 19M16.7 12.7A7 7 0 0 0 7.5 7.5M8.5 16.5a5 5 0 0 1 7 0M12 20h.01" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg className="icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">{paths[name]}</svg>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; variant?: "primary" | "secondary" | "ghost" | "icon" };

function Button({ icon, variant = "secondary", className = "", children, ...props }: BtnProps) {
  return <button className={`button button--${variant} ${className}`} {...props}>{icon && <Icon name={icon} />} {children}</button>;
}

/* ----------------------------- Datos ----------------------------- */

type Status = "live" | "partial" | "out" | "offline";

type Station = {
  id: number; name: string; type: string; municipality: string; network: string;
  x: number; y: number; status: Status; icon: IconName;
  temp: string; rain: string; time: string; ago: string;
  code: string; typology: string; altitude: string; coords: string; location: string;
  basin?: string; subBasin?: string; owner: string; since: string; tare?: string;
  aforo: boolean; cv: boolean; gallery: number; hasData: boolean; noData: string[];
  recovered: number;
};

const types = [
  { id: "all", label: "Todas", count: 159 },
  { id: "hydro", label: "Hidrometeorológicas", count: 79 },
  { id: "community", label: "Comunitarias", count: 50 },
  { id: "water", label: "Aguas subterráneas", count: 12 },
  { id: "air", label: "Calidad del aire", count: 8 },
  { id: "seismic", label: "Acelerográficas", count: 10 },
];

const stations: Station[] = [
  {
    id: 63, name: "Río Tapias", type: "hydro", municipality: "Neira", network: "Caldas", x: 27, y: 34,
    status: "live", icon: "sun", temp: "31.5 °C", rain: "0 mm", time: "14:37", ago: "hace 2 min",
    code: "174860302002", typology: "Hidrometeorológica", altitude: "825 m s. n. m.",
    coords: "5° 13′ 21.6″ N · 75° 38′ 15.9″ W", location: "Unión Río Tapias – Río Tareas",
    basin: "Río Tapias", subBasin: "Río Guacaica", owner: "Corpocaldas", since: "18 jul 2013", tare: "537 cm",
    aforo: true, cv: true, gallery: 2, hasData: true, noData: ["Presión", "Radiación"], recovered: 100,
  },
  {
    id: 292, name: "Río Supía – San Cayetano", type: "hydro", municipality: "Supía", network: "Caldas", x: 42, y: 19,
    status: "live", icon: "rain", temp: "33.8 °C", rain: "2.2 mm", time: "14:36", ago: "hace 3 min",
    code: "—", typology: "Hidrometeorológica", altitude: "1 215 m s. n. m.",
    coords: "5° 27′ 16.6″ N · 75° 40′ 4.0″ W", location: "Ladrillera Altavista",
    basin: "Río Cauca", subBasin: "Río Supía", owner: "Corpocaldas", since: "21 nov 2023", tare: "850 cm",
    aforo: true, cv: true, gallery: 2, hasData: true, noData: ["Presión", "Radiación"], recovered: 98.3,
  },
  {
    id: 155, name: "Q. El Guamo – CDI San Sebastián", type: "hydro", municipality: "Manizales", network: "Caldas", x: 48, y: 54,
    status: "partial", icon: "cloud", temp: "21.2 °C", rain: "0 mm", time: "14:31", ago: "hace 9 min",
    code: "174860105003", typology: "Hidrometeorológica", altitude: "1 010 m s. n. m.",
    coords: "5° 5′ 12.8″ N · 75° 29′ 13.2″ W", location: "Colegio San Sebastián",
    basin: "Río Guacaica", owner: "Corpocaldas", since: "12 mar 2018",
    aforo: false, cv: true, gallery: 2, hasData: true, noData: ["Presión", "Radiación", "Nivel"], recovered: 87.4,
  },
  {
    id: 209, name: "Q. Guayabal – Recinto del Pensamiento", type: "hydro", municipality: "Manizales", network: "Caldas", x: 61, y: 59,
    status: "live", icon: "cloud", temp: "20.8 °C", rain: "0 mm", time: "14:37", ago: "hace 2 min",
    code: "174860102004", typology: "Hidrometeorológica", altitude: "1 620 m s. n. m.",
    coords: "5° 2′ 29.1″ N · 75° 26′ 44.5″ W", location: "Recinto del Pensamiento",
    basin: "Río Chinchiná", owner: "Corpocaldas", since: "3 jun 2017",
    aforo: false, cv: true, gallery: 2, hasData: true, noData: ["Presión", "Radiación", "Nivel"], recovered: 99.7,
  },
  {
    id: 153, name: "Q. La Francia – Los Puentes", type: "hydro", municipality: "Manizales", network: "Caldas", x: 35, y: 66,
    status: "live", icon: "rain", temp: "19.4 °C", rain: "1.4 mm", time: "14:35", ago: "hace 4 min",
    code: "174860101006", typology: "Hidrometeorológica", altitude: "1 855 m s. n. m.",
    coords: "5° 3′ 44.0″ N · 75° 32′ 46.1″ W", location: "Lavadero Los Puentes",
    basin: "Río Chinchiná", owner: "Corpocaldas", since: "8 sep 2015",
    aforo: true, cv: true, gallery: 2, hasData: true, noData: ["Presión", "Radiación", "Nivel"], recovered: 96.2,
  },
  {
    id: 161, name: "Río Chinchiná – Bosque Popular", type: "hydro", municipality: "Manizales", network: "Caldas", x: 52, y: 76,
    status: "offline", icon: "offline", temp: "—", rain: "—", time: "12:10", ago: "hace 2 h",
    code: "174860103001", typology: "Hidrometeorológica", altitude: "1 990 m s. n. m.",
    coords: "5° 1′ 54.4″ N · 75° 28′ 40.5″ W", location: "Bosque Popular",
    basin: "Río Chinchiná", owner: "Corpocaldas", since: "25 abr 2014",
    aforo: false, cv: true, gallery: 2, hasData: false, noData: [], recovered: 0,
  },
  {
    id: 255, name: "Filadelfia Bomberos – JDEGER", type: "community", municipality: "Filadelfia", network: "Estaciones Comunitarias", x: 20, y: 20,
    status: "offline", icon: "users", temp: "—", rain: "—", time: "Sin datos", ago: "sin transmisión",
    code: "172720401001", typology: "Meteorológica no telemétrica", altitude: "1 593 m s. n. m.",
    coords: "5° 17′ 42.8″ N · 75° 33′ 40.8″ W", location: "Cuerpo Oficial de Bomberos de Filadelfia",
    owner: "JDEGER", since: "6 dic 2019",
    aforo: false, cv: false, gallery: 0, hasData: false, noData: [], recovered: 0,
  },
  {
    id: 76, name: "Pozo La Nubia", type: "water", municipality: "Manizales", network: "Aguas Freáticas", x: 70, y: 68,
    status: "live", icon: "cloud", temp: "18.6 °C", rain: "0 mm", time: "14:37", ago: "hace 2 min",
    code: "174860402002", typology: "Aguas Freáticas", altitude: "2 150 m s. n. m.",
    coords: "5° 2′ 6.5″ N · 75° 27′ 54.0″ W", location: "Planta La Nubia",
    basin: "Río Chinchiná", owner: "Aguas de Manizales", since: "17 feb 2016", tare: "1 120 cm",
    aforo: false, cv: true, gallery: 2, hasData: true, noData: ["Precipitación", "Radiación"], recovered: 99.1,
  },
  {
    id: 82, name: "Gobernación de Caldas", type: "air", municipality: "Manizales", network: "Calidad del Aire", x: 45, y: 70,
    status: "live", icon: "sun", temp: "22.1 °C", rain: "0 mm", time: "14:36", ago: "hace 3 min",
    code: "170010502001", typology: "Calidad del aire", altitude: "2 180 m s. n. m.",
    coords: "5° 4′ 3.0″ N · 75° 30′ 58.0″ W", location: "Palacio de la Gobernación",
    owner: "Corpocaldas", since: "10 ago 2019",
    aforo: false, cv: true, gallery: 2, hasData: true, noData: ["Precipitación", "Nivel"], recovered: 97.8,
  },
  {
    id: 91, name: "Acelerógrafo Villamaría", type: "seismic", municipality: "Villamaría", network: "Sismológica", x: 63, y: 82,
    status: "live", icon: "sun", temp: "—", rain: "—", time: "14:37", ago: "hace 2 min",
    code: "175010301002", typology: "Sismológica", altitude: "2 040 m s. n. m.",
    coords: "5° 2′ 43.7″ N · 75° 30′ 43.2″ W", location: "Hospital de Villamaría",
    owner: "Corpocaldas", since: "28 ene 2021",
    aforo: false, cv: true, gallery: 2, hasData: false, noData: [], recovered: 0,
  },
];

const statusText: Record<string, string> = { live: "En vivo", partial: "Funcionamiento parcial", out: "Temporalmente fuera de servicio", offline: "Sin conexión" };

const variableNames = ["Precipitación", "Temperatura", "Humedad", "Viento", "Dirección", "Presión", "Radiación", "Nivel"];

const VAR_META: Record<string, { unit: string; color: string; dec: number }> = {
  Precipitación: { unit: "mm", color: "#3b82f6", dec: 1 },
  Temperatura: { unit: "°C", color: "#ef4444", dec: 1 },
  Humedad: { unit: "%", color: "#22c55e", dec: 0 },
  Viento: { unit: "m/s", color: "#a855f7", dec: 2 },
  Dirección: { unit: "°", color: "#6366f1", dec: 0 },
  Presión: { unit: "mmHg", color: "#f97316", dec: 1 },
  Radiación: { unit: "W/m²", color: "#eab308", dec: 0 },
  Nivel: { unit: "cm", color: "#4f46e5", dec: 1 },
};

const HV_URL = "https://cdiac.manizales.unal.edu.co/hv";
const AFORO_URL = "https://cdiac.manizales.unal.edu.co/aforo.php";
const CDIAC_URL = "https://cdiac.manizales.unal.edu.co/indicadores/public/index";

/* ------------------- Series simuladas (deterministas) ------------------- */

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd2 = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

function buildSeries(name: string, n: number): number[] {
  const rnd = mulberry(hash(name));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    switch (name) {
      case "Temperatura":
        out.push(rnd2(30.2 + 2.6 * Math.sin((t - 0.18) * Math.PI * 2) + (rnd() - 0.5) * 0.8, 1));
        break;
      case "Humedad":
        out.push(Math.round(86 - 24 * Math.sin((t - 0.18) * Math.PI * 2) + (rnd() - 0.5) * 7));
        break;
      case "Viento":
        out.push(rnd2(1.2 + 2.4 * Math.abs(Math.sin(t * Math.PI * 3.2)) + (rnd() - 0.5) * 1.4, 2));
        break;
      case "Presión":
        out.push(rnd2(754.6 + 1.6 * Math.sin(t * Math.PI * 2 + 1.1) + (rnd() - 0.5) * 0.5, 1));
        break;
      case "Radiación": {
        const sun = Math.max(0, Math.sin((t - 0.22) * Math.PI * 2));
        out.push(Math.round(sun * 760 * (0.8 + 0.35 * rnd())));
        break;
      }
      case "Nivel":
        out.push(rnd2(218.8 + 1.5 * Math.sin(t * Math.PI * 2 + 0.6) + (rnd() - 0.5) * 0.5, 1));
        break;
      case "Precipitación":
      case "Precipitación A3": {
        let v = 0;
        const off = name === "Precipitación A3" ? 37 : 0;
        const segs: [number, number, number][] = [[170, 9, 2.2], [196, 8, 1.6], [266, 6, 0.6]];
        for (const [a, len, peak] of segs) {
          const s = a + off;
          if (i >= s && i <= s + len - 1) v = Math.max(v, Math.max(0.2, Math.sin(((i - s + 1) / (len + 1)) * Math.PI) * peak));
        }
        out.push(rnd2(v, 1));
        break;
      }
      default:
        out.push(0);
    }
  }
  return out;
}

const DAILY_PPT = [0.2, 0, 1.4, 1.2, 0.4, 14, 2.8, 3, 0, 2.8, 0, 7.2, 0, 12.2, 61.4, 3.6, 3.4, 0, 8.8, 0, 4.4, 2.6, 2.6, 5.8, 6.2];

const runSum = (a: number[]) => {
  let s = 0;
  return a.map((v) => { s = rnd2(s + v, 1); return s; });
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function times5min(end: string, n: number): string[] {
  const [h, m] = end.split(":").map(Number);
  const total = h * 60 + m;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = ((total - (n - 1 - i) * 5) % 1440 + 1440) % 1440;
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

function timesDaily(n: number): string[] {
  const end = new Date(2026, 9, 15);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - (n - 1 - i));
    out.push(`${d.getDate()} ${MONTHS[d.getMonth()]}`);
  }
  return out;
}

function shiftTime(t: string, back: number) {
  const [h, m] = t.split(":").map(Number);
  const total = (((h * 60 + m - back) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const fmtv = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : "—");

function toDMS(v: number, pos: string, neg: string) {
  const a = Math.abs(v);
  const deg = Math.floor(a);
  const min = Math.floor((a - deg) * 60);
  const sec = ((a - deg) * 60 - min) * 60;
  return `${deg}° ${min}′ ${sec.toFixed(1)}″ ${v >= 0 ? pos : neg}`;
}
const coordsLabel = (lat: number, lon: number) => `${toDMS(lat, "N", "S")} · ${toDMS(lon, "E", "W")}`;

/* ----------------------------- Brand + búsqueda ----------------------------- */

function Brand() {
  return (
    <div className="brand">
      <div className="brand__mark">S</div>
      <div><strong>Geoportal SIMAC</strong><span>Monitoreo ambiental de Caldas</span></div>
    </div>
  );
}

function Search({ open, setOpen, onSelect }: { open: boolean; setOpen: (v: boolean) => void; onSelect: (id: number) => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const found = stations.filter((s) => `${s.name} ${s.municipality} ${s.id}`.toLowerCase().includes(q.toLowerCase()));
  const list = found.slice(0, 6);
  return (
    <div className="search">
      <label>
        <Icon name="search" />
        <input
          value={q}
          aria-label="Buscar estación"
          placeholder="Buscar estación…"
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && list[active]) onSelect(list[active].id);
          }}
        />
        <kbd>⌘ K</kbd>
      </label>
      {open && (
        <div className="results" role="listbox" aria-label="Resultados de búsqueda">
          <header>{q ? `${found.length} resultados` : "Estaciones recientes"}<span>↑↓ para navegar</span></header>
          {list.length ? list.map((s, i) => (
            <button
              key={s.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? "active" : ""}
              onMouseEnter={() => setActive(i)}
              onClick={() => onSelect(s.id)}
            >
              <i className={`type-icon ${s.type}`}><Icon name={s.icon} size={15} /></i>
              <span><strong>{s.name}</strong><small>{s.municipality} · {s.network}</small></span>
              <em><b className={`status ${s.status}`}>{statusText[s.status]}</b><small>Últ. dato {s.time}</small></em>
            </button>
          )) : (
            <div className="empty">
              <Icon name="search" />
              <strong>No se encontraron estaciones para «{q}»</strong>
              <span>Revisa la ortografía o busca por municipio.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Mapa ----------------------------- */

function MapView({
  type, selected, raining, zoom, pan, loading, onSelect, onCoords,
}: {
  type: string; selected: number | null; raining: boolean; zoom: number; pan: { x: number; y: number } | null;
  loading: boolean; onSelect: (n: number) => void; onCoords: (s: string) => void;
}) {
  return (
    <main
      className={`map${loading ? " is-loading" : ""}`}
      aria-label="Mapa de estaciones ambientales de Caldas"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const fx = (e.clientX - r.left) / r.width;
        const fy = (e.clientY - r.top) / r.height;
        onCoords(coordsLabel(5.4 - fy * 0.5, -75.9 + fx * 0.65));
      }}
    >
      <div className="map-inner" style={{ transform: `scale(${zoom}) translate(${pan ? -(pan.x - 50) : 0}%, ${pan ? -(pan.y - 50) : 0}%)` }}>
        <svg viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
          <rect width="1200" height="800" className="ground" />
          <g className="terrain"><path d="M-20 130C130 40 250 220 410 110S680 30 830 130s240 0 390-65v250c-160 85-300-50-450 30s-280-10-430 70S100 500-20 570Z" /></g>
          <g className="municipal">
            {["85,64 295,79 375,239 265,389 75,309", "295,79 475,119 545,284 375,239", "475,119 685,104 765,279 545,284", "685,104 905,184 870,359 765,279", "75,309 265,389 330,579 100,669", "265,389 545,284 580,539 330,579", "545,284 765,279 800,539 580,539", "765,279 1115,154 1105,594 800,539", "100,669 330,579 430,829 120,829", "330,579 580,539 680,799 430,829", "580,539 800,539 890,809 680,799"].map((p, i) => <polygon points={p} key={i} />)}
          </g>
          <g className="roads">
            <path d="M-20 710C180 630 235 380 480 430s370-170 740-95" />
            <path d="M160-20c40 210 275 280 250 470s230 190 250 370" />
            <path d="M580-20c-30 210 200 255 140 430s200 240 260 410" />
          </g>
          <g className="rivers">
            <path d="M280-20c-80 170 120 250 15 420S430 650 350 820" />
            <path d="M970-20c-90 170 40 250-75 430S970 680 820 820" />
          </g>
          <g className="labels">
            <text x="195" y="175">FILADELFIA</text>
            <text x="410" y="245">NEIRA</text>
            <text x="570" y="480">MANIZALES</text>
            <text x="710" y="685">VILLAMARÍA</text>
          </g>
        </svg>
        {stations.filter((s) => type === "all" || s.type === type).map((s) => (
          <button
            key={s.id}
            aria-label={`${s.name}, ${statusText[s.status]}`}
            className={`marker ${s.type} ${s.status} ${selected === s.id ? "selected" : ""} ${raining && s.id === 63 ? "updated" : ""}`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            onClick={() => onSelect(s.id)}
          >
            <Icon name={raining && s.id === 63 ? "rain" : s.icon} size={18} />
            <span className="tooltip">
              <strong>{s.name}</strong>
              <small>{types.find((t) => t.id === s.type)?.label}</small>
              <b className={`status ${s.status}`}>{statusText[s.status]}</b>
              <small>Última transmisión: {s.time}</small>
              <em>{s.temp} · {s.rain}</em>
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}

/* ----------------------------- Gráfica (series) ----------------------------- */

type ChartProps = {
  values: number[]; times: string[]; cumulative?: number[]; unit: string; color: string;
  dec: number; rain?: boolean; barLabel?: string; title: string;
};

function Chart({ values, times, cumulative, unit, color, dec, rain = false, barLabel = "mm/5 min", title }: ChartProps) {
  const [win, setWin] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = values.length;
  const areaVals = cumulative ?? values;
  const [i0, i1] = win ?? [0, n - 1];
  const aWin = areaVals.slice(i0, i1 + 1);
  const vWin = values.slice(i0, i1 + 1);
  const tWin = times.slice(i0, i1 + 1);
  const max = Math.max(...aWin);
  const min = Math.min(...aWin);
  const span = max - min || 1;
  const X = (j: number) => 35 + (j / (i1 - i0 || 1)) * 375;
  const Y = (v: number) => 140 - ((v - min) / span) * 115;
  const path = aWin.map((v, j) => `${j ? "L" : "M"}${X(j).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
  const vmax = Math.max(...vWin, 0.0001);
  const idxAt = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 420;
    const f = (p - 35) / 375;
    return Math.max(0, Math.min(n - 1, Math.round(i0 + f * (i1 - i0))));
  };
  const tipText = hover != null
    ? `${times[hover]} · ${fmtv(areaVals[hover], dec)} ${unit}${rain ? ` · +${fmtv(values[hover], dec)} ${barLabel}` : ""}`
    : "";
  const tipW = Math.max(70, tipText.length * 4.4 + 14);

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox="0 0 420 160"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Gráfica de ${title}`}
        onMouseMove={(e) => {
          const i = idxAt(e.clientX, e.currentTarget);
          if (drag) setDrag({ ...drag, b: i });
          else setHover(i);
        }}
        onMouseDown={(e) => { const i = idxAt(e.clientX, e.currentTarget); setDrag({ a: i, b: i }); }}
        onMouseUp={() => {
          if (drag && Math.abs(drag.b - drag.a) >= 8) {
            setWin([Math.min(drag.a, drag.b), Math.max(drag.a, drag.b)]);
          }
          setDrag(null);
          setHover(null);
        }}
        onMouseLeave={() => { setDrag(null); setHover(null); }}
      >
        <g className="grid"><path d="M35 25H410M35 82H410M35 140H410" /></g>
        <g className="axis">
          <text x="3" y="28">{fmtv(max, dec)}</text>
          <text x="3" y="85">{fmtv((max + min) / 2, dec)}</text>
          <text x="3" y="143">{fmtv(min, dec)}</text>
          <text x="35" y="157">{tWin[0]}</text>
          <text x="205" y="157">{tWin[Math.floor(tWin.length / 2)]}</text>
          <text x="368" y="157">{tWin[tWin.length - 1]}</text>
        </g>
        {rain && (
          <g className="bars">
            {vWin.map((v, j) => (
              <rect key={j} x={X(j) - 3} y={140 - (v / vmax) * 105} width="6" height={(v / vmax) * 105} rx="2" style={{ fill: `${color}88` }} />
            ))}
          </g>
        )}
        <path className="area" d={`${path}V140H35Z`} style={{ fill: `${color}22` }} />
        <path className="line" d={path} style={{ stroke: color }} />
        {hover != null && (
          <g>
            <line className="hoverline" x1={X(hover - i0)} y1="25" x2={X(hover - i0)} y2="140" />
            <circle cx={X(hover - i0)} cy={Y(areaVals[hover])} r="5" style={{ stroke: color }} />
            <g className="tip">
              <rect x={Math.max(35, Math.min(X(hover - i0) - tipW / 2, 410 - tipW))} y="3" width={tipW} height="24" rx="7" />
              <text x={Math.max(43, Math.min(X(hover - i0) - tipW / 2 + 8, 418 - tipW))} y="19">{tipText}</text>
            </g>
          </g>
        )}
        {drag && Math.abs(drag.b - drag.a) >= 2 && (
          <rect className="sel" x={X(Math.min(drag.a, drag.b) - i0)} y="25" width={Math.max(2, X(Math.max(drag.a, drag.b) - i0) - X(Math.min(drag.a, drag.b) - i0))} height="115" />
        )}
      </svg>
      {win && <button className="chart-reset" onClick={() => setWin(null)}>Restablecer zoom</button>}
    </div>
  );
}

/* ----------------------------- Rosa de vientos ----------------------------- */

const ROSE_DAY = [4.6, 5.2, 6.1, 5.4, 4.2, 3.1, 2.6, 2.2, 3.4, 4.8, 6.2, 7.4, 8.6, 8.2, 7.6, 6.4];
const ROSE_NIGHT = [3.4, 4, 5.2, 6.8, 7.6, 6.4, 5.2, 4.6, 5.8, 6.6, 7.8, 8.4, 8, 7.2, 6.4, 5.6];

function WindRose() {
  const cx = 210, cy = 94, maxR = 70, k = 7.4;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  const pt = (a: number, r: number): [number, number] => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const sector = (a0: number, a1: number, r0: number, r1: number) => {
    const [x0, y0] = pt(a0, r0), [x1, y1] = pt(a0, r1), [x2, y2] = pt(a1, r1), [x3, y3] = pt(a1, r0);
    const f = (v: number) => v.toFixed(2);
    return `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}A${f(r1)} ${f(r1)} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${f(r0)} ${f(r0)} 0 0 0 ${f(x0)} ${f(y0)}Z`;
  };
  return (
    <>
      <svg className="rose" viewBox="115 3 190 186" role="img" aria-label="Rosa de vientos de las últimas 24 horas">
        {[24, 42, 58, maxR].map((r) => <circle key={r} className="ring" cx={cx} cy={cy} r={r} />)}
        {dirs.map((_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          const [x1, y1] = pt(a, 6), [x2, y2] = pt(a, maxR);
          return <line key={i} className="spoke" x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        {dirs.map((_, i) => {
          const c = (i * 22.5 * Math.PI) / 180;
          const d0 = c - (10.25 * Math.PI) / 180, d1 = c - (0.5 * Math.PI) / 180;
          const n0 = c + (0.5 * Math.PI) / 180, n1 = c + (10.25 * Math.PI) / 180;
          return (
            <g key={i}>
              <path d={sector(d0, d1, 6, 6 + ROSE_DAY[i] * k)} style={{ fill: "#6366f1dd" }} />
              <path d={sector(n0, n1, 6, 6 + ROSE_NIGHT[i] * k)} style={{ fill: "#0f172add" }} />
            </g>
          );
        })}
        {dirs.filter((_, i) => i % 2 === 0).map((d, x) => {
          const a = (x * 45 * Math.PI) / 180;
          const [lx, ly] = pt(a, maxR + 11);
          return <text key={d} x={lx} y={ly + 3} textAnchor="middle">{d}</text>;
        })}
      </svg>
      <div className="rose-legend">
        <span><i style={{ background: "#6366f1dd" }} />Jornada diurna (frecuencia relativa %)</span>
        <span><i style={{ background: "#0f172add" }} />Jornada nocturna (frecuencia relativa %)</span>
      </div>
    </>
  );
}

/* ----------------------------- Panel: pestañas ----------------------------- */

function Info({ station }: { station: Station }) {
  const rows: [string, string][] = [
    ["Código SIMAC", station.code],
    ["Tipo de estación", station.typology],
    ["Red", station.network],
    ["Altitud", station.altitude],
    ["Coordenadas", station.coords],
    ["Ubicación", station.location],
    ["Municipio", station.municipality],
    ...(station.basin ? [["Cuenca", station.basin]] as [string, string][] : []),
    ...(station.subBasin ? [["Sub-cuenca", station.subBasin]] as [string, string][] : []),
    ...(station.tare ? [["Tara", station.tare]] as [string, string][] : []),
    ["Propietario", station.owner],
    ["Activa desde", station.since],
  ];
  return (
    <div className="tabbody">
      <div className="heading"><div><span>Ficha técnica</span><h2>Información de la estación</h2></div></div>
      <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="actions">
        {station.cv
          ? <a className="button button--primary" href={HV_URL} target="_blank" rel="noreferrer"><Icon name="file" />Hoja de vida (PDF)</a>
          : <span className="no-cv"><Icon name="file" size={15} />Estación sin hoja de vida</span>}
        {station.aforo && <a className="button button--secondary" href={AFORO_URL} target="_blank" rel="noreferrer"><Icon name="external" />Aforo</a>}
      </div>
      <a className="textlink" href={CDIAC_URL} target="_blank" rel="noreferrer">Más información en CDIAC <Icon name="external" size={14} /></a>
      <p className="source">Fuente: IDEA–CDIAC · Universidad Nacional de Colombia</p>
    </div>
  );
}

type Kpi = { label: string; value: string; unit: string; note?: string };
type ChartCtx = {
  title: string; unit: string; color: string; dec: number; rose?: boolean; rain?: boolean;
  barLabel?: string; values: number[]; times: string[]; cumulative?: number[];
};

function Variables({ station, fullscreen }: { station: Station; fullscreen: (c: ChartCtx) => void }) {
  const [v, setV] = useState("Temperatura");
  const [sub, setSub] = useState("24 h (A1)");
  const [exporting, setExporting] = useState(false);

  const meta = VAR_META[v];
  const empty = station.noData.includes(v);

  const series = useMemo(() => {
    if (empty || v === "Dirección") return { values: [] as number[], times: [] as string[], cumulative: undefined as number[] | undefined };
    if (v === "Precipitación") {
      if (sub === "Indicador A25") return { values: DAILY_PPT, times: timesDaily(DAILY_PPT.length), cumulative: runSum(DAILY_PPT) };
      const n = sub === "Indicador A3" ? 864 : 288;
      const values = buildSeries(sub === "Indicador A3" ? "Precipitación A3" : "Precipitación", n);
      return { values, times: times5min(station.time, n), cumulative: runSum(values) };
    }
    const values = buildSeries(v, 288);
    return { values, times: times5min(station.time, 288), cumulative: undefined };
  }, [v, sub, empty, station.time]);

  const stats = useMemo(() => {
    const a = series.values;
    if (!a.length) return null;
    const sum = a.reduce((x, y) => x + y, 0);
    return { last: a[a.length - 1], max: Math.max(...a), min: Math.min(...a), mean: sum / a.length };
  }, [series]);

  let kpis: Kpi[] = [];
  if (!empty && stats) {
    if (v === "Precipitación") {
      if (sub === "Indicador A25") {
        kpis = [
          { label: "Acumulado del periodo", value: "144.0", unit: "mm" },
          { label: "Máx. del periodo", value: "144.0", unit: "mm" },
          { label: "Mín. del periodo", value: "9.2", unit: "mm" },
          { label: "Media diaria", value: fmtv(stats.mean, 1), unit: "mm" },
        ];
      } else {
        const cum = series.cumulative ?? [];
        const events = series.values.filter((x) => x > 0).length;
        kpis = [
          { label: "Actual", value: fmtv(stats.last, 1), unit: "mm" },
          { label: sub === "Indicador A3" ? "Acumulada (A3)" : "Acumulada (A1)", value: fmtv(cum[cum.length - 1] ?? 0, 1), unit: "mm" },
          { label: "Máx. en el periodo", value: fmtv(stats.max, 1), unit: "mm" },
          { label: "Eventos de lluvia", value: String(events), unit: "" },
        ];
      }
    } else if (v === "Dirección") {
      kpis = [
        { label: "Dirección actual", value: "245", unit: "°" },
        { label: "Recuperados · diurna", value: "92", unit: "%" },
        { label: "Recuperados · nocturna", value: "88", unit: "%" },
        { label: "Frecuencia de calma", value: "6", unit: "%" },
      ];
    } else {
      const note = v === "Nivel" && station.tare ? `Tara ${station.tare}` : undefined;
      kpis = [
        { label: v === "Nivel" ? "Nivel actual" : "Actual", value: fmtv(stats.last, meta.dec), unit: meta.unit, note },
        { label: "Máx. 24 h", value: fmtv(stats.max, meta.dec), unit: meta.unit },
        { label: "Media 24 h", value: fmtv(stats.mean, meta.dec), unit: meta.unit },
        { label: "Mín. 24 h", value: fmtv(stats.min, meta.dec), unit: meta.unit },
      ];
    }
  }

  /* Metadatos por variable: % datos recuperados y última transmisión de la última fila válida (v1 §8.2) */
  const vmeta = useMemo(() => {
    const rnd = mulberry(hash(`${station.id}:${v}`));
    return {
      recovered: Math.max(0, Math.min(100, Math.round((station.recovered + (rnd() - 0.6) * 9) * 10) / 10)),
      back: 2 + Math.floor(rnd() * 16),
    };
  }, [station.id, station.recovered, v]);
  const vtime = shiftTime(station.time, vmeta.back);

  const isRain = v === "Precipitación";
  const isRose = v === "Dirección";
  const title = isRose ? "Dirección del viento" : isRain ? `Precipitación · ${sub}` : v;
  const subtitle = isRose
    ? "Rosa de vientos · 16 sectores · últimas 24 h"
    : isRain
      ? sub === "Indicador A25" ? "Últimos 25 días · lectura diaria" : `Últimas ${sub === "Indicador A3" ? "72 h" : "24 h"} · ${sub === "Indicador A3" ? 864 : 288} lecturas cada 5 min`
      : "Últimas 24 horas · 288 lecturas cada 5 min";
  const chartProps: ChartProps = {
    values: series.values,
    times: series.times,
    cumulative: series.cumulative,
    unit: meta.unit,
    color: meta.color,
    dec: meta.dec,
    rain: isRain,
    barLabel: sub === "Indicador A25" ? "mm/día" : "mm/5 min",
    title,
  };
  const ctx: ChartCtx = { title, unit: meta.unit, color: meta.color, dec: meta.dec, rose: isRose, rain: isRain, barLabel: chartProps.barLabel, values: series.values, times: series.times, cumulative: series.cumulative };

  return (
    <div className="tabbody">
      <div className="variable-pills" role="tablist" aria-label="Variables monitoreadas">
        {variableNames.map((n) => (
          <button role="tab" aria-selected={v === n} className={v === n ? "active" : ""} key={n} onClick={() => setV(n)}>{n}</button>
        ))}
      </div>
      <div className="heading compact">
        <div><span>Variables monitoreadas</span><h2>{v}</h2></div>
        <div className="vmeta">
          {empty
            ? <b className="recovered recovered--empty"><Icon name="offline" size={13} />Sin datos</b>
            : <><b className="recovered"><Icon name="check" size={13} />{vmeta.recovered} % recuperado</b><span>Últ. transmisión {vtime}:12</span></>}
        </div>
      </div>
      {isRain && (
        <div className="segments">
          {["24 h (A1)", "Indicador A3", "Indicador A25"].map((n) => (
            <button className={sub === n ? "active" : ""} onClick={() => setSub(n)} key={n}>{n}</button>
          ))}
        </div>
      )}
      {!empty && (
        <div className="kpis">
          {kpis.map((k) => (
            <div key={k.label} style={{ borderTopColor: meta.color }}>
              <span>{k.label}</span>
              <strong>{k.value} <small>{k.unit}</small></strong>
              {k.note && <em>{k.note}</em>}
            </div>
          ))}
        </div>
      )}
      {empty ? (
        <div className="no-data">
          <Icon name="offline" />
          <div>
            <strong>Sin datos para esta variable</strong>
            <span>Esta variable no reporta datos para esta estación.</span>
          </div>
        </div>
      ) : (
        <div className="chartcard">
          <header>
            <div><strong>{title}</strong><span>{subtitle}</span></div>
            <aside>
              <Button icon="expand" variant="ghost" onClick={() => fullscreen(ctx)}>Pantalla completa</Button>
              <div className="export">
                <Button icon="download" variant="ghost" onClick={() => setExporting(!exporting)}>Exportar</Button>
                {exporting && <div>{["PNG", "SVG", "JPEG", "PDF", "Imprimir"].map((nn) => <button key={nn} onClick={() => setExporting(false)}>{nn}</button>)}</div>}
              </div>
            </aside>
          </header>
          {isRose ? <WindRose /> : <Chart {...chartProps} />}
          <footer><span>Fuente: IDEA</span><span>Última transmisión {vtime}:12</span></footer>
        </div>
      )}
    </div>
  );
}

function Gallery({ station, open }: { station: Station; open: (i: number) => void }) {
  const [i, setI] = useState(1);
  const total = station.gallery;
  return (
    <div className="tabbody gallery">
      <div className="heading">
        <div><span>Registro visual</span><h2>Galería de la estación</h2></div>
        <b>{i}/{total}</b>
      </div>
      <button className="photo" onClick={() => open(i)} aria-label={`Ampliar imagen de ${station.name}`}>
        <div className="scene"><i /><i /><i /><i /></div>
        <span>{station.name}, vista {i === 1 ? "general" : "del sensor"}</span>
      </button>
      <div className="gallery-nav">
        <Button icon="left" variant="secondary" onClick={() => setI(i === 1 ? total : i - 1)} aria-label="Anterior" />
        <span><b>{i}</b> de {total}</span>
        <Button icon="right" variant="secondary" onClick={() => setI(i === total ? 1 : i + 1)} aria-label="Siguiente" />
      </div>
    </div>
  );
}

function StationPanel({
  station, focused, close, onFocus, fullscreen, lightbox,
}: {
  station: Station; focused: boolean; close: () => void; onFocus: () => void;
  fullscreen: (c: ChartCtx) => void; lightbox: (i: number) => void;
}) {
  const [tab, setTab] = useState("info");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { if (focused) setCollapsed(false); }, [focused]);

  const toggle = () => { setCollapsed((c) => !c); onFocus(); };
  const availableVars = 8 - station.noData.length;

  return (
    <aside className={`panel${collapsed ? " panel--collapsed" : ""}`} aria-label={`Panel de ${station.name}`}>
      <div className="handle" />
      <header className="panel-head">
        <div>
          <div
            className="panel-title"
            role="button"
            tabIndex={0}
            aria-expanded={!collapsed}
            onClick={toggle}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
          >
            <div><span>Estación {station.id}</span><h1>{station.name}</h1></div>
          </div>
          <div className="panel-head-actions">
            <Button className="panel-chevron" icon="chevron" variant="icon" onClick={toggle} aria-label={collapsed ? "Expandir panel" : "Contraer panel"} />
            <Button icon="close" variant="icon" onClick={close} aria-label="Cerrar estación" />
          </div>
        </div>
        <section>
          <b className={`type-badge ${station.type}`}>{types.find((t) => t.id === station.type)?.label}</b>
          <b className="type-badge neutral">{station.network}</b>
          <b className={`status ${station.status}`}>{statusText[station.status]}</b>
        </section>
        <p>
          <i className={station.status} />
          {station.hasData
            ? <>Última transmisión <strong>{station.time}:12</strong> · {station.ago}</>
            : <>Sin transmisión en tiempo real</>}
        </p>
      </header>
      {!collapsed && (
        <>
          <nav className="tabs">
            <button className={tab === "info" ? "active" : ""} onClick={() => setTab("info")}>Información</button>
            {station.hasData && <button className={tab === "variables" ? "active" : ""} onClick={() => setTab("variables")}>Variables <span>{availableVars}</span></button>}
            {station.gallery > 0 && <button className={tab === "gallery" ? "active" : ""} onClick={() => setTab("gallery")}>Galería <span>{station.gallery}</span></button>}
          </nav>
          {!station.hasData && tab === "info" && (
            <div className="no-data">
              <Icon name="offline" />
              <div><strong>Estación sin datos telemétricos</strong><span>Esta estación no reporta datos automáticos.</span></div>
            </div>
          )}
          <div className="panel-scroll">
            {tab === "info" && <Info station={station} />}
            {tab === "variables" && station.hasData && <Variables station={station} fullscreen={fullscreen} />}
            {tab === "gallery" && station.gallery > 0 && <Gallery station={station} open={lightbox} />}
          </div>
        </>
      )}
    </aside>
  );
}

/* ----------------------------- Leyenda / modales ----------------------------- */

function Legend({ close }: { close: () => void }) {
  return (
    <div className="scrim" onMouseDown={close}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()} aria-label="Leyenda y convenciones">
        <header>
          <div><span>Ayuda del mapa</span><h2>Leyenda y convenciones</h2></div>
          <Button icon="close" variant="icon" onClick={close} aria-label="Cerrar leyenda" />
        </header>
        <div className="drawer-body">
          <section>
            <h3>Tipos de estación</h3>
            {types.slice(1).map((t) => (
              <div className="legend-row" key={t.id}>
                <i className={`type-icon ${t.id}`}><Icon name="map" size={15} /></i>
                <div><strong>{t.label}</strong><span>Red de monitoreo ambiental</span></div>
                <b>{t.count}</b>
              </div>
            ))}
          </section>
          <section>
            <h3>Estados de las estaciones</h3>
            <div className="status-grid">
              {[["live", "En vivo", "Dato recibido hace menos de 15 min"], ["partial", "Parcial", "Algunas muestras no están disponibles"], ["out", "Fuera de servicio", "Últimas 4 muestras vacías"], ["offline", "Sin conexión", "Sin transmisión en tiempo real"]].map(([k, n, d]) => (
                <div key={k}><b className={`status ${k}`}>{n}</b><p>{d}</p></div>
              ))}
            </div>
          </section>
          <section>
            <h3>Estado del tiempo observado</h3>
            <div className="weather">
              {[
                ["sun", "Día despejado", "> 24 °C"],
                ["cloud", "Parcialmente nublado", "21–24 °C"],
                ["cloud", "Día nublado", "≤ 21 °C"],
                ["rain", "Día con lluvia", "Lluvia observada"],
                ["moon", "Noche nublada", "18:00–06:00"],
                ["moonRain", "Noche con lluvia", "18:00–06:00"],
              ].map(([i, n, d], x) => (
                <div key={x}><i><Icon name={i as IconName} /></i><strong>{n}</strong><small>{d}</small></div>
              ))}
            </div>
          </section>
          <section className="map-note">
            <Icon name="map" />
            <div><strong>Límites municipales</strong><p>Las líneas punteadas señalan los municipios de Caldas.</p></div>
          </section>
        </div>
        <footer><Button variant="primary" onClick={close}>Listo</Button></footer>
      </aside>
    </div>
  );
}

const partners = ["Universidad Nacional de Colombia", "Corpocaldas", "Alcaldía de Manizales", "Gobernación de Caldas", "Aguas de Manizales", "CHEC", "EMAS / Veolia", "GAIA–FROAC", "GTA–Ingeniería Hidráulica", "Gestión del Riesgo de Manizales"];

function Collaborators({ close }: { close: () => void }) {
  return (
    <div className="scrim centered" onMouseDown={close}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()} aria-label="Colaboradores">
        <header>
          <div><span>Una red que suma</span><h2>Con esta red colaboran</h2><p>Instituciones que hacen posible el monitoreo ambiental de Caldas.</p></div>
          <Button icon="close" variant="icon" onClick={close} aria-label="Cerrar colaboradores" />
        </header>
        <div className="partners">
          {partners.map((n, i) => (
            <a href={CDIAC_URL} target="_blank" rel="noreferrer" key={n}>
              <i className={`p${i % 5}`}>{n.split(" ").map((w) => w[0]).join("").slice(0, 3)}</i>
              <strong>{n}</strong>
              <Icon name="external" size={15} />
            </a>
          ))}
        </div>
        <footer><Button variant="primary" onClick={close}>Listo</Button></footer>
      </section>
    </div>
  );
}

const resources: [string, string][] = [
  ["Reporte meteorológico", "http://idea.manizales.unal.edu.co/reporte-meteorologico.html"],
  ["Inicio Geoportal SIMAC", "https://cdiac.manizales.unal.edu.co/geoportal-simac"],
  ["Geoportal IDEA", "http://idea.manizales.unal.edu.co"],
  ["Indicadores CDIAC", CDIAC_URL],
  ["Facebook SIMAC", "https://www.facebook.com/SIMACUNAL/"],
  ["Twitter/X SIMAC", "https://twitter.com/simac_unal"],
  ["Contacto (formulario)", "https://cdiac.manizales.unal.edu.co/gestion-riesgo/web/gestion_riesgo/solicitud_informacion/seleccionar_formulario"],
];

/* ----------------------------- App ----------------------------- */

export default function App() {
  const [type, setType] = useState("all");
  const [open, setOpen] = useState<number[]>([63]);
  const [focus, setFocus] = useState<number | null>(63);
  const [search, setSearch] = useState(false);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [chartCtx, setChartCtx] = useState<ChartCtx | null>(null);
  const [photo, setPhoto] = useState<{ name: string; i: number; total: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [raining, setRaining] = useState(false);
  const [time, setTime] = useState("14:37");
  const [loadStep, setLoadStep] = useState(0);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [coords, setCoords] = useState(() => coordsLabel(5.222675, -75.6377416666667));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number; id: number } | null>(null);
  const [welcome, setWelcome] = useState(() => localStorage.getItem("simac-welcome") !== "done");

  const loading = loadStep < 5;

  /* Simulación del ciclo en vivo (5 min → 5 s en el prototipo) */
  useEffect(() => {
    const t = setTimeout(() => { setRaining(true); setTime("14:42"); }, 5000);
    return () => clearTimeout(t);
  }, []);

  /* Carga inicial simulada de las 5 tipologías */
  useEffect(() => {
    if (loadStep >= 5) return;
    const t = setTimeout(() => setLoadStep((s) => s + 1), 260);
    return () => clearTimeout(t);
  }, [loadStep]);

  /* Estado real de conexión del navegador */
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => { removeEventListener("online", on); removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (search) setSearch(false);
      else if (overlay) setOverlay(null);
      else if (menu) setMenu(false);
      else if (open.length) closeStation(focus ?? open[0]);
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  });

  const count = useMemo(() => types.find((t) => t.id === type)?.count || 159, [type]);

  const choose = (id: number, fly = false) => {
    const st = stations.find((x) => x.id === id);
    setOpen((o) => [id, ...o.filter((x) => x !== id)]);
    setFocus(id);
    setSearch(false);
    /* El buscador vuela al marcador (v1: zoom al resultado) */
    if (fly && st) {
      setPan({ x: st.x, y: st.y, id });
      setZoom((z) => Math.max(z, 1.6));
    }
  };
  const closeStation = (id: number) => {
    const next = open.filter((x) => x !== id);
    setOpen(next);
    if (focus === id) setFocus(next[0] ?? null);
    if (pan?.id === id) { setPan(null); setZoom(1); }
  };
  const closeAll = () => {
    setOpen([]);
    setFocus(null);
    if (pan) { setPan(null); setZoom(1); }
  };
  const retry = () => setOffline(!navigator.onLine);
  const zoomBy = (d: number) => {
    const next = Math.min(2.5, Math.max(0.75, Math.round((zoom + d) * 100) / 100));
    setZoom(next);
    if (next === 1) setPan(null);
  };

  return (
    <div className="app" onClick={() => menu && setMenu(false)}>
      <header className="topbar">
        <Brand />
        <Search open={search} setOpen={setSearch} onSelect={(id) => choose(id, true)} />
        <div className="top-actions">
          <div className={`live-pill${offline ? " offline" : raining ? " flash" : ""}`} role="status">
            {offline ? (
              <>
                <i /><span><strong>Sin conexión</strong> · último dato {time}</span>
                <button className="retry" onClick={retry}>Reintentar</button>
              </>
            ) : (
              <><i /><span><strong>En vivo</strong> · Actualizado {time}</span></>
            )}
          </div>
          <Button icon="layers" variant="ghost" onClick={() => setOverlay("legend")}>Capas</Button>
          <Button icon="users" variant="ghost" onClick={() => setOverlay("partners")}>Colaboradores</Button>
          <div className="resource" onClick={(e) => e.stopPropagation()}>
            <Button icon="more" variant="icon" onClick={() => setMenu(!menu)} aria-label="Recursos externos" />
            {menu && (
              <div className="resource-menu">
                <header><strong>Recursos externos</strong><span>Enlaces de interés</span></header>
                {resources.map(([n, u]) => (
                  <a href={u} target="_blank" rel="noreferrer" key={n}>{n}<Icon name="external" size={15} /></a>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="filters" aria-label="Filtrar por tipología">
        {loading
          ? Array.from({ length: 6 }, (_, i) => <div className="chip-skeleton" key={i} />)
          : types.map((t) => (
            <button key={t.id} className={`${t.id}${type === t.id ? " active" : ""}`} aria-pressed={type === t.id} onClick={() => setType(t.id)}>
              <i>{type === t.id && <Icon name="check" size={12} />}</i>
              <span>{t.label}</span>
              <b>{t.count}</b>
            </button>
          ))}
      </nav>

      <MapView type={type} selected={focus} raining={raining} zoom={zoom} pan={pan} loading={loading} onSelect={choose} onCoords={setCoords} />

      {loading && (
        <div className="map-pill" role="status">
          <span className="spinner" />
          Cargando estaciones… {Math.min(loadStep, 5)}/5
        </div>
      )}

      {offline && (
        <div className="toast" role="alert">
          <Icon name="offline" size={18} />
          <span>No se pudieron actualizar los datos en vivo.</span>
          <Button variant="secondary" onClick={retry}>Reintentar</Button>
        </div>
      )}

      <div className="map-actions">
        <Button icon="layers" onClick={() => setOverlay("legend")}>Convenciones</Button>
        <Button icon="users" onClick={() => setOverlay("partners")}>Colaboradores</Button>
      </div>

      <div className="map-tools">
        <div className="coords">{coords}</div>
        <div className="zoom">
          <Button icon="plus" variant="icon" onClick={() => zoomBy(0.25)} aria-label="Acercar" />
          <Button icon="minus" variant="icon" onClick={() => zoomBy(-0.25)} aria-label="Alejar" />
        </div>
        <span>© OpenStreetMap · {Math.max(1, Math.round(10 / zoom))} km</span>
      </div>

      <div className="visible"><i /> {count} estaciones visibles</div>

      {open.length > 0 && (
        <div className="panel-stack">
          {open.length > 1 && (
            <Button className="close-all" icon="close" onClick={closeAll}>Cerrar todas ({open.length})</Button>
          )}
          {open.map((id) => {
            const st = stations.find((x) => x.id === id);
            if (!st) return null;
            return (
              <StationPanel
                key={id}
                station={st}
                focused={focus === id}
                close={() => closeStation(id)}
                onFocus={() => setFocus(id)}
                fullscreen={(c) => { setChartCtx(c); setOverlay("chart"); }}
                lightbox={(i) => { setPhoto({ name: st.name, i, total: st.gallery }); setOverlay("photo"); }}
              />
            );
          })}
        </div>
      )}

      {overlay === "legend" && <Legend close={() => setOverlay(null)} />}
      {overlay === "partners" && <Collaborators close={() => setOverlay(null)} />}
      {overlay === "photo" && photo && (
        <div className="lightbox" onClick={() => setOverlay(null)}>
          <Button icon="close" variant="icon" aria-label="Cerrar" />
          <div><div className="scene"><i /><i /><i /><i /></div><p>{photo.name}, vista {photo.i === 1 ? "general" : "del sensor"} · {photo.i} de {photo.total}</p></div>
        </div>
      )}
      {overlay === "chart" && chartCtx && (
        <div className="lightbox" onClick={() => setOverlay(null)}>
          <Button icon="close" variant="icon" aria-label="Cerrar" />
          <div className="fullchart" onClick={(e) => e.stopPropagation()}>
            <span>{chartCtx.rose ? "Rosa de vientos · últimas 24 horas" : "Últimas 24 horas"}</span>
            <h2>{chartCtx.title}</h2>
            {chartCtx.rose ? <WindRose /> : <Chart {...chartCtx} />}
          </div>
        </div>
      )}

      {welcome && (
        <div className="welcome">
          <i><Icon name="map" /></i>
          <div><strong>Explora la red en vivo</strong><p>Toca cualquier estación para ver sus datos. Usa los chips para filtrar.</p></div>
          <Button variant="primary" onClick={() => { localStorage.setItem("simac-welcome", "done"); setWelcome(false); }}>Entendido</Button>
          <Button icon="close" variant="icon" onClick={() => setWelcome(false)} aria-label="Cerrar bienvenida" />
        </div>
      )}
    </div>
  );
}
