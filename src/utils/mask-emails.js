"use strict";

// Shortens email addresses for log output: logs are kept indefinitely, full
// addresses are personal data.
// "max.muster@example.org" -> "ma***@example.org". Accepts one address, a
// comma-separated list or an array (nodemailer allows all three for "to").
function maskEmails(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(",");
  return list
    .map((entry) => {
      const address = String(entry?.address ?? entry).trim();
      // "Name <mail@host>" -> only the address part, the name is personal data too.
      const match = address.match(/<([^>]+)>/);
      const email = match ? match[1] : address;
      const at = email.lastIndexOf("@");
      if (at < 1) return "***";
      const local = email.slice(0, at);
      return `${local.slice(0, local.length > 2 ? 2 : 1)}***${email.slice(at)}`;
    })
    .join(", ");
}

module.exports = { maskEmails };
