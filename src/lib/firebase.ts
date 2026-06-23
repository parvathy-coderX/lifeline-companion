import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, type User, type Auth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, type Firestore } from "firebase/firestore";

// Cache for access token and config
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: Auth | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(db: Firestore) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// SCOPES required for Google Calendar Integration
export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events"
];

export async function fetchFirebaseConfig() {
  try {
    const res = await fetch("/api/firebase-config");
    if (!res.ok) throw new Error("Failed to fetch config");
    const data = await res.json();
    return data; // returns firebase-applet-config JSON or null
  } catch (err) {
    console.warn("Could not retrieve Firebase config from backend:", err);
    return null;
  }
}

export function getFirebaseAuth(config: any): Auth | null {
  if (firebaseAuth) return firebaseAuth;
  if (!config) return null;

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    firebaseAuth = getAuth(app);
    
    // Configure Google Auth provider with required calendar scopes
    googleProvider = new GoogleAuthProvider();
    CALENDAR_SCOPES.forEach(scope => {
      googleProvider?.addScope(scope);
    });
    
    return firebaseAuth;
  } catch (err) {
    console.error("Firebase auth initialization failed:", err);
    return null;
  }
}

export function getFirestoreDb(config: any): Firestore | null {
  if (firebaseDb) return firebaseDb;
  if (!config) return null;

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    firebaseDb = getFirestore(app, config.firestoreDatabaseId);
    return firebaseDb;
  } catch (err) {
    console.error("Firestore database initialization failed:", err);
    return null;
  }
}

export const initAuthListener = (
  auth: Auth,
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token was cleared or expired
        cachedAccessToken = null;
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

export const googleSignIn = async (auth: Auth): Promise<{ user: User; accessToken: string } | null> => {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    CALENDAR_SCOPES.forEach(scope => {
      googleProvider?.addScope(scope);
    });
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve Google Calendar access token");
    }

    cachedAccessToken = credential.accessToken;
    // Persist temporary indicator in sessionStorage for page refreshes
    sessionStorage.setItem("lifeline_calendar_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  // Fallback to session storage if token was saved recently (in-memory is primary, but session-level is helpful inside the sandboxed iframe page refreshes)
  const sessionToken = sessionStorage.getItem("lifeline_calendar_token");
  if (sessionToken) {
    cachedAccessToken = sessionToken;
    return sessionToken;
  }
  return null;
};

export const logoutGoogle = async (auth: Auth) => {
  await auth.signOut();
  cachedAccessToken = null;
  sessionStorage.removeItem("lifeline_calendar_token");
};
