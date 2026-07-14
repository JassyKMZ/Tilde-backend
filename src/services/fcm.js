// src/services/fcm.js
const { createRequire } = require("module");
const requireFromCjs = createRequire(__filename);
const { GoogleAuth } = requireFromCjs("google-auth-library");
const fetch = requireFromCjs("node-fetch"); // if you use node-fetch; adjust if using global fetch in Node 18+

// load service account JSON path from env or use google auth via keyfile
const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID;
const GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS; // path to json

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

async function sendToToken(token, message) {
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
  const body = {
    message: {
      token,
      ...message,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    const err = new Error(`FCM send failed: ${res.status} ${res.statusText}`);
    err.body = errBody;
    throw err;
  }

  return res.json();
}

module.exports = { sendToToken };
