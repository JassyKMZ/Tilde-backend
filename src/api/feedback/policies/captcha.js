const { ApplicationError, ValidationError } = require("@strapi/utils").errors;

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

module.exports = async (ctx, config, { strapi }) => {
  const token = ctx.request.body.data?.captcha;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const allowedHostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean);

  if (!token) {
    throw new ValidationError("Bitte die Sicherheitsprüfung abschließen.");
  }

  if (!secret || allowedHostnames.length === 0) {
    strapi.log.error("Turnstile is not configured.");
    throw new ApplicationError("Sicherheitsprüfung derzeit nicht verfügbar.", {
      status: 503,
    });
  }

  try {
    const verificationData = new URLSearchParams({ secret, response: token });
    if (ctx.request.ip) {
      verificationData.set("remoteip", ctx.request.ip);
    }

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verificationData,
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();

    if (
      !response.ok ||
      !result.success ||
      !allowedHostnames.includes(result.hostname)
    ) {
      throw new ValidationError("Sicherheitsprüfung fehlgeschlagen.");
    }

    delete ctx.request.body.data.captcha;
    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    strapi.log.error("Turnstile verification request failed.", error);
    throw new ApplicationError("Sicherheitsprüfung derzeit nicht verfügbar.", {
      status: 503,
    });
  }
};
