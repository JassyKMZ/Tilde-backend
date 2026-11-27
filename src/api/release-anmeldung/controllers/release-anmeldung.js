const crypto = require("crypto");
const { createCoreController } = require("@strapi/strapi").factories;
const { ValidationError, NotFoundError } = require("@strapi/utils").errors;
const { CONTACT_INBOX, eventInfo, icsFile } = require("../event");

const UID = "api::release-anmeldung.release-anmeldung";
// Same limit as lifecycles.js and the registration page.
const MAX_PERSONS = 10;

// The token from the mail link identifies the registration; nothing else is needed.
async function findByToken(strapi, ctx) {
  const token = ctx.request.body?.data?.token;
  if (typeof token !== "string" || token.length < 20 || token.length > 100) {
    throw new ValidationError("Dieser Link ist ungültig.");
  }
  const entry = await strapi
    .documents(UID)
    .findFirst({ filters: { abmeldeToken: { $eq: token } } });
  if (!entry) {
    throw new NotFoundError(
      `Dieser Link ist ungültig. Bitte schreiben Sie uns an ${CONTACT_INBOX}.`,
    );
  }
  return entry;
}

// What the link's owner sees of their own registration.
function publicView(entry) {
  return {
    name: entry.name,
    personen: entry.personen,
    abgesagt: Boolean(entry.abgesagt),
  };
}

function clean(value) {
  return typeof value === "string" ? value.trim() : value;
}

// Compares hashes, so the time taken says nothing about how much of the key matched.
function keyMatches(given, expected) {
  const hash = (value) => crypto.createHash("sha256").update(String(value)).digest();
  return crypto.timingSafeEqual(hash(given), hash(expected));
}

const berlinDateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

