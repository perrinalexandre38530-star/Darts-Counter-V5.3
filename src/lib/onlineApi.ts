// ============================================
// src/lib/onlineApi.ts
// API Mode Online (auth / profil / matchs)
// - Utilise un backend si VITE_ONLINE_API_BASE_URL est défini
// - Sinon fallback en mode MOCK via localStorage
// ============================================

import type {
    UserAuth,
    OnlineProfile,
    OnlineMatch,
  } from "./onlineTypes";
  
  // --------------------------------------------
  // Config
  // --------------------------------------------
  
  const ONLINE_API_BASE_URL =
    (import.meta as any).env?.VITE_ONLINE_API_BASE_URL || null;
  
  const USE_MOCK = !ONLINE_API_BASE_URL;
  
  // Clés localStorage pour le mode MOCK
  const LS_AUTH_KEY = "dc_online_auth_v1";
  const LS_MATCHES_KEY = "dc_online_matches_v1";
  
  // --------------------------------------------
  // Types publics de l'API
  // --------------------------------------------
  
  export type AuthSession = {
    token: string;
    user: UserAuth;
    profile: OnlineProfile | null;
  };
  
  export type SignupPayload = {
    email?: string;
    nickname: string;
    password?: string; // optionnel si tu veux passer par magic link plus tard
  };
  
  export type LoginPayload = {
    email?: string;
    nickname?: string;
    password?: string;
  };
  
  export type UpdateProfilePayload = Partial<
    Pick<
      OnlineProfile,
      "displayName" | "avatarUrl" | "country" | "bio" | "stats"
    >
  >;
  
  export type UploadMatchPayload = Omit<
    OnlineMatch,
    "id" | "userId" | "startedAt" | "finishedAt"
  > & {
    startedAt?: number;
    finishedAt?: number;
  };
  
  // --------------------------------------------
  // Helpers utilitaires (safe parse JSON)
  // --------------------------------------------
  
  function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  
  function now() {
    return Date.now();
  }
  
  // --------------------------------------------
  // Implémentation MOCK (localStorage)
  // --------------------------------------------
  
  function mockLoadAuth(): AuthSession | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LS_AUTH_KEY);
    return safeParse<AuthSession | null>(raw, null);
  }
  
  function mockSaveAuth(session: AuthSession | null) {
    if (typeof window === "undefined") return;
    if (!session) {
      window.localStorage.removeItem(LS_AUTH_KEY);
    } else {
      window.localStorage.setItem(LS_AUTH_KEY, JSON.stringify(session));
    }
  }
  
  function mockLoadMatches(): OnlineMatch[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(LS_MATCHES_KEY);
    return safeParse<OnlineMatch[]>(raw, []);
  }
  
  function mockSaveMatches(list: OnlineMatch[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_MATCHES_KEY, JSON.stringify(list));
  }
  
  function mockGenerateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(
      36
    )}`;
  }
  
  // --------------------------------------------
  // Implémentation HTTP (backend réel)
  // --------------------------------------------
  
  async function http<T>(
    path: string,
    options: RequestInit & { token?: string } = {}
  ): Promise<T> {
    if (!ONLINE_API_BASE_URL) {
      throw new Error("ONLINE_API_BASE_URL non configuré");
    }
  
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
  
    if (options.token) {
      (headers as any).Authorization = `Bearer ${options.token}`;
      delete (options as any).token;
    }
  
    const res = await fetch(`${ONLINE_API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Erreur API (${res.status}) sur ${path} : ${text || res.statusText}`
      );
    }
  
    return (await res.json()) as T;
  }
  
  // --------------------------------------------
  // Fonctions publiques : AUTH
  // --------------------------------------------
  
  async function signup(payload: SignupPayload): Promise<AuthSession> {
    if (USE_MOCK) {
      // --- MOCK ---
      const existing = mockLoadAuth();
      if (existing && existing.user.nickname === payload.nickname) {
        return existing;
      }
  
      const user: UserAuth = {
        id: mockGenerateId("user"),
        email: payload.email,
        nickname: payload.nickname,
        createdAt: now(),
      };
  
      const profile: OnlineProfile = {
        id: mockGenerateId("profile"),
        userId: user.id,
        displayName: payload.nickname,
        avatarUrl: undefined,
        country: undefined,
        bio: "",
        stats: {
          totalMatches: 0,
          totalLegs: 0,
          avg3: 0,
          bestVisit: 0,
          bestCheckout: 0,
        },
        updatedAt: now(),
      };
  
      const session: AuthSession = {
        token: mockGenerateId("token"),
        user,
        profile,
      };
  
      mockSaveAuth(session);
      return session;
    }
  
    // --- HTTP réel ---
    const res = await http<AuthSession>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Tu peux ici aussi persister le token en local
    mockSaveAuth(res);
    return res;
  }
  
  async function login(payload: LoginPayload): Promise<AuthSession> {
    if (USE_MOCK) {
      // --- MOCK ---
      const existing = mockLoadAuth();
      if (existing) return existing;
  
      // si pas de compte enregistré, on fait comme un signup rapide
      const nickname =
        payload.nickname || payload.email || `Player-${Math.floor(Math.random() * 9999)}`;
      return signup({ nickname, email: payload.email, password: payload.password });
    }
  
    // --- HTTP réel ---
    const res = await http<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    mockSaveAuth(res);
    return res;
  }
  
  async function restoreSession(): Promise<AuthSession | null> {
    if (USE_MOCK) {
      return mockLoadAuth();
    }
  
    // En mode HTTP, on part du token en localStorage
    const saved = mockLoadAuth();
    if (!saved?.token) return null;
  
    try {
      const res = await http<AuthSession>("/auth/me", {
        method: "GET",
        token: saved.token,
      });
      const session: AuthSession = {
        token: saved.token,
        user: res.user,
        profile: res.profile,
      };
      mockSaveAuth(session);
      return session;
    } catch {
      mockSaveAuth(null);
      return null;
    }
  }
  
  async function logout(): Promise<void> {
    if (USE_MOCK) {
      mockSaveAuth(null);
      return;
    }
  
    const saved = mockLoadAuth();
    if (saved?.token) {
      try {
        await http<void>("/auth/logout", {
          method: "POST",
          token: saved.token,
        });
      } catch {
        // on ignore l'erreur côté client
      }
    }
    mockSaveAuth(null);
  }
  
  // --------------------------------------------
  // Fonctions publiques : PROFIL
  // --------------------------------------------
  
  async function updateProfile(
    patch: UpdateProfilePayload
  ): Promise<OnlineProfile> {
    if (USE_MOCK) {
      const session = mockLoadAuth();
      if (!session || !session.profile) {
        throw new Error("Non authentifié (mock)");
      }
  
      const updated: OnlineProfile = {
        ...session.profile,
        ...patch,
        stats: {
          ...session.profile.stats,
          ...(patch.stats || {}),
        },
        updatedAt: now(),
      };
  
      const newSession: AuthSession = {
        ...session,
        profile: updated,
      };
      mockSaveAuth(newSession);
      return updated;
    }
  
    const session = mockLoadAuth();
    if (!session?.token) {
      throw new Error("Non authentifié");
    }
  
    const profile = await http<OnlineProfile>("/profile/update", {
      method: "POST",
      token: session.token,
      body: JSON.stringify(patch),
    });
  
    const newSession: AuthSession = {
      ...session,
      profile,
    };
    mockSaveAuth(newSession);
    return profile;
  }
  
  // --------------------------------------------
  // Fonctions publiques : MATCHS ONLINE
  // --------------------------------------------
  
  async function uploadMatch(
    payload: UploadMatchPayload
  ): Promise<OnlineMatch> {
    if (USE_MOCK) {
      const session = mockLoadAuth();
      if (!session) {
        throw new Error("Non authentifié (mock)");
      }
  
      const list = mockLoadMatches();
      const match: OnlineMatch = {
        id: mockGenerateId("match"),
        userId: session.user.id,
        mode: payload.mode,
        payload: payload.payload,
        isTraining: payload.isTraining,
        startedAt: payload.startedAt || now(),
        finishedAt: payload.finishedAt || now(),
      };
  
      list.unshift(match);
      mockSaveMatches(list);
      return match;
    }
  
    const session = mockLoadAuth();
    if (!session?.token) {
      throw new Error("Non authentifié");
    }
  
    const match = await http<OnlineMatch>("/matches/upload", {
      method: "POST",
      token: session.token,
      body: JSON.stringify(payload),
    });
  
    // option : garder aussi un cache local
    const cached = mockLoadMatches();
    cached.unshift(match);
    mockSaveMatches(cached);
  
    return match;
  }
  
  async function listMatches(limit = 50): Promise<OnlineMatch[]> {
    if (USE_MOCK) {
      const list = mockLoadMatches();
      return list.slice(0, limit);
    }
  
    const session = mockLoadAuth();
    if (!session?.token) {
      throw new Error("Non authentifié");
    }
  
    const matches = await http<OnlineMatch[]>(
      `/matches/list?limit=${encodeURIComponent(limit)}`,
      {
        method: "GET",
        token: session.token,
      }
    );
  
    // option : mettre à jour le cache local
    mockSaveMatches(matches);
    return matches;
  }
  
  // --------------------------------------------
  // Export API unique
  // --------------------------------------------
  
  export const onlineApi = {
    // Auth
    signup,
    login,
    restoreSession,
    logout,
    // Profil
    updateProfile,
    // Matchs
    uploadMatch,
    listMatches,
    // Info
    USE_MOCK,
  };
  