export interface PushServerConfig {
  enabled: boolean;
  publicKey: string | null;
  privateKey: string | null;
  contactEmail: string;
}

export interface PushPublicConfig {
  enabled: boolean;
  publicKey: string | null;
}

const normalizeContact = (value: string | undefined | null): string => {
  if (!value || value.trim().length === 0) {
    return "mailto:no-reply@anynote.app";
  }

  return value.startsWith("mailto:") ? value : `mailto:${value}`;
};

let cachedServerConfig: PushServerConfig | null = null;

export const getPushServerConfig = (): PushServerConfig => {
  if (cachedServerConfig) {
    return cachedServerConfig;
  }

  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? null;
  const contactEmail = normalizeContact(process.env.PUSH_CONTACT_EMAIL);

  const enabled = Boolean(publicKey && privateKey);

  cachedServerConfig = {
    enabled,
    publicKey: enabled ? publicKey : null,
    privateKey: enabled ? privateKey : null,
    contactEmail,
  };

  return cachedServerConfig;
};

export const getPushPublicConfig = (): PushPublicConfig => {
  const { enabled, publicKey } = getPushServerConfig();
  return {
    enabled,
    publicKey,
  };
};

export const resetPushConfigCache = () => {
  cachedServerConfig = null;
};