// Excel reads ";" as the column separator in German settings. Values starting with
// = + - @ get a ' in front so a spreadsheet never runs them as a formula.
function csvValue(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(entries) {
  const header = ["Name / Institution", "E-Mail", "Personen", "Anmerkung", "Status", "Angemeldet am", "Abgesagt am"];
  const rows = entries.map((entry) => [
    entry.name,
    entry.email,
    entry.personen,
    entry.anmerkung,
    entry.abgesagt ? "abgesagt" : "angemeldet",
    entry.createdAt ? berlinDateTime.format(new Date(entry.createdAt)) : "",
    entry.abgesagtAm ? berlinDateTime.format(new Date(entry.abgesagtAm)) : "",
  ]);
  // The BOM makes Excel open the file as UTF-8, so umlauts stay intact.
  return "﻿" + [header, ...rows].map((row) => row.map(csvValue).join(";")).join("\r\n");
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async create(ctx) {
    const { name, email, personen, anmerkung } = ctx.request.body.data || {};

    // Only the fields the form may set; "abgesagt" stays admin-only.
    const data = {
      name: clean(name),
      email: clean(email)?.toLowerCase(),
      personen: Number(personen) || 1,
      anmerkung: clean(anmerkung) || null,
      // Secret part of the personal cancellation link in the confirmation mail.
      abmeldeToken: crypto.randomBytes(24).toString("base64url"),
    };

    // One registration per address, so nobody is counted twice. A cancelled one
    // makes room for a new registration.
    if (data.email) {
      const existing = await strapi
        .documents(UID)
        .findFirst({ filters: { email: { $eqi: data.email } } });
      if (existing && !existing.abgesagt) {
        throw new ValidationError(
          `Mit dieser E-Mail-Adresse besteht bereits eine Anmeldung. Für Änderungen schreiben Sie uns bitte an ${CONTACT_INBOX}.`,
        );
      }
      if (existing) {
        await strapi.documents(UID).delete({ documentId: existing.documentId });
      }
    }

    // Document service rather than super.create: the API's input sanitizing would drop
    // the private token. Validation still runs (schema and lifecycles.js).
    const entry = await strapi.documents(UID).create({ data });

    // No names or addresses in the log, they are personal data.
    strapi.log.info(`Release-Anmeldung gespeichert: Personen=${data.personen}`);

    const { confirmationSent } = await strapi.service(UID).sendConfirmation(entry);

    // Only report success; the registration's data never goes back to the browser.
    return { data: { documentId: entry.documentId, confirmationSent } };
  },

  async event(ctx) {
    ctx.body = { data: eventInfo() };
  },

  async ics(ctx) {
    ctx.set("Content-Type", "text/calendar; charset=utf-8");
    ctx.set("Content-Disposition", 'attachment; filename="tilde-release-tag.ics"');
    ctx.body = icsFile();
  },

  // ---- Personal link from the confirmation mail (?token=…) ----

  async status(ctx) {
    const entry = await findByToken(strapi, ctx);
    return { data: publicView(entry) };
  },

  async change(ctx) {
    const entry = await findByToken(strapi, ctx);
    const persons = Number(ctx.request.body?.data?.personen);
    if (!Number.isInteger(persons) || persons < 1 || persons > MAX_PERSONS) {
      throw new ValidationError(
        `Bitte geben Sie zwischen 1 und ${MAX_PERSONS} Personen an.`,
      );
    }

    // Also used to come back after cancelling: the registration is active again.
    const updated = await strapi.documents(UID).update({
      documentId: entry.documentId,
      data: { personen: persons, abgesagt: false, abgesagtAm: null },
    });
    strapi.log.info(
      `Release-Anmeldung geändert: Personen ${entry.personen} -> ${persons}` +
        (entry.abgesagt ? " (wieder angemeldet)" : ""),
    );
    return { data: publicView(updated) };
  },

  async cancel(ctx) {
    const entry = await findByToken(strapi, ctx);
    if (entry.abgesagt) return { data: publicView(entry) };

    const updated = await strapi.documents(UID).update({
      documentId: entry.documentId,
      data: { abgesagt: true, abgesagtAm: new Date() },
    });
    strapi.log.info(`Release-Anmeldung abgesagt: Personen=${entry.personen}`);
    return { data: publicView(updated) };
  },

  /**
   * Registrations for the team, e.g. to mail everyone about a change of date.
   *   ?key=…               CSV file for Excel (all registrations)
   *   ?key=…&format=bcc    addresses of everyone still registered, ready for BCC
   *   ?key=…&format=anzahl number of registrations and persons
   */
  async export(ctx) {
    const expected = process.env.RELEASE_EXPORT_KEY;
    // Without a long key configured the export simply doesn't exist.
    if (!expected || expected.length < 20 || !keyMatches(ctx.query.key || "", expected)) {
      throw new NotFoundError("Not Found");
    }

    const entries = await strapi
      .documents(UID)
      .findMany({ sort: "createdAt:asc", limit: 10000 });
    const active = entries.filter((entry) => !entry.abgesagt);

    // Personal data: never keep a copy in a browser or proxy cache.
    ctx.set("Cache-Control", "no-store");
    strapi.log.info(`Release-Anmeldungen exportiert: format=${ctx.query.format || "csv"}`);

    if (ctx.query.format === "bcc") {
      ctx.set("Content-Type", "text/plain; charset=utf-8");
      ctx.body = active.map((entry) => entry.email).join("; ");
      return;
    }
    if (ctx.query.format === "anzahl") {
      const persons = active.reduce((sum, entry) => sum + (Number(entry.personen) || 0), 0);
      ctx.set("Content-Type", "text/plain; charset=utf-8");
      ctx.body = [
        `Angemeldet: ${active.length} Anmeldungen, ${persons} Personen`,
        `Abgesagt: ${entries.length - active.length} Anmeldungen`,
      ].join("\n");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    ctx.set("Content-Type", "text/csv; charset=utf-8");
    ctx.set("Content-Disposition", `attachment; filename="release-anmeldungen-${date}.csv"`);
    ctx.body = toCsv(entries);
  },
}));
