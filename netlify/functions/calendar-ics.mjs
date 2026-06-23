import { getStore } from "@netlify/blobs";

// Échappe et découpe les valeurs ICS (max 75 chars/ligne)
function icsVal(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function icsLine(key, value) {
  const line = `${key}:${icsVal(value)}`;
  // Folding ICS (RFC 5545: max 75 octets par ligne)
  if (line.length <= 75) return line;
  let result = '';
  let remaining = line;
  while (remaining.length > 75) {
    result += remaining.slice(0, 75) + '\r\n ';
    remaining = remaining.slice(75);
  }
  return result + remaining;
}

export default async function handler(req) {
  const store = getStore("castelboun");

  let events = [], reservations = [];
  try { events = await store.get("events", { type: "json" }) || []; } catch(e) { console.error('ICS events error:', e); }
  try { reservations = await store.get("reservations", { type: "json" }) || []; } catch(e) { console.error('ICS reservations error:', e); }

  console.log(`ICS: ${events.length} events, ${reservations.length} reservations`);

  const now = new Date().toISOString().replace(/[-:.]/g,'').slice(0,15) + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Domaine Castelboun//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Domaine Castelboun',
    'X-WR-CALDESC:Agenda et reservations - Domaine Castelboun',
    'X-WR-TIMEZONE:Europe/Paris',
    'X-PUBLISHED-TTL:PT15M',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
  ];

  // Événements
  events.forEach(e => {
    const start = (e.dateStart || '').replace(/-/g, '');
    if (!start) return;
    const endRaw = new Date(e.dateEnd || e.dateStart);
    endRaw.setDate(endRaw.getDate() + 1);
    const end = endRaw.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
    lines.push(icsLine('SUMMARY', e.title || 'Evenement'));
    if (e.description) lines.push(icsLine('DESCRIPTION', e.description));
    if (e.time) lines.push(icsLine('COMMENT', e.time));
    lines.push(`STATUS:${e.status === 'open' ? 'CONFIRMED' : 'CANCELLED'}`);
    lines.push(`UID:evt-${e.id || start}@castelboun.fr`);
    lines.push(`DTSTAMP:${now}`);
    lines.push('END:VEVENT');
  });

  // Réservations
  reservations.forEach(r => {
    if (!r.dateArrivee) return;
    const start = r.dateArrivee.replace(/-/g, '');
    const endRaw = new Date(r.dateDepart || r.dateArrivee);
    endRaw.setDate(endRaw.getDate() + 1);
    const end = endRaw.toISOString().slice(0, 10).replace(/-/g, '');
    const pNames = (r.participants || []).map(p => p.name || p).filter(Boolean).join(', ');
    const desc = [
      r.groupe ? `Groupe: ${r.groupe}` : '',
      pNames ? `Participants: ${pNames}` : '',
      r.hebergement ? `Hebergement: ${r.hebergement}` : '',
      r.heureArrivee ? `Arrivee: ${r.heureArrivee}` : '',
      r.heureDepart ? `Depart: ${r.heureDepart}` : '',
      r.transport ? `Transport: ${r.transport}` : '',
      r.activites ? `Activites: ${r.activites}` : '',
      r.message ? `Message: ${r.message}` : '',
    ].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
    lines.push(icsLine('SUMMARY', `Reservation - ${r.groupe || 'Groupe'}${pNames ? ' (' + pNames + ')' : ''}`));
    if (desc) lines.push(icsLine('DESCRIPTION', desc));
    lines.push('STATUS:CONFIRMED');
    lines.push(`UID:resa-${r.id || start}-${Math.random().toString(36).slice(2)}@castelboun.fr`);
    lines.push(`DTSTAMP:${now}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}

export const config = { path: '/calendar.ics' };
