// Minimal iCalendar (RFC 5545) export + import — enough to produce a feed
// any calendar app can subscribe to, and to read back games/practice/school
// events a player pastes in from their own calendar. No recurrence (RRULE)
// support; each event is treated as a standalone occurrence.

function pad(n) { return String(n).padStart(2, '0'); }

function toICSDate(dateStr) {
  // dateStr: 'YYYY-MM-DD' -> 'YYYYMMDD'
  return dateStr.replace(/-/g, '');
}

function nowStamp() {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

const TYPE_LABEL = { skills: 'Skills Workout', gym: 'Gym Workout', field: 'Field/Speed Workout', recovery: 'Recovery Day', testing: 'Testing / Retest', game: 'Game' };

export function generateWorkoutICS(player, workouts) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HoopCoach//Training Calendar//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeText(`${player.name} — HoopCoach Training`)}`];
  for (const w of workouts) {
    const start = toICSDate(w.scheduled_date);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${w.id}@hoopcoach.app`);
    lines.push(`DTSTAMP:${nowStamp()}`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    const typeLabel = TYPE_LABEL[w.day_type] || w.day_type;
    const summaryText = w.title && w.title !== typeLabel ? `${typeLabel}: ${w.title}` : (w.title || typeLabel);
    lines.push(`SUMMARY:${escapeText(summaryText)}`);
    lines.push(`DESCRIPTION:${escapeText(`${w.objective || ''}${w.est_duration_min ? ` (${w.est_duration_min} min)` : ''}`)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function unfold(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function icsDateToISO(value) {
  // value like 20260907 or 20260907T180000Z
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseICS(text) {
  const unfolded = unfold(text);
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events = [];
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0];
    const getField = (name) => {
      const m = body.match(new RegExp(`^${name}[^:]*:(.*)$`, 'mi'));
      return m ? m[1].trim() : null;
    };
    const summary = getField('SUMMARY');
    const dtstart = getField('DTSTART');
    const dtend = getField('DTEND');
    const uid = getField('UID');
    if (!summary || !dtstart) continue;
    const startDate = icsDateToISO(dtstart);
    const endDate = dtend ? icsDateToISO(dtend) : startDate;
    const allDay = !dtstart.includes('T');
    if (!startDate) continue;
    events.push({ uid: uid || null, title: summary.replace(/\\,/g, ',').replace(/\\;/g, ';'), startDate, endDate, allDay });
  }
  return events;
}
