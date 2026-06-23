import { getStore } from "@netlify/blobs";

function fold(line) {
  // RFC 5545: max 75 octets par ligne, continuation avec espace
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let i = 0;
  while (i < bytes.length) {
    const chunk = bytes.slice(i, i + (parts.length === 0 ? 75 : 74));
    parts.push(chunk.toString('utf8'));
    i += chunk.length;
  }
  return parts.join('\r\n ');
}

function icsLine(key, value) {
  if (value === null || value === undefined || value === '') return null;
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
  return fold(`${key}:${escaped}`);
}

export default async function handler(req) {
  const store = getStore("castelboun");
  let events = [], reservations = [];

  try { events = await store.get("events", { type: "json" }) || []; } catch (e) {}
  try { reservations = await store.get("reservations", { type: "json" }) || []; } catch (e) {}

  const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Domaine Castelboun//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    icsLine('X-WR-CALNAME', 'Domaine Castelboun'),
    icsLine('X-WR-TIMEZONE', 'Europe/Paris'),
    'X-PUBLISHED-TTL:PT15M',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
  ].filter(Boolean);

  // Événements admin
  for (const e of events) {
    if (!e.dateStart) continue;
    const start = e.dateStart.replace(/-/g, '');
    const endD = new Date(e.dateEnd || e.dateStart);
    endD.setDate(endD.getDate() + 1);
    const end = endD.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push('BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      icsLine('SUMMARY', e.title || 'Evenement'),
      e.description ? icsLine('DESCRIPTION', e.description) : null,
      `STATUS:${e.status === 'open' ? 'CONFIRMED' : 'CANCELLED'}`,
      `UID:evt-${e.id || start}@castelboun.fr`,   // UID STABLE
      `DTSTAMP:${stamp}`,
      'END:VEVENT'
    ).filter(Boolean);
    // Le filter retire les null de la description vide
  }

  // Réservations — UID stable basé sur r.id (pas de random!)
  for (const r of reservations) {
    if (!r.dateArrivee) continue;
    const start = r.dateArrivee.replace(/-/g, '');
    const endD = new Date(r.dateDepart || r.dateArrivee);
    endD.setDate(endD.getDate() + 1);
    const end = endD.toISOString().slice(0, 10).replace(/-/g, '');
    const pNames = (r.participants || []).map(p => p.name || p).filter(Boolean).join(', ');
    const desc = [
      r.groupe && `Groupe: ${r.groupe}`,
      pNames && `Participants: ${pNames}`,
      r.hebergement && `Hebergement: ${r.hebergement}`,
      r.heureArrivee && `Arrivee: ${r.heureArrivee}`,
      r.heureDepart && `Depart: ${r.heureDepart}`,
      r.transport && `Transport: ${r.transport}`,
      r.activites && `Activites: ${r.activites}`,
      r.message && `Message: ${r.message}`,
    ].filter(Boolean).join('\n');

    const uid = r.id ? `resa-${r.id}@castelboun.fr` : `resa-${start}-${pNames.slice(0,10).replace(/\s/g,'')}@castelboun.fr`;

    const summaryText = `Reservation - ${r.groupe || 'Groupe'}${pNames ? ' (' + pNames + ')' : ''}`;
    lines.push('BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      icsLine('SUMMARY', summaryText),
      desc ? icsLine('DESCRIPTION', desc) : null,
      'STATUS:CONFIRMED',
      `UID:${uid}`,          // UID STABLE — pas de Math.random()
      `DTSTAMP:${stamp}`,
      'END:VEVENT'
    ).filter(Boolean);
  }

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
