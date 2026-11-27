'use strict';

/**
 * feedback service
 *
 * Besides the default CRUD methods it sends new feedback to the feedback inbox.
 */

const { createCoreService } = require('@strapi/strapi').factories;

// Inbox for feedback; can be changed without a code change via FEEDBACK_EMAIL.
const FEEDBACK_INBOX = process.env.FEEDBACK_EMAIL || 'feedback@tilde-app.de';

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

function teamMail(entry) {
  const sender = entry.name ? headerSafe(entry.name, 60) : 'anonym';
  const category = entry.kategorie ? `${headerSafe(entry.kategorie, 40)} – ` : '';
  return {
    to: FEEDBACK_INBOX,
    subject: `Neues Feedback: ${category}${sender}`,
    text: `Neues Feedback über die Tilde App:\n\nName: ${entry.name || '(nicht angegeben)'}\n\nNachricht:\n${entry.nachricht}`,
    html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
    <div style="background-color: ${BRAND_COLOR}; padding: 32px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Neues Feedback</h1>
    </div>
    <div style="padding: 32px 30px; font-size: 16px; color: #2f2938; line-height: 1.6;">
      <p style="margin: 0 0 16px 0;"><span style="color: #665f6d;">Name:</span> ${escapeHtml(entry.name || '(nicht angegeben)')}</p>
      <div style="padding: 16px; background-color: #f0edfa; border-radius: 8px; font-size: 15px; color: #2f2938; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(entry.nachricht)}</div>
    </div>
  </div>
</div>`,
  };
}

module.exports = createCoreService('api::feedback.feedback', ({ strapi }) => ({
  /**
   * Sends saved feedback to the inbox. Never throws: the feedback is already saved,
   * so a mail problem must not turn into an error for the sender.
   */
  async sendMail(entry) {
    const emailService = strapi.plugin('email')?.service('email');
    if (!emailService) {
      strapi.log.error('Feedback: email plugin not available, no mail sent.');
      return false;
    }
    try {
      await emailService.send(teamMail(entry));
      return true;
    } catch (error) {
      strapi.log.error(`Feedback: mail failed: ${error.message}`);
      return false;
    }
  },
}));
