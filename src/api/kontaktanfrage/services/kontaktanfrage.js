'use strict';

/**
 * kontaktanfrage service
 *
 * Besides the default CRUD methods it sends the two emails for a new request:
 * one to the Tilde inbox and a confirmation with a copy of the message to the sender.
 */

const { createCoreService } = require('@strapi/strapi').factories;

// Inbox for contact requests; can be changed without a code change via KONTAKT_EMAIL.
const CONTACT_INBOX = process.env.KONTAKT_EMAIL || 'info@tilde-app.de';

const BRAND_COLOR = '#5041b1';

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

// Subjects are a mail header: no line breaks, not too long.
function headerSafe(value, max = 80) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);
}

function detailRows(entry) {
  return [
    ['Anliegen', entry.anliegen],
    ['Name', entry.name],
    ['E-Mail', entry.email],
    ['Institution', entry.institution],
    ['Telefon', entry.telefon],
  ].filter(([, value]) => value);
}

function detailsText(entry) {
  return [
    ...detailRows(entry).map(([label, value]) => `${label}: ${value}`),
    '',
    'Nachricht:',
    entry.nachricht,
  ].join('\n');
}

function detailsHtml(entry) {
  const rows = detailRows(entry)
    .map(
      ([label, value]) =>
        `<tr><td style="padding: 4px 16px 4px 0; color: #665f6d; vertical-align: top; white-space: nowrap;">${label}</td>` +
        `<td style="padding: 4px 0; color: #2f2938;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return `
    <table style="border-collapse: collapse; font-size: 15px; margin: 0 0 20px 0;">${rows}</table>
    <div style="padding: 16px; background-color: #f0edfa; border-radius: 8px; font-size: 15px; color: #2f2938; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(entry.nachricht)}</div>`;
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

function teamMail(entry) {
  const subject = headerSafe(`Kontaktanfrage: ${entry.anliegen} – ${entry.name}`, 120);
  return {
    to: CONTACT_INBOX,
    // "Antworten" in the mail program goes straight to the sender.
    replyTo: entry.email,
    subject,
    text: `Neue Anfrage über das Kontaktformular der Tilde App:\n\n${detailsText(entry)}\n\nMit "Antworten" schreibst du direkt an ${entry.email}.`,
    html: layout(
      'Neue Kontaktanfrage',
      `<p style="margin: 0 0 20px 0;">Über das Kontaktformular der Tilde App ist eine neue Anfrage eingegangen:</p>
      ${detailsHtml(entry)}
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #665f6d;">Mit „Antworten“ schreibst du direkt an ${escapeHtml(entry.email)}.</p>`,
    ),
  };
}

// Receipt only: it contains nothing the sender typed (not even the name), so the form
// can't be misused to send someone else a message of one's own under Tilde's name.
function confirmationMail(entry) {
  return {
    to: entry.email,
    // Replies to the confirmation reach the team instead of a no-reply address.
    replyTo: CONTACT_INBOX,
    subject: 'Ihre Nachricht an Tilde ist eingegangen',
    text: `Guten Tag,\n\nvielen Dank für Ihre Nachricht über das Kontaktformular der Tilde App! Wir haben sie erhalten und melden uns so schnell wie möglich bei Ihnen.\n\nSie möchten noch etwas ergänzen? Antworten Sie einfach auf diese E-Mail.\n\nSie haben uns nicht geschrieben? Dann hat jemand Ihre E-Mail-Adresse eingegeben. Sie können diese E-Mail einfach ignorieren.\n\nViele Grüße\nIhr Tilde-Team`,
    html: layout(
      'Vielen Dank für Ihre Nachricht!',
      `<p style="margin: 0 0 16px 0;">Guten Tag,</p>
      <p style="margin: 0 0 16px 0;">vielen Dank für Ihre Nachricht über das Kontaktformular der Tilde App! Wir haben sie erhalten und melden uns so schnell wie möglich bei Ihnen.</p>
      <p style="margin: 0 0 16px 0;">Sie möchten noch etwas ergänzen? Antworten Sie einfach auf diese E-Mail.</p>
      <p style="margin: 0 0 16px 0;">Viele Grüße<br />Ihr Tilde-Team</p>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #665f6d;">Sie haben uns nicht geschrieben? Dann hat jemand Ihre E-Mail-Adresse eingegeben. Sie können diese E-Mail einfach ignorieren.</p>`,
    ),
  };
}

module.exports = createCoreService('api::kontaktanfrage.kontaktanfrage', ({ strapi }) => ({
  /**
   * Sends both mails for a saved request. Never throws: the request is already saved,
   * so a mail problem must not turn into an error for the sender.
   * @returns {{ teamSent: boolean, confirmationSent: boolean }}
   */
  async sendMails(entry) {
    const emailService = strapi.plugin('email')?.service('email');
    if (!emailService) {
      strapi.log.error('Kontaktanfrage: email plugin not available, no mails sent.');
      return { teamSent: false, confirmationSent: false };
    }

    const send = async (mail, label) => {
      try {
        await emailService.send(mail);
        return true;
      } catch (error) {
        // Log the kind of mail and the error, not the personal data in it.
        strapi.log.error(`Kontaktanfrage: ${label} mail failed: ${error.message}`);
        return false;
      }
    };

    const [teamSent, confirmationSent] = await Promise.all([
      send(teamMail(entry), 'team'),
      send(confirmationMail(entry), 'confirmation'),
    ]);

    return { teamSent, confirmationSent };
  },
}));
