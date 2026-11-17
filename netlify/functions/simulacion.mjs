import { getStore } from "@netlify/blobs";

// Endpoint: /api/simulacion
//   GET  -> devuelve el estado actual
//   GET ?src=bot -> igual, y anota la hora de lectura (lo usa el bot; se ve en el formulario)
//   POST -> {ByPassSystemDate, date, hour}  guarda
//        -> {reset: true}                   apaga la simulación (vuelve a hora real)

export const config = { path: "/api/simulacion" };

const KEY = "simulacion";
const DEFAULT_STATE = { ByPassSystemDate: "false", date: "", hour: "", updatedAt: null, lastBotRead: null };

// Copia en memoria: respaldo si Blobs no está disponible. Se pierde en un arranque en frío.
let memory = { ...DEFAULT_STATE };

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

async function readState() {
  try {
    const stored = await getStore("divina-sim").get(KEY, { type: "json" });
    if (stored) {
      memory = stored;
      return stored;
    }
  } catch (_) {
    /* sin Blobs: usamos memoria */
  }
  return memory;
}

async function writeState(state) {
  memory = state;
  try {
    await getStore("divina-sim").setJSON(KEY, state);
  } catch (_) {
    /* sin Blobs: queda en memoria */
  }
}

function normalizeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + "T00:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === value ? value : null;
}

function normalizeHour(value) {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [h, mi, s] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  if (h > 23 || mi > 59 || s > 59) return null;
  return `${m[1]}:${m[2]}:${String(s).padStart(2, "0")}`;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  if (req.method === "GET") {
    const state = await readState();
    if (new URL(req.url).searchParams.get("src") === "bot") {
      const next = { ...state, lastBotRead: new Date().toISOString() };
      await writeState(next);
      return json(next);
    }
    return json(state);
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (_) {
      return json({ error: "El cuerpo debe ser JSON válido." }, 400);
    }

    const current = await readState();

    if (body.reset === true) {
      const next = { ...current, ByPassSystemDate: "false", updatedAt: new Date().toISOString() };
      await writeState(next);
      return json(next);
    }

    const on = body.ByPassSystemDate === true || String(body.ByPassSystemDate).toLowerCase() === "true";
    const date = normalizeDate(body.date);
    const hour = normalizeHour(body.hour);

    if (on && (!date || !hour)) {
      return json({ error: "Para activar la simulación hacen falta una fecha (AAAA-MM-DD) y una hora (HH:MM o HH:MM:SS) válidas." }, 400);
    }

    const next = {
      ...current,
      ByPassSystemDate: on ? "true" : "false",
      date: date || current.date,
      hour: hour || current.hour,
      updatedAt: new Date().toISOString(),
    };
    await writeState(next);
    return json(next);
  }

  return json({ error: "Método no permitido." }, 405);
};
