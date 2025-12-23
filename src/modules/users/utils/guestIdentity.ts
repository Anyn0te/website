const GUEST_ID_STORAGE_KEY = "anynote:guest-id";
const GUEST_ID_COOKIE_KEY = "anynote_guest_id";

const createGuestId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest-${crypto.randomUUID()}`;
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const setGuestCookie = (guestId: string) => {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const cookieValue = encodeURIComponent(guestId);
    document.cookie = `${GUEST_ID_COOKIE_KEY}=${cookieValue}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore cookie failures
  }
};

export const getStoredGuestId = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
    return stored && stored.trim().length > 0 ? stored : null;
  } catch {
    return null;
  }
};

export const ensureGuestIdentity = (): string => {
  if (typeof window === "undefined") {
    const fallback = createGuestId();
    return fallback;
  }

  let guestId = getStoredGuestId();
  if (!guestId) {
    guestId = createGuestId();
    try {
      window.localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
    } catch {
      // ignore localStorage failures
    }
  }

  setGuestCookie(guestId);
  return guestId;
};

export const clearGuestIdentity = () => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(GUEST_ID_STORAGE_KEY);
    } catch {
      // ignore localStorage failures
    }
  }

  if (typeof document !== "undefined") {
    try {
      document.cookie = `${GUEST_ID_COOKIE_KEY}=; path=/; max-age=0`;
    } catch {
      // ignore cookie failures
    }
  }
};

export { GUEST_ID_STORAGE_KEY, GUEST_ID_COOKIE_KEY };
