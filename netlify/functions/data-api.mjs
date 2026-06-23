import { getStore } from "@netlify/blobs";

const DEFAULT_ACTIVITIES = [
  {
    cat: "Ateliers permanents",
    items: [
      "Visite du potager mandala",
      "Atelier semis & repiquage",
      "Atelier compost & sol vivant",
      "Découverte de la permaculture"
    ]
  },
  {
    cat: "Ateliers du mois",
    items: ["Atelier taille & greffe", "Cueillette sauvage"]
  },
  {
    cat: "Jeux et activités nocturnes",
    items: [
      "Observation des lucioles (juin-juillet)",
      "Soirée contes au coin du feu"
    ]
  },
  {
    cat: "Découverte de la région",
    items: [
      "Balade au bord du Val du Breuil",
      "Circuit des villages du Pays d'Houlme"
    ]
  }
];

const DEFAULT_EVENTS = [];
const DEFAULT_NEWS = [];

const DEFAULTS = {
  activities: DEFAULT_ACTIVITIES,
  events: DEFAULT_EVENTS,
  news: DEFAULT_NEWS
};

export default async function handler(req, context) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      }
    });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (!["activities", "events", "news"].includes(type)) {
    return new Response(JSON.stringify({ error: "Type invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const store = getStore("castelboun");

  // ---- LECTURE ----
  if (req.method === "GET") {
    try {
      const data = await store.get(type, { type: "json" });
      return Response.json(data ?? DEFAULTS[type], {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    } catch {
      return Response.json(DEFAULTS[type], {
        headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  // ---- ÉCRITURE (mot de passe requis) ----
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON invalide" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const adminPw = process.env.ADMIN_PASSWORD || "castelboun2026";
    if (body.password !== adminPw) {
      return new Response(JSON.stringify({ error: "Mot de passe incorrect" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    await store.setJSON(type, body.data);
    return Response.json({ ok: true }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  return new Response("Méthode non autorisée", { status: 405 });
}

export const config = {
  path: "/.netlify/functions/data-api"
};
