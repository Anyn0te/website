#!/usr/bin/env node

/**
 * Helper utility to generate VAPID keys for web push notifications.
 *
 * Usage:
 *   node scripts/generate-vapid.js
 *
 * Copy the resulting public key into NEXT_PUBLIC_VAPID_PUBLIC_KEY (or VAPID_PUBLIC_KEY)
 * and the private key into VAPID_PRIVATE_KEY.
 */

const webpush = require("web-push");

try {
  const keys = webpush.generateVAPIDKeys();

  console.log("Generated VAPID keys:\n");
  console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=");
  console.log(keys.publicKey);
  console.log("\nVAPID_PRIVATE_KEY=");
  console.log(keys.privateKey);
  console.log(
    "\nStore these values in your environment (e.g. .env.local) before starting the dev server.",
  );
} catch (error) {
  console.error("Failed to generate VAPID keys:", error);
  process.exitCode = 1;
}
