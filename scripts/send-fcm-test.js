"use strict";
require("dotenv").config();
const admin = require("firebase-admin");

console.log("DEBUG: script started");

const TEST_TOKEN =
  "dvKryPGSAC72-zHCqerJi5:APA91bGp3agULtcsaQSTseW6AHiIRmQO4W6eQrJH7N2wrdZ7IvMOUtn5jMmhm8emWhR6ObEeahseRGzdx3t9UCe5Cg5yMZOm_H8kltm4dNw9-lTA9G0gZVg";

function getEnv(name) {
  return process.env[name] || null;
}

function showEnv(name) {
  const v = getEnv(name);
  console.log(`DEBUG ENV ${name}: ${v ? "[present]" : "[missing]"}`);
}

function initFirebaseAdmin() {
  showEnv("FIREBASE_PROJECT_ID");
  showEnv("FIREBASE_CLIENT_EMAIL");
  showEnv("FIREBASE_PRIVATE_KEY");

  const projectId = getEnv("FIREBASE_PROJECT_ID");
  const clientEmail = getEnv("FIREBASE_CLIENT_EMAIL");
  let privateKey = getEnv("FIREBASE_PRIVATE_KEY");

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      "ERROR: Missing FIREBASE env vars; script will exit with code 2"
    );
    process.exit(2);
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("DEBUG: firebase-admin initialized");
  } catch (err) {
    if (err && /already exists/u.test(String(err.message || ""))) {
      console.log("DEBUG: firebase-admin already initialized");
    } else {
      console.error("ERROR: firebase-admin initialize error:", err);
      process.exit(3);
    }
  }
}

async function sendTest() {
  console.log("DEBUG: TEST_TOKEN length:", TEST_TOKEN ? TEST_TOKEN.length : 0);
  if (!TEST_TOKEN || TEST_TOKEN.includes("<PASTE")) {
    console.error("ERROR: TEST_TOKEN not set correctly in script");
    process.exit(2);
  }

  initFirebaseAdmin();

  // prefer messaging client from admin
  const messagingClient =
    typeof admin.messaging === "function" ? admin.messaging() : admin.messaging;
  console.log("DEBUG: admin.SDK_VERSION =", admin.SDK_VERSION || "(unknown)");

  // single-message send fallback compatible with older firebase-admin
  try {
    console.log("DEBUG: attempting single message send...");
    const singleMsg = {
      token: TEST_TOKEN,
      notification: {
        title: "Server test",
        body: "This is a test notification",
      },
      webpush: { fcmOptions: { link: "/" }, headers: { Urgency: "high" } },
    };

    if (!messagingClient || typeof messagingClient.send !== "function") {
      console.error(
        "ERROR: messaging.send is not available; messagingClient:",
        !!messagingClient
      );
      process.exit(4);
    }

    const res = await messagingClient.send(singleMsg);
    console.log("DEBUG single send result (messageId):", res);
    process.exit(0);
  } catch (err) {
    console.error("ERROR: single send failed:", err);
    process.exit(1);
  }
}

sendTest();
