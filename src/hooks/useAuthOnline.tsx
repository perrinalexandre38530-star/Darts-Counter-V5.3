// ============================================
// src/hooks/useAuthOnline.tsx
// Hook + Provider pour le Mode Online
// - wrappe onlineApi (signup / login / logout / updateProfile / restoreSession)
// - centralise l'état : status, user, profile, loading
// ============================================

import React from "react";
import type { UserAuth, OnlineProfile } from "../lib/onlineTypes";
import {
  onlineApi,
  type AuthSession,
  type SignupPayload,
  type LoginPayload,
  type UpdateProfilePayload,
} from "../lib/onlineApi";

export type OnlineAuthStatus =
  | "idle" // pas encore initialisé
  | "checking" // restoreSession en cours
  | "signed_out" // pas connecté
  | "signed_in"; // connecté

export type AuthOnlineContextValue = {
  status: OnlineAuthStatus;
  loading: boolean; // true si une action est en cours (login, signup, update...)
  user: UserAuth | null;
  profile: OnlineProfile | null;
  isMock: boolean; // true si aucun backend (mode localStorage)

  // Actions
  signup: (payload: SignupPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<void>;
};

const AuthOnlineContext = React.createContext<AuthOnlineContextValue | undefined>(
  undefined
);

// ============================================
// Provider
// ============================================

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<OnlineAuthStatus>("idle");
  const [loading, setLoading] = React.useState(false);

  const [user, setUser] = React.useState<UserAuth | null>(null);
  const [profile, setProfile] = React.useState<OnlineProfile | null>(null);

  // applique une AuthSession
  const applySession = React.useCallback((s: AuthSession | null) => {
    if (s) {
      setUser(s.user);
      setProfile(s.profile);
      setStatus("signed_in");
    } else {
      setUser(null);
      setProfile(null);
      setStatus("signed_out");
    }
  }, []);

  // -------- Initialisation (restoreSession) --------
  React.useEffect(() => {
    let alive = true;

    (async () => {
      setStatus("checking");
      setLoading(true);
      try {
        const s = await onlineApi.restoreSession();
        if (!alive) return;
        console.log("[online] restoreSession result:", s);
        applySession(s);
      } catch (err) {
        if (!alive) return;
        console.warn("[online] restoreSession error:", err);
        applySession(null);
      } finally {
        if (!alive) return;
        setLoading(false);
        console.log("[online] end restore, status =", status);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applySession]);

  // -------- Actions publiques --------

  async function signup(payload: SignupPayload): Promise<void> {
    setLoading(true);
    try {
      const s = await onlineApi.signup(payload);
      console.log("[online] signup session:", s);
      applySession(s);
    } catch (err) {
      console.warn("[online] signup error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function login(payload: LoginPayload): Promise<void> {
    setLoading(true);
    try {
      const s = await onlineApi.login(payload);
      console.log("[online] login session:", s);
      applySession(s);
    } catch (err) {
      console.warn("[online] login error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    setLoading(true);
    try {
      await onlineApi.logout();
      applySession(null);
    } catch (err) {
      console.warn("[online] logout error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const s = await onlineApi.restoreSession();
      console.log("[online] refresh result:", s);
      applySession(s);
    } catch (err) {
      console.warn("[online] refresh error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(patch: UpdateProfilePayload): Promise<void> {
    if (!user) return;
    setLoading(true);
    try {
      const prof = await onlineApi.updateProfile(patch);
      console.log("[online] updateProfile result:", prof);
      setProfile(prof);
    } catch (err) {
      console.warn("[online] updateProfile error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const value: AuthOnlineContextValue = {
    status,
    loading,
    user,
    profile,
    isMock: onlineApi.USE_MOCK,
    signup,
    login,
    logout,
    refresh,
    updateProfile,
  };

  return (
    <AuthOnlineContext.Provider value={value}>
      {children}
    </AuthOnlineContext.Provider>
  );
}

// ============================================
// Hook de consommation
// ============================================

export function useAuthOnline(): AuthOnlineContextValue {
  const ctx = React.useContext(AuthOnlineContext);
  if (!ctx) {
    throw new Error(
      "useAuthOnline doit être utilisé dans un <AuthOnlineProvider>."
    );
  }
  return ctx;
}
