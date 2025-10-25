import { urlBase64ToUint8Array } from "./urlBase64";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

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
    if (!PUBLIC_KEY) {
      console.warn("Push notifications require NEXT_PUBLIC_VAPID_PUBLIC_KEY to be set.");
      return false;
    }

    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
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
