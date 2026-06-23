import { getStore } from "@netlify/blobs";

export default async function handler(req, context) {
  const store = getStore("castelboun");

  let events = [];
  try {
    events = await store.get("events", { type: "json" }) || [];
  } catch {
    events = [];
  }

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Domaine Castelboun//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Domaine Castelboun",
    "X-WR-CALDESC:Agenda des événements et disponibilités du Domaine Castelboun",
    "X-WR-TIMEZONE:Europe/Paris",
    // Forcer un refresh fréquent (Google Calendar respecte 5 min minimum)
    "X-PUBLISHED-TTL:PT5M",
    "REFRESH-INTERVAL;VALUE=DURATION:PT5M"
  ];

  const now = new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';

  events.forEach(e => {
    const startStr = (e.dateStart || '').replace(/-/g, "");
    const endRaw = e.dateEnd || e.dateStart;
    if (!startStr) return;
    const endDate = new Date(endRaw);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");

    const descParts = [];
    if (e.description) descParts.push(e.description);
    if (e.prerequisites) descParts.push("Prérequis : " + e.prerequisites);
    if (e.activities) descParts.push("Activités :\\n" + e.activities.replace(/\n/g, ', '));
    if (e.max) descParts.push(`Places : ${e.taken||0}/${e.max}`);
    const desc = descParts.join("\\n\\n");

    const status = e.status === "open" ? "CONFIRMED" : "CANCELLED";
    const uid = `${e.id || startStr}@domaine-castelboun.fr`;

    ics.push("BEGIN:VEVENT");
    ics.push(`DTSTART;VALUE=DATE:${startStr}`);
    ics.push(`DTEND;VALUE=DATE:${endStr}`);
    ics.push(`SUMMARY:${e.title || 'Événement'}`);
    if (desc) ics.push(`DESCRIPTION:${desc}`);
    if (e.time) ics.push(`COMMENT:${e.time}`);
    ics.push(`STATUS:${status}`);
    ics.push(`UID:${uid}`);
    ics.push(`DTSTAMP:${now}`);
    ics.push(`LAST-MODIFIED:${now}`);
    ics.push("END:VEVENT");
  });

  ics.push("END:VCALENDAR");

  return new Response(ics.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="domaine-castelboun.ics"',
      // Interdire tout cache pour forcer le re-fetch
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    }
  });
}

export const config = { path: "/calendar.ics" };
