// ============================================
// src/hooks/useAuthOnline.tsx
// Auth Online SIMPLE + 100% compatible MOCK
// - Pas d’email / pas de mot de passe requis
// - Pseudo uniquement
// - Utilise onlineApi (mock ou backend futur)
// ============================================

import React from "react";
import {
  onlineApi,
  type AuthSession,
  type UpdateProfilePayload,
} from "../lib/onlineApi";
import type { UserAuth, OnlineProfile } from "../lib/onlineTypes";

type Status = "checking" | "signed_out" | "signed_in";

export type AuthOnlineContextValue = {
  status: Status;
  loading: boolean;
  user: UserAuth | null;
  profile: OnlineProfile | null;
  isMock: boolean;
  signup: (p: { nickname: string; email?: string; password?: string }) => Promise<void>;
  login: (p: { nickname?: string; email?: string; password?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<void>;
};

const AuthOnlineContext = React.createContext<AuthOnlineContextValue | null>(null);

// ============================================
// Provider
// ============================================

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("checking");
  const [loading, setLoading] = React.useState(false);
  const [user, setUser] = React.useState<UserAuth | null>(null);
  const [profile, setProfile] = React.useState<OnlineProfile | null>(null);

  // Applique une session
  const applySession = React.useCallback((session: AuthSession | null) => {
    if (!session) {
      setStatus("signed_out");
      setUser(null);
      setProfile(null);
      return;
    }
    setStatus("signed_in");
    setUser(session.user);
    setProfile(session.profile);
  }, []);

  // Restore au chargement
  React.useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const session = await onlineApi.restoreSession();
        if (!cancelled) applySession(session);
      } catch (e) {
        console.warn("[authOnline] restore error", e);
        if (!cancelled) applySession(null);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // SIGNUP (pseudo only)
  async function signup(params: { nickname: string; email?: string; password?: string }) {
    const nickname = params.nickname.trim();
    if (!nickname) throw new Error("Pseudo requis");

    setLoading(true);
    try {
      const session = await onlineApi.signup({ nickname });
      applySession(session);
    } finally {
      setLoading(false);
    }
  }

  // LOGIN (pseudo only)
  async function login(params: { nickname?: string; email?: string; password?: string }) {
    const nickname = params.nickname?.trim();
    if (!nickname) throw new Error("Pseudo requis");

    setLoading(true);
    try {
      const session = await onlineApi.login({ nickname });
      applySession(session);
    } finally {
      setLoading(false);
    }
  }

  // LOGOUT
  async function logout() {
    setLoading(true);
    try {
      await onlineApi.logout();
      applySession(null);
    } finally {
      setLoading(false);
    }
  }

  // UPDATE PROFILE
  async function updateProfile(patch: UpdateProfilePayload) {
    setLoading(true);
    try {
      const newProfile = await onlineApi.updateProfile(patch);
      setProfile(newProfile);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthOnlineContext.Provider
      value={{
        status,
        loading,
        user,
        profile,
        isMock: onlineApi.USE_MOCK,
        signup,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthOnlineContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuthOnline(): AuthOnlineContextValue {
  const ctx = React.useContext(AuthOnlineContext);
  if (!ctx) {
    throw new Error("useAuthOnline doit être utilisé dans un AuthOnlineProvider.");
  }
  return ctx;
}
