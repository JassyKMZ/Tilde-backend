'use strict';

/**
 * The release day itself: the single place to change date, time or place.
 * The registration page (GET /api/release-anmeldungen/event), the confirmation mail
 * and the calendar file all read from here.
 */
const EVENT = {
  // Stays the same when the date moves, so calendars update the entry instead of
  // adding a second one when someone imports the new file.
  uid: 'tilde-release-tag',
  title: 'Release-Tag der Tilde App',
  // Times with the German offset: +01:00 in winter, +02:00 in summer.
  start: '2027-03-10T18:00:00+01:00',
  end: '2027-03-10T20:00:00+01:00', // TODO: echtes Ende eintragen
  location: 'Landratsamt Schwarzwald-Baar-Kreis, Am Hoptbühl 2, 78048 Villingen-Schwenningen',
  room: 'Großer Sitzungssaal (Raum 300)',
};

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://tilde-app.de').replace(/\/$/, '');
const API_URL = (process.env.PUBLIC_API_URL || 'https://api.tilde-app.de').replace(/\/$/, '');
const CONTACT_INBOX = process.env.KONTAKT_EMAIL || 'info@tilde-app.de';

const TIME_ZONE = 'Europe/Berlin';

function dateText(date) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date);
}

function timeText(date) {
  const time = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(date);
  return `ab ${time} Uhr`;
}

/** What the registration page and the mail show. */
function eventInfo() {
  const start = new Date(EVENT.start);
  return {
    title: EVENT.title,
    start: start.toISOString(),
    end: new Date(EVENT.end).toISOString(),
    dateText: dateText(start),
    timeText: timeText(start),
    location: EVENT.location,
    room: EVENT.room,
  };
}

function fullLocation() {
  return `${EVENT.room}, ${EVENT.location}`;
}

const description = `Wir freuen uns auf Sie! Fragen oder Änderungen: ${CONTACT_INBOX}`;

// ---- Calendar file (RFC 5545), same format as the app's own (icsGenerator.js) ----

const icsDate = (date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

const icsText = (text) =>
  String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/([,;])/g, '\\$1')
    .replace(/\r?\n/g, '\\n');

// Lines longer than 75 octets must be folded (continuation lines start with a space).
function foldLine(line) {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts = [];
  let current = '';
  let currentBytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    const limit = parts.length ? 74 : 75;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function icsFile() {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tilde App//Release-Tag//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${EVENT.uid}@tilde-app.de`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(new Date(EVENT.start))}`,
    `DTEND:${icsDate(new Date(EVENT.end))}`,
    `SUMMARY:${icsText(EVENT.title)}`,
    `LOCATION:${icsText(fullLocation())}`,
    `DESCRIPTION:${icsText(description)}`,
    `URL:${SITE_URL}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(foldLine)
    .join('\r\n');
}

function googleCalendarLink() {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: EVENT.title,
    dates: `${icsDate(new Date(EVENT.start))}/${icsDate(new Date(EVENT.end))}`,
    details: description,
    location: fullLocation(),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

module.exports = {
  EVENT,
  SITE_URL,
  API_URL,
  CONTACT_INBOX,
  eventInfo,
  icsFile,
  googleCalendarLink,
  icsUrl: () => `${API_URL}/api/release-anmeldungen/event.ics`,
  // Personal page to change the number of persons or cancel (ReleaseAbmeldung.vue).
  cancelUrl: (token) => `${SITE_URL}/release-abmeldung?token=${encodeURIComponent(token)}`,
};
