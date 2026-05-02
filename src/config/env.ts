import dotenv from "dotenv";

dotenv.config();

type AuthMode = "dev" | "firebase";
type StorageProvider = "memory" | "firestore";

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return raw.trim().toLowerCase() === "true";
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: readNumber("PORT", 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  authMode: (process.env.AUTH_MODE ?? "dev") as AuthMode,
  allowDevTokenFallback: readBoolean("ALLOW_DEV_TOKEN_FALLBACK", process.env.NODE_ENV !== "production"),
  storageProvider: (process.env.STORAGE_PROVIDER ?? "memory") as StorageProvider,
  minimumGwa: readNumber("MINIMUM_GWA", 2.5),
  maxApplicationsPerSemester: readNumber("MAX_APPLICATIONS_PER_SEMESTER", 5),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
  subsystemBaseUrls: {
    srm: process.env.SRM_BASE_URL ?? "",
    cms: process.env.CMS_BASE_URL ?? "",
    sgvces: process.env.SGVCES_BASE_URL ?? "",
    uanas: process.env.UANAS_BASE_URL ?? "",
    finance: process.env.FINANCE_BASE_URL ?? ""
  }
};
