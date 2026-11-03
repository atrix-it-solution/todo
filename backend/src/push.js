import { Router } from "express";
import webpush from "web-push";
import { pool } from "./db.js";

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
export const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn("Push notifications disabled: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env");
}

const router = Router();

// GET /api/push/public-key -> key the browser needs to subscribe
router.get("/public-key", (_req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ error: "Notifications are not set up on the server yet" });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe { subscription } -> save this device
router.post("/subscribe", async (req, res, next) => {
  const sub = req.body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" });
  }
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [sub.endpoint, sub.keys.p256dh, sub.keys.auth]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/push/unsubscribe { endpoint } -> forget this device
router.post("/unsubscribe", async (req, res, next) => {
  const endpoint = req.body?.endpoint;
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
  try {
    await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Send a notification to every subscribed device, except the one that
 * triggered it. Dead subscriptions (uninstalled app, revoked permission)
 * are removed automatically.
 */
export async function notifyAll(payload, { exceptEndpoint } = {}) {
  if (!pushEnabled) return;
  const { rows } = await pool.query("SELECT endpoint, p256dh, auth FROM push_subscriptions");
  const body = JSON.stringify(payload);

  await Promise.all(
    rows
      .filter((r) => r.endpoint !== exceptEndpoint)
      .map(async (r) => {
        try {
          await webpush.sendNotification(
            { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
            body,
            { TTL: 60 * 60 * 24 }
          );
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [r.endpoint]);
          } else {
            console.error("Push failed:", err.statusCode, err.body || err.message);
          }
        }
      })
  );
}

export default router;
