'use strict';

/**
 * release-anmeldung service
 *
 * Besides the default CRUD methods it sends the confirmation mail for a new
 * registration. The team sees all registrations in the Strapi admin.
 */

const { createCoreService } = require('@strapi/strapi').factories;

// Replies to the confirmation (e.g. cancellations) land in the team inbox.
const CONTACT_INBOX = process.env.KONTAKT_EMAIL || 'info@tilde-app.de';

const BRAND_COLOR = '#5041b1';

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

// Receipt only: apart from the number of persons it contains nothing the sender typed,
// so the form can't be misused to send someone else a message under Tilde's name.
function confirmationMail(entry) {
  const persons = Number(entry.personen) || 1;
  const personsText = persons === 1 ? '1 Person' : `${persons} Personen`;
  return {
    to: entry.email,
    replyTo: CONTACT_INBOX,
    subject: 'Ihre Anmeldung zum Release-Tag der Tilde App',
    text: `Guten Tag,\n\nvielen Dank für Ihre Anmeldung zum Release-Tag der Tilde App! Wir haben ${personsText} für Sie eingeplant und freuen uns auf Sie.\n\nSollte sich am Termin etwas ändern, informieren wir Sie über diese E-Mail-Adresse.\n\nSie können doch nicht kommen oder bringen mehr oder weniger Personen mit? Antworten Sie einfach auf diese E-Mail.\n\nSie haben sich nicht angemeldet? Dann hat jemand Ihre E-Mail-Adresse eingegeben. Antworten Sie kurz, dann löschen wir die Anmeldung.\n\nViele Grüße\nIhr Tilde-Team`,
    html: layout(
      'Vielen Dank für Ihre Anmeldung!',
      `<p style="margin: 0 0 16px 0;">Guten Tag,</p>
      <p style="margin: 0 0 16px 0;">vielen Dank für Ihre Anmeldung zum Release-Tag der Tilde App! Wir haben <strong>${personsText}</strong> für Sie eingeplant und freuen uns auf Sie.</p>
      <p style="margin: 0 0 16px 0;">Sollte sich am Termin etwas ändern, informieren wir Sie über diese E-Mail-Adresse.</p>
      <p style="margin: 0 0 16px 0;">Sie können doch nicht kommen oder bringen mehr oder weniger Personen mit? Antworten Sie einfach auf diese E-Mail.</p>
      <p style="margin: 0 0 16px 0;">Viele Grüße<br />Ihr Tilde-Team</p>
      <p style="margin: 24px 0 0 0; font-size: 13px; color: #665f6d;">Sie haben sich nicht angemeldet? Dann hat jemand Ihre E-Mail-Adresse eingegeben. Antworten Sie kurz, dann löschen wir die Anmeldung.</p>`,
    ),
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
