import webpush from "web-push";
import { StoredNotification } from "@/modules/notifications/types";
import {
  getPushSubscriptionsForUser,
  removePushSubscriptionForUser,
} from "@/modules/users/server/userRepository";
import { PushSubscriptionRecord } from "@/modules/users/types";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const CONTACT = process.env.PUSH_CONTACT_EMAIL ?? "mailto:no-reply@anynote.app";

let configured = false;

const ensureConfigured = () => {
  if (configured) {
    return true;
  }

  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[push] VAPID keys are not configured. Define NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable device notifications.",
      );
    }
    return false;
  }

  try {
    const contactDetail = CONTACT.startsWith("mailto:") ? CONTACT : `mailto:${CONTACT}`;
    webpush.setVapidDetails(contactDetail, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
    return true;
  } catch (error) {
    console.error("[push] Failed to configure web-push:", error);
    return false;
  }
};

const formatNotificationPayload = (notification: StoredNotification) => {
  const actor = notification.actorName ?? "Someone";
  let title = "Anyn0te";
  let body = "You have a new update.";

  if (notification.type === "reaction") {
    const feeling =
      notification.reaction === "love"
        ? "shared a warm feeling about"
        : notification.reaction === "dislike"
          ? "shared a concerned feeling about"
          : "shared a feeling about";
    title = `${actor} ${feeling} your note`;
    body = notification.noteTitle
      ? `"${notification.noteTitle}"`
      : "Open Anyn0te to see their feeling.";
  } else {
    title = `${actor} shared a thought on your note`;
    body = notification.noteTitle
      ? `"${notification.noteTitle}"`
      : "Open Anyn0te to read the new thought.";
    if (notification.isPrivate) {
      title = `${actor} sent a private thought`;
    }
  }

  return {
    title,
    body,
    url: "/dashboard",
  };
};

export const sendPushNotificationForUser = async (
  userId: string,
  notification: StoredNotification,
) => {
  if (!ensureConfigured()) {
    return;
  }

  const subscriptions = await getPushSubscriptionsForUser(userId);
  if (subscriptions.length === 0) {
    return;
  }

  const payload = JSON.stringify(formatNotificationPayload(notification));

  await Promise.all(
    subscriptions.map(async (subscription: PushSubscriptionRecord) => {
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410 || statusCode === 403) {
          await removePushSubscriptionForUser(userId, subscription.endpoint);
          return;
        }

        console.error("[push] Failed to deliver notification:", error);
      }
    }),
  );
};
