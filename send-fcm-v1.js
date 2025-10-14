// send-fcm-v1.js
import { GoogleAuth } from "google-auth-library";
import fetch from "node-fetch";

const auth = new GoogleAuth({
  keyFile: "./service-account.json",
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function sendFcmV1Message(targetToken, payload) {
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken()).token;
  const projectId = await auth.getProjectId();
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const body = {
    message: {
      token: targetToken,
      notification: payload.notification, // optional
      data: payload.data || {}, // optional
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

  const json = await res.json();
  if (!res.ok)
    throw new Error(JSON.stringify({ status: res.status, body: json }));
  return json;
}

// usage
sendFcmV1Message("<FCM_TOKEN>", {
  notification: { title: "Hello", body: "Server sent v1" },
  data: { url: "/messages/1" },
})
  .then(console.log)
  .catch(console.error);
