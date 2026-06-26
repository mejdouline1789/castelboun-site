import { getStore } from "@netlify/blobs";

const DEFAULT_ACTIVITIES = [
  {
    cat: "Ateliers permanents",
    items: [
      "Atelier défi cuisine 100% du jardin",
      "Atelier semis & repiquage",
      "Atelier compost & sol vivant",
      "Atelier découpe de bois",
      "Atelier identification de la biodiversité"
    ]
  },
  {
    cat: "Ateliers du mois",
    items: [
      "Atelier récolte fruits et légumes de saison",
      "Atelier Vin de noix 14/07",
      "Atelier Jus de pommes",
      "Atelier construction d\u2019un bar en verres"
    ]
  },
  {
    cat: "Jeux et activités nocturnes",
    items: [
      "Cinéma plein air",
      "Billard Américain, Catalan, Indien...",
      "Jeux d\u2019extérieur : Mollky, pingpong, badminton, plumfoot...",
      "Jeux de société : Foufoufou, Belote coinche, Skyjo...",
      "Soirée karaoké / Blindtest"
    ]
  },
  {
    cat: "Découverte de la région à pied, à vélo ou en voiture",
    items: [
      "Sentier de la roche d\u2019Oëtre",
      "Sentier Le marais du Grand Hazé",
      "Mont Saint-Michel",
      "L\u2019estuaire de Ouistreham",
      "Les plages du débarquement",
      "Découverte d\u2019un nouveau village ornais"
    ]
  }
];

const DEFAULT_EVENTS = [];
const DEFAULT_NEWS = [];

const DEFAULTS = {
  activities: DEFAULT_ACTIVITIES,
  events: DEFAULT_EVENTS,
  news: DEFAULT_NEWS,
  dispos: {},
  reservations: [],
  actualites: [],
  garden: {}
};

export default async function handler(req, context) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (!["activities", "events", "news", "dispos", "reservations","garden","actualites"].includes(type)) {
    return new Response(JSON.stringify({ error: "Type invalide" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const store = getStore("castelboun");

  if (req.method === "GET") {
    try {
      const data = await store.get(type, { type: "json" });
      return Response.json(data ?? DEFAULTS[type]);
    } catch {
      return Response.json(DEFAULTS[type]);
    }
  }

  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "JSON invalide" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const adminPw = process.env.ADMIN_PASSWORD || "MGcastelboun2026";
    // Les réservations sont publiques (formulaire) ; tout le reste nécessite le mot de passe admin
    if (type !== "reservations" && body.password !== adminPw) {
      return new Response(JSON.stringify({ error: "Mot de passe incorrect" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    await store.set(type, JSON.stringify(body.data));
    return Response.json({ ok: true });
  }

  return new Response("Méthode non autorisée", { status: 405 });
}

export const config = { path: "/.netlify/functions/data-api" };
