import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

const TOKEN_KEY = 'sipersada_gdrive_token';
const USER_KEY = 'sipersada_gdrive_user';

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentGoogleUser: User | null = null;

// Initialize cached token from storage if available
try {
  cachedAccessToken = localStorage.getItem(TOKEN_KEY) || null;
  const rawUser = localStorage.getItem(USER_KEY);
  if (rawUser) {
    currentGoogleUser = JSON.parse(rawUser) as User;
  }
} catch {
  // Ignore localStorage access issues
}

type AuthChangeListener = (user: User | null, token: string | null) => void;
const listeners: AuthChangeListener[] = [];

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      currentGoogleUser = user;
      try {
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            uid: user.uid,
          })
        );
      } catch {
        // ignore
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        notifyListeners(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
        notifyListeners(user, null);
      }
    } else {
      if (!cachedAccessToken) {
        currentGoogleUser = null;
        if (onAuthFailure) onAuthFailure();
        notifyListeners(null, null);
      }
    }
  });
};

const notifyListeners = (user: User | null, token: string | null) => {
  listeners.forEach(fn => fn(user, token));
};

export const subscribeGoogleAuth = (fn: AuthChangeListener) => {
  listeners.push(fn);
  fn(currentGoogleUser, cachedAccessToken);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

export const signInWithGoogleDrive = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh token otorisasi dari Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    currentGoogleUser = result.user;

    try {
      localStorage.setItem(TOKEN_KEY, credential.accessToken);
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          uid: result.user.uid,
        })
      );
    } catch {
      // ignore
    }

    notifyListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in with Google Drive error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      // ignore
    }
  }
  return cachedAccessToken;
};

export const getGoogleUser = (): User | null => {
  return currentGoogleUser;
};

export const signOutGoogleDrive = async () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  cachedAccessToken = null;
  currentGoogleUser = null;
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  notifyListeners(null, null);
};
