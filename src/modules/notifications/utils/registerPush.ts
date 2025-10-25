import { urlBase64ToUint8Array } from "./urlBase64";

interface PushPublicConfig {
  enabled: boolean;
  publicKey: string | null;
}

let cachedConfig: PushPublicConfig | null = null;
let configPromise: Promise<PushPublicConfig> | null = null;

const fetchPushConfig = async (): Promise<PushPublicConfig> => {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!configPromise) {
    configPromise = fetch("/api/push/config", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Invalid push configuration response.");
        }
        return (await response.json()) as PushPublicConfig;
      })
      .then((config) => {
        cachedConfig = config;
        return config;
      })
      .catch((error) => {
        configPromise = null;
        throw error;
      });
  }

  return configPromise;
};

const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/push-sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
};

export const ensurePushSubscription = async (authToken?: string | null) => {
  if (typeof window === "undefined") {
    return false;
  }

  let config: PushPublicConfig;
  try {
    config = await fetchPushConfig();
  } catch (configError) {
    console.error("Unable to resolve push notification configuration:", configError);
    return false;
  }

  if (!config.enabled || !config.publicKey) {
    return false;
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const registration = (await navigator.serviceWorker.getRegistration("/push-sw.js")) ?? (await registerServiceWorker());

  if (!registration) {
    return false;
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
    } catch (subscriptionError) {
      console.error("Unable to subscribe to push notifications:", subscriptionError);
      return false;
    }
  }

  try {
    await fetch("/api/push/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        subscription,
      }),
    });
  } catch (error) {
    console.error("Failed to store push subscription:", error);
    return false;
  }

  return true;
};

export const removePushSubscription = async (authToken?: string | null) => {
  if (typeof window === "undefined") {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration("/push-sw.js");
  if (!registration) {
    return false;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return false;
  }

  try {
    await subscription.unsubscribe();
  } catch (error) {
    console.error("Failed to unsubscribe from push notifications:", error);
  }

  try {
    await fetch("/api/push/subscriptions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (error) {
    console.error("Failed to remove push subscription record:", error);
  }

  return true;
};
