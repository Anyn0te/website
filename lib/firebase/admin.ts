import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

let cachedAdminApp: App | null = null;

const getAdminApp = () => {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  const isAuthEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-project";

  if (!projectId) {
    throw new Error("Firebase project ID is not configured.");
  }

  if (!getApps().length) {
    if (isAuthEmulator) {
      cachedAdminApp = initializeApp({ projectId });
    } else {
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (!clientEmail || !privateKey) {
        throw new Error(
          "Missing Firebase admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
        );
      }

      cachedAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    }
  } else {
    cachedAdminApp = getApps()[0]!;
  }

  return cachedAdminApp;
};

export const verifyIdToken = async (token: string): Promise<DecodedIdToken> => {
  const app = getAdminApp();
  return getAuth(app).verifyIdToken(token);
};
