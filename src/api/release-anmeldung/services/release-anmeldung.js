'use strict';

/**
 * release-anmeldung service
 *
 * Besides the default CRUD methods it sends the confirmation mail for a new
 * registration: event details, calendar file and the personal link to change or
 * cancel it.
 * The team sees all registrations in the Strapi admin (or via the export).
 */

const { createCoreService } = require('@strapi/strapi').factories;
const {
  CONTACT_INBOX,
  eventInfo,
  icsFile,
  icsUrl,
  googleCalendarLink,
  cancelUrl,
} = require('../event');

const BRAND_COLOR = '#5041b1';

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

function layout(title, bodyHtml) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
    <div style="background-color: ${BRAND_COLOR}; padding: 32px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${title}</h1>
    </div>
    <div style="padding: 32px 30px; font-size: 16px; color: #2f2938; line-height: 1.6;">
      ${bodyHtml}
    </div>
    <div style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #999999;">Tilde App · <a href="https://tilde-app.de" style="color: #999999;">tilde-app.de</a></p>
    </div>
  </div>
</div>`;
}

function eventRows() {
  const event = eventInfo();
  return [
    ['Datum', event.dateText],
    ['Uhrzeit', event.timeText],
    ['Ort', event.location],
    ['Raum', event.room],
  ];
}

function button(href, label, filled) {
  const colors = filled
    ? `background-color: ${BRAND_COLOR}; color: #ffffff; border: 2px solid ${BRAND_COLOR};`
    : `background-color: #ffffff; color: ${BRAND_COLOR}; border: 2px solid ${BRAND_COLOR};`;
  return `<a href="${escapeHtml(href)}" style="display: inline-block; margin: 0 8px 8px 0; padding: 10px 18px; border-radius: 999px; font-weight: 600; font-size: 15px; text-decoration: none; ${colors}">${label}</a>`;
}

// Apart from the number of persons it contains nothing the sender typed, so the form
// can't be misused to send someone else a message under Tilde's name.
function confirmationMail(entry) {
  const persons = Number(entry.personen) || 1;
  const personsText = persons === 1 ? '1 Person' : `${persons} Personen`;
  const cancelLink = entry.abmeldeToken ? cancelUrl(entry.abmeldeToken) : null;

  const detailsText = eventRows()
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
  const detailsHtml = eventRows()
    .map(
      ([label, value]) =>
        `<tr><td style="padding: 4px 16px 4px 0; color: #665f6d; vertical-align: top; white-space: nowrap;">${label}</td>` +
        `<td style="padding: 4px 0; color: #2f2938; font-weight: 600;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const cancelText = cancelLink
    ? `Sie bringen mehr oder weniger Personen mit oder können doch nicht kommen? Hier können Sie Ihre Anmeldung ändern oder sich abmelden:\n${cancelLink}`
    : 'Sie bringen mehr oder weniger Personen mit oder können doch nicht kommen? Antworten Sie einfach auf diese E-Mail.';
  const cancelHtml = cancelLink
    ? `<p style="margin: 0 0 8px 0;">Sie bringen mehr oder weniger Personen mit oder können doch nicht kommen?</p>
      <p style="margin: 0 0 20px 0;">${button(cancelLink, 'Anmeldung ändern oder abmelden', false)}</p>`
    : '<p style="margin: 0 0 16px 0;">Sie bringen mehr oder weniger Personen mit oder können doch nicht kommen? Antworten Sie einfach auf diese E-Mail.</p>';

  return {
    to: entry.email,
    // Replies (changes, questions) reach the team instead of a no-reply address.
    replyTo: CONTACT_INBOX,
    subject: 'Ihre Anmeldung zum Release-Tag der Tilde App',
    text: [
      'Guten Tag,',
      '',
      `vielen Dank für Ihre Anmeldung zum Release-Tag der Tilde App! Wir haben ${personsText} für Sie eingeplant und freuen uns auf Sie.`,
      '',
      detailsText,
      '',
      'Im Anhang finden Sie eine Kalenderdatei (.ics) für Ihren Kalender.',
      `Google Kalender: ${googleCalendarLink()}`,
      '',
      'Sollte sich am Termin etwas ändern, informieren wir Sie über diese E-Mail-Adresse.',
      '',
      cancelText,
      '',
      'Viele Grüße',
      'Ihr Tilde-Team',
      '',
      'Sie haben sich nicht angemeldet? Dann hat jemand Ihre E-Mail-Adresse eingegeben. Antworten Sie kurz, dann löschen wir die Anmeldung.',
    ].join('\n'),
    html: layout(
      'Vielen Dank für Ihre Anmeldung!',
      `<p style="margin: 0 0 16px 0;">Guten Tag,</p>
      <p style="margin: 0 0 20px 0;">vielen Dank für Ihre Anmeldung zum Release-Tag der Tilde App! Wir haben <strong>${personsText}</strong> für Sie eingeplant und freuen uns auf Sie.</p>
      <div style="padding: 16px 20px; background-color: #f0edfa; border-radius: 8px; margin: 0 0 20px 0;">
        <table style="border-collapse: collapse; font-size: 15px;">${detailsHtml}</table>
      </div>
      <p style="margin: 0 0 8px 0; font-weight: 600;">In den Kalender eintragen:</p>
      <p style="margin: 0 0 20px 0;">
        ${button(icsUrl(), 'Apple, Outlook &amp; Co. (.ics)', true)}
        ${button(googleCalendarLink(), 'Google Kalender', false)}
      </p>
      <p style="margin: 0 0 16px 0;">Sollte sich am Termin etwas ändern, informieren wir Sie über diese E-Mail-Adresse.</p>
      ${cancelHtml}
      <p style="margin: 0 0 16px 0;">Viele Grüße<br />Ihr Tilde-Team</p>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #665f6d;">Sie haben sich nicht angemeldet? Dann hat jemand Ihre E-Mail-Adresse eingegeben. Antworten Sie kurz, dann löschen wir die Anmeldung.</p>`,
    ),
    attachments: [
      {
        filename: 'tilde-release-tag.ics',
        content: icsFile(),
        contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
      },
    ],
  };
}

module.exports = createCoreService('api::release-anmeldung.release-anmeldung', ({ strapi }) => ({
  /**
   * Sends the confirmation for a saved registration. Never throws: the registration
   * is already saved, so a mail problem must not turn into an error for the sender.
   * @returns {{ confirmationSent: boolean }}
   */
  async sendConfirmation(entry) {
    const emailService = strapi.plugin('email')?.service('email');
    if (!emailService) {
      strapi.log.error('Release-Anmeldung: email plugin not available, no mail sent.');
      return { confirmationSent: false };
    }
    try {
      await emailService.send(confirmationMail(entry));
      return { confirmationSent: true };
    } catch (error) {
      strapi.log.error(`Release-Anmeldung: confirmation mail failed: ${error.message}`);
      return { confirmationSent: false };
    }
  },
}));
