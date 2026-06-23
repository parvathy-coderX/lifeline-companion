import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, type User, type Auth } from "firebase/auth";

// Cache for access token and config
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let cachedAccessToken: string | null = null;
let isSigningIn = false;

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
