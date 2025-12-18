// ============================================
// src/hooks/useAuthOnline.tsx
// Auth Online unifiée (MOCK ou Supabase réel)
// - Compatible ancien code (user/profile/status/loading/...)
// - En mode réel : email + mot de passe requis
// - En mode mock : pseudo uniquement
// ✅ FIX: ajoute "ready" pour éviter que l'app conclue trop tôt "pas de compte"
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
  ready: boolean; // ✅ AJOUT: vrai quand restoreSession a fini (même si signed_out)
  user: UserAuth | null;
  profile: OnlineProfile | null;
  isMock: boolean;
  signup: (p: {
    nickname: string;
    email?: string;
    password?: string;
  }) => Promise<void>;
  login: (p: {
    nickname?: string;
    email?: string;
    password?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthOnlineContext = React.createContext<AuthOnlineContextValue | null>(
  null
);

// ============================================
// Provider
// ============================================

export function AuthOnlineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<Status>("checking");
  const [loading, setLoading] = React.useState(false);

  // ✅ AJOUT
  const [ready, setReady] = React.useState(false);

  const [user, setUser] = React.useState<UserAuth | null>(null);
  const [profile, setProfile] = React.useState<OnlineProfile | null>(null);

  // Applique une session (ou null) : user + profil complet
  const applySession = React.useCallback((session: AuthSession | null) => {
    // ✅ IMPORTANT: dès qu'on a une réponse (session OU null), on est "ready"
    setReady(true);

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

  // Restore au chargement (lecture depuis Supabase / localStorage via onlineApi)
  React.useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        // ✅ AJOUT: on repasse en "checking" + not ready le temps du restore
        setReady(false);
        setStatus("checking");

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

  // SIGNUP
  async function signup(params: {
    nickname: string;
    email?: string;
    password?: string;
  }) {
    const nickname = params.nickname?.trim();
    const email = params.email?.trim();
    const password = params.password?.trim();

    setLoading(true);
    try {
      // Mode MOCK : pseudo seulement
      if (onlineApi.USE_MOCK) {
        if (!nickname) throw new Error("Pseudo requis");
        const session = await onlineApi.signup({ nickname });
        applySession(session);
        return;
      }

      // Mode Supabase réel : email + mot de passe obligatoires
      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis pour créer un compte.");
      }

      const session = await onlineApi.signup({
        email,
        password,
        nickname: nickname || email,
      });

      applySession(session);
    } finally {
      setLoading(false);
    }
  }

  // LOGIN
  async function login(params: {
    nickname?: string;
    email?: string;
    password?: string;
  }) {
    const nickname = params.nickname?.trim();
    const email = params.email?.trim();
    const password = params.password?.trim();

    setLoading(true);
    try {
      // Mode MOCK : pseudo seulement
      if (onlineApi.USE_MOCK) {
        if (!nickname) throw new Error("Pseudo requis");
        const session = await onlineApi.login({ nickname });
        applySession(session);
        return;
      }

      // Mode Supabase réel : email + mot de passe obligatoires
      if (!email || !password) {
        throw new Error("Email et mot de passe sont requis pour se connecter.");
      }

      const session = await onlineApi.login({
        email,
        password,
        nickname: nickname || undefined,
      });

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

  // UPDATE PROFILE (toutes les infos perso + avatar_url, etc.)
  async function updateProfile(patch: UpdateProfilePayload) {
    setLoading(true);
    try {
      const newProfile = await onlineApi.updateProfile(patch);
      // on remplace le profil par celui retourné par l'API (toutes les colonnes)
      setProfile(newProfile);
    } finally {
      setLoading(false);
    }
  }

  // REFRESH (re-lire la session complète : user + profil)
  async function refresh() {
    setLoading(true);
    try {
      const session = await onlineApi.restoreSession();
      applySession(session);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthOnlineContext.Provider
      value={{
        status,
        loading,
        ready, // ✅ AJOUT
        user,
        profile,
        isMock: onlineApi.USE_MOCK,
        signup,
        login,
        logout,
        updateProfile,
        refresh,
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
