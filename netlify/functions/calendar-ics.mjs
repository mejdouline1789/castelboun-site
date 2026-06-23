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
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H"
  ];

  events.forEach(e => {
    const startStr = e.dateStart.replace(/-/g, "");
    const endRaw = e.dateEnd || e.dateStart;
    const endDate = new Date(endRaw);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");

    const descParts = [];
    if (e.description) descParts.push(e.description);
    if (e.prerequisites) descParts.push("Prérequis : " + e.prerequisites);
    if (e.activities) descParts.push("Activités :\n" + e.activities);
    const desc = descParts.join("\n\n").replace(/\n/g, "\\n");

    const status = e.status === "open" ? "CONFIRMED" : "CANCELLED";

    ics.push("BEGIN:VEVENT");
    ics.push(`DTSTART;VALUE=DATE:${startStr}`);
    ics.push(`DTEND;VALUE=DATE:${endStr}`);
    ics.push(`SUMMARY:${e.title}`);
    if (desc) ics.push(`DESCRIPTION:${desc}`);
    if (e.time) ics.push(`X-ALT-DESC;FMTTYPE=text/html:${e.time}`);
    ics.push(`STATUS:${status}`);
    ics.push(`UID:${e.id}@domaine-castelboun.fr`);
    ics.push(`LAST-MODIFIED:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    ics.push("END:VEVENT");
  });

  ics.push("END:VCALENDAR");

  return new Response(ics.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="domaine-castelboun.ics"',
      "Cache-Control": "no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export const config = {
  path: "/calendar.ics"
};
