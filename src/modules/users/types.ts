import { StoredNote } from "@/modules/notes/types";
import { StoredNotification } from "@/modules/notifications/types";

export type ThemePreference = "system" | "light" | "dark";

export type UserRole = "anonymous" | "user" | "moderator" | "admin";

export interface PushSubscriptionRecord {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface UserRecord {
  userId: string;
  username: string | null;
  displayUsername: boolean;
  themePreference: ThemePreference;
  followers: string[];
  following: string[];
  notes: StoredNote[];
  notifications: StoredNotification[];
  pushSubscriptions: PushSubscriptionRecord[];
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserSummary {
  userId: string;
  username: string | null;
  followers: number;
  following: number;
}

export interface UserSettingsPayload {
  username: string | null;
  displayUsername: boolean;
  themePreference: ThemePreference;
}
