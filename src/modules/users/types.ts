import { StoredNote } from "@/modules/notes/types";
import { StoredNotification } from "@/modules/notifications/types";

export type ThemePreference = "system" | "light" | "dark";

export interface UserRecord {
  userId: string;
  username: string | null;
  displayUsername: boolean;
  themePreference: ThemePreference;
  followers: string[];
  following: string[];
  notes: StoredNote[];
  notifications: StoredNotification[];
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
