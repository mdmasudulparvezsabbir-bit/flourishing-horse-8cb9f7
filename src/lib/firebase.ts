import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App gracefully (supporting hot-reloads and avoiding duplicate app errors)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL Constraint: Must pass firestoreDatabaseId explicitly
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Operational Enums for Firestore Error Handling
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global Custom Error Handler
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error("Firestore Error Detailed Payload: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check verification on startup
export async function testFirebaseConnection() {
  try {
    // Attempt standard server fetch
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("[Firebase Connection] SDK probe verified successfully.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("[Firebase Connection Error] Please check your Firebase offline status or rules config.");
    } else {
      console.log("[Firebase Connection Probe] Status code or rules rejected (normal expected alert for connection probe):", error.message);
    }
  }
}

testFirebaseConnection();
