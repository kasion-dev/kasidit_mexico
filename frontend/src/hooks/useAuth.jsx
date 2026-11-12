import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, firebaseConfigured } from "../lib/firebase";

const AuthContext = createContext(null);

let cachedIdToken = null;

export function getCachedIdToken() {
  return cachedIdToken;
}

export async function getFreshIdToken() {
  if (!auth?.currentUser) return null;
  cachedIdToken = await auth.currentUser.getIdToken();
  return cachedIdToken;
}

const GUEST_FLAG = "kmx_guest";

// Guest mode: no sign-in, data stays in this browser's localStorage only
// (the Worker rejects every request without a Firebase token).
const GUEST_USER = { uid: "guest", email: "ไม่ได้ล็อกอิน", photoURL: null, isGuest: true };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(() => {
    try {
      return localStorage.getItem(GUEST_FLAG) === "1";
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      cachedIdToken = nextUser ? await nextUser.getIdToken() : null;
      if (nextUser) leaveGuest();
      setLoading(false);
    });
    return unsub;
  }, []);

  function enterGuest() {
    try {
      localStorage.setItem(GUEST_FLAG, "1");
    } catch {}
    setGuest(true);
  }

  function leaveGuest() {
    try {
      localStorage.removeItem(GUEST_FLAG);
    } catch {}
    setGuest(false);
  }

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function signOutUser() {
    if (guest) return leaveGuest();
    await signOut(auth);
  }

  const effectiveUser = user || (guest ? GUEST_USER : null);

  return (
    <AuthContext.Provider value={{ user: effectiveUser, loading, signInWithGoogle, signOutUser, enterGuest, firebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
