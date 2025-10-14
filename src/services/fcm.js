// src/services/fcm.js
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

function buildCredsFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  if (privateKey.includes("\\n")) privateKey = privateKey.replace(/\\n/g, "\n");
  return {
    type: "service_account",
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
}

async function getAuthClient() {
  const creds = buildCredsFromEnv();
  const auth = new GoogleAuth({
    scopes: SCOPES,
    credentials: creds || undefined,
  });
  const client = await auth.getClient();
  const projectId = creds?.project_id || (await auth.getProjectId());
  return { client, projectId };
}

export async function sendToToken(
  token,
  { notification = null, data = {} } = {}
) {
  if (!token) throw new Error("FCM token required");
  const { client, projectId } = await getAuthClient();
  const accessTokenObj = await client.getAccessToken();
  const accessToken = accessTokenObj?.token;
  if (!accessToken) throw new Error("Failed to obtain Google access token");

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const body = {
    message: {
      token,
      ...(notification ? { notification } : {}),
      data: Object.keys(data || {}).length ? data : undefined,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; UTF-8",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error("FCM send failed");
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}
