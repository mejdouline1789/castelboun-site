import { getStore } from "@netlify/blobs";

function esc(v) {
  return String(v || '').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
}

export default async function handler(req) {
  const store = getStore("castelboun");
  let events = [], reservations = [];
  try { events = await store.get("events", { type: "json" }) || []; } catch (_) {}
  try { reservations = await store.get("reservations", { type: "json" }) || []; } catch (_) {}

  const stamp = new Date().toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';
  const out = [];

  out.push('BEGIN:VCALENDAR');
  out.push('VERSION:2.0');
  out.push('PRODID:-//Domaine Castelboun//FR');
  out.push('CALSCALE:GREGORIAN');
  out.push('METHOD:PUBLISH');
  out.push('X-WR-CALNAME:Domaine Castelboun');
  out.push('X-WR-TIMEZONE:Europe/Paris');
  out.push('X-PUBLISHED-TTL:PT15M');
  out.push('REFRESH-INTERVAL;VALUE=DURATION:PT15M');

  for (const e of events) {
    if (!e.dateStart) continue;
    const start = e.dateStart.replace(/-/g, '');
    const endD = new Date(e.dateEnd || e.dateStart);
    endD.setDate(endD.getDate() + 1);
    const end = endD.toISOString().slice(0, 10).replace(/-/g, '');
    out.push('BEGIN:VEVENT');
    out.push('DTSTART;VALUE=DATE:' + start);
    out.push('DTEND;VALUE=DATE:' + end);
    out.push('SUMMARY:' + esc(e.title || 'Evenement'));
    if (e.description) out.push('DESCRIPTION:' + esc(e.description));
    if (e.time) out.push('COMMENT:' + esc(e.time));
    out.push('STATUS:' + (e.status === 'open' ? 'CONFIRMED' : 'CANCELLED'));
    out.push('UID:evt-' + (e.id || start) + '@castelboun.fr');
    out.push('DTSTAMP:' + stamp);
    out.push('END:VEVENT');
  }

  for (const r of reservations) {
    if (!r.dateArrivee) continue;
    const start = r.dateArrivee.replace(/-/g, '');
    const endD = new Date(r.dateDepart || r.dateArrivee);
    endD.setDate(endD.getDate() + 1);
    const end = endD.toISOString().slice(0, 10).replace(/-/g, '');
    const pNames = (r.participants || []).map(p => p.name || p).filter(Boolean).join(', ');
    const uid = 'resa-' + (r.id || (start + '-' + esc(pNames).slice(0,8))) + '@castelboun.fr';
    const summary = 'Reservation - ' + (r.groupe || 'Groupe') + (pNames ? ' (' + pNames + ')' : '');
    const descParts = [
      r.groupe ? 'Groupe: ' + r.groupe : '',
      pNames ? 'Participants: ' + pNames : '',
      r.hebergement ? 'Hebergement: ' + r.hebergement : '',
      r.heureArrivee ? 'Arrivee: ' + r.heureArrivee : '',
      r.heureDepart ? 'Depart: ' + r.heureDepart : '',
      r.transport ? 'Transport: ' + r.transport : '',
      r.activites ? 'Activites: ' + r.activites : '',
      r.message ? 'Message: ' + r.message : '',
    ].filter(Boolean).join('\n');
    out.push('BEGIN:VEVENT');
    out.push('DTSTART;VALUE=DATE:' + start);
    out.push('DTEND;VALUE=DATE:' + end);
    out.push('SUMMARY:' + esc(summary));
    if (descParts) out.push('DESCRIPTION:' + esc(descParts));
    out.push('STATUS:CONFIRMED');
    out.push('UID:' + uid);
    out.push('DTSTAMP:' + stamp);
    out.push('END:VEVENT');
  }

  out.push('END:VCALENDAR');

  return new Response(out.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    }
  });
}

export const config = { path: '/calendar.ics' };
