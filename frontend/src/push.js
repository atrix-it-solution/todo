import { api, PUSH_ENDPOINT_KEY } from "./api.js";

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

let regPromise = null;
export function registerSW() {
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);
  regPromise ??= navigator.serviceWorker.register("/sw.js").catch((err) => {
    console.warn("Service worker registration failed:", err);
    return null;
  });
  return regPromise;
}

function keyToBytes(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const sameKey = (buf, bytes) => {
  if (!buf) return false;
  const a = new Uint8Array(buf);
  return a.length === bytes.length && a.every((v, i) => v === bytes[i]);
};

const remember = (endpoint) => {
  try {
    endpoint ? localStorage.setItem(PUSH_ENDPOINT_KEY, endpoint) : localStorage.removeItem(PUSH_ENDPOINT_KEY);
  } catch {
    /* storage unavailable — not critical */
  }
};

/**
 * "on" | "off" | "denied" | "ios-install" (iPhone, not opened from Home Screen) | "unsupported"
 */
export async function getPushState() {
  if (!supported()) return isIOS() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await registerSW();
  const sub = reg && (await reg.pushManager.getSubscription());
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush() {
  // Must be the first await so iPhone treats it as a direct user tap
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    const err = new Error(
      permission === "denied"
        ? "Notifications are blocked. Allow them for TaskFlow in your phone settings."
        : "Notification permission was not given."
    );
    err.code = permission;
    throw err;
  }

  const reg = await registerSW();
  if (!reg) throw new Error("Notifications can't start on this device.");
  await navigator.serviceWorker.ready;

  const { publicKey } = await api.pushPublicKey();
  const key = keyToBytes(publicKey);

  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options?.applicationServerKey, key)) {
    await sub.unsubscribe(); // server keys changed — start fresh
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

  await api.pushSubscribe(sub.toJSON());
  remember(sub.endpoint);
}

export async function disablePush() {
  const reg = await registerSW();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) {
    await api.pushUnsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  remember(null);
}

/** Re-send an existing subscription so the server always knows this device. */
export async function syncPush() {
  if (!supported() || Notification.permission !== "granted") return;
  const reg = await registerSW();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return remember(null);
  remember(sub.endpoint);
  await api.pushSubscribe(sub.toJSON()).catch(() => {});
}
