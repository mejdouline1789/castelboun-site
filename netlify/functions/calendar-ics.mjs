import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  const store = getStore("castelboun");

  let events = [], reservations = [];
  try { events = await store.get("events", { type: "json" }) || []; } catch {}
  try { reservations = await store.get("reservations", { type: "json" }) || []; } catch {}

  const now = new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Domaine Castelboun//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Domaine Castelboun",
    "X-WR-CALDESC:Agenda et réservations — Domaine Castelboun",
    "X-WR-TIMEZONE:Europe/Paris",
    "X-PUBLISHED-TTL:PT5M",
    "REFRESH-INTERVAL;VALUE=DURATION:PT5M"
  ];

  // Événements admin
  events.forEach(e => {
    const startStr = (e.dateStart||'').replace(/-/g,'');
    const endRaw = e.dateEnd || e.dateStart;
    if (!startStr) return;
    const endDate = new Date(endRaw);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().slice(0,10).replace(/-/g,'');
    const desc = [e.description, e.activities, e.max ? `Places : ${e.taken||0}/${e.max}` : ''].filter(Boolean).join('\\n\\n');
    ics.push("BEGIN:VEVENT");
    ics.push(`DTSTART;VALUE=DATE:${startStr}`);
    ics.push(`DTEND;VALUE=DATE:${endStr}`);
    ics.push(`SUMMARY:${e.title||'Événement'}`);
    if (desc) ics.push(`DESCRIPTION:${desc}`);
    if (e.time) ics.push(`COMMENT:${e.time}`);
    ics.push(`STATUS:${e.status==='open'?'CONFIRMED':'CANCELLED'}`);
    ics.push(`UID:${e.id||startStr}@castelboun.fr`);
    ics.push(`DTSTAMP:${now}`);
    ics.push("END:VEVENT");
  });

  // Réservations publiques (visibles dans l'agenda partagé)
  reservations.forEach(r => {
    if (!r.dateArrivee) return;
    const startStr = r.dateArrivee.replace(/-/g,'');
    const endDate = new Date((r.dateDepart || r.dateArrivee));
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().slice(0,10).replace(/-/g,'');
    const pNames = (r.participants||[]).map(p=>p.name||p).filter(Boolean).join(', ');
    const desc = [
      r.groupe ? `Groupe : ${r.groupe}` : '',
      pNames ? `Participants : ${pNames}` : '',
      r.hebergement ? `Hébergement : ${r.hebergement}` : '',
      r.activites ? `Activités : ${r.activites}` : '',
      r.message ? `Message : ${r.message}` : '',
    ].filter(Boolean).join('\\n');
    ics.push("BEGIN:VEVENT");
    ics.push(`DTSTART;VALUE=DATE:${startStr}`);
    ics.push(`DTEND;VALUE=DATE:${endStr}`);
    ics.push(`SUMMARY:🏠 ${r.groupe||'Réservation'}${pNames?' — '+pNames:''}`);
    if (desc) ics.push(`DESCRIPTION:${desc}`);
    ics.push("STATUS:CONFIRMED");
    ics.push(`UID:resa-${r.id||startStr}@castelboun.fr`);
    ics.push(`DTSTAMP:${now}`);
    ics.push("END:VEVENT");
  });

  ics.push("END:VCALENDAR");

  return new Response(ics.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    }
  });
}

export const config = { path: "/calendar.ics" };
