// ============================================
// src/lib/onlineApi.ts
// API Mode Online (auth / profil / matchs / salons)
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
const LS_LOBBIES_KEY = "dc_online_lobbies_v1";

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

// ---------- Types Salons (Lobbies) ----------

export type LobbyStatus = "waiting" | "playing" | "finished";

export type LobbyPlayer = {
  userId: string;
  nickname: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
};

export type OnlineLobby = {
  id: string;
  code: string; // ex: "AB7F"
  mode: string; // ex: "x01", "cricket"...
  status: LobbyStatus;
  createdByUserId: string;
  createdAt: number;
  updatedAt: number;
  maxPlayers: number;
  players: LobbyPlayer[];
  settings?: Record<string, any>;
};

export type CreateLobbyPayload = {
  mode: string;
  maxPlayers?: number;
  settings?: Record<string, any>;
  code?: string; // optionnel : si tu veux forcer un code précis
};

export type JoinLobbyPayload = {
  code: string;
  userId: string;
  nickname: string;
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
// Helpers MOCK : IDs / Codes / Storage Lobbies
// --------------------------------------------

function mockGenerateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(
    36
  )}`;
}

function mockGenerateCode(length = 4): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // pas de 0/O/1/I
  let res = "";
  for (let i = 0; i < length; i++) {
    res += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return res;
}

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

// --- Lobbies mock ---

function mockLoadLobbies(): OnlineLobby[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LS_LOBBIES_KEY);
  return safeParse<OnlineLobby[]>(raw, []);
}

function mockSaveLobbies(list: OnlineLobby[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_LOBBIES_KEY, JSON.stringify(list));
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

// ---------- Fonctions publiques : MATCHS ONLINE ----------

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
      isTraining: (payload as any).isTraining ?? false,
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
// Fonctions publiques : SALONS (LOBBIES)
// --------------------------------------------

async function createLobby(
  payload: CreateLobbyPayload
): Promise<OnlineLobby> {
  if (USE_MOCK) {
    const session = mockLoadAuth();
    if (!session) {
      throw new Error("Non authentifié (mock)");
    }

    const list = mockLoadLobbies();

    // Génère un code unique
    let code = (payload.code || mockGenerateCode()).toUpperCase();
    const existingCodes = new Set(list.map((l) => l.code));
    while (existingCodes.has(code)) {
      code = mockGenerateCode().toUpperCase();
    }

    const nowTs = now();
    const maxPlayers = payload.maxPlayers && payload.maxPlayers > 0
      ? payload.maxPlayers
      : 4;

    const lobby: OnlineLobby = {
      id: mockGenerateId("lobby"),
      code,
      mode: payload.mode,
      status: "waiting",
      createdByUserId: session.user.id,
      createdAt: nowTs,
      updatedAt: nowTs,
      maxPlayers,
      players: [
        {
          userId: session.user.id,
          nickname: session.user.nickname,
          isHost: true,
          joinedAt: nowTs,
          lastSeen: nowTs,
        },
      ],
      settings: payload.settings || {},
    };

    list.unshift(lobby);
    mockSaveLobbies(list);
    return lobby;
  }

  const session = mockLoadAuth();
  if (!session?.token) {
    throw new Error("Non authentifié");
  }

  const lobby = await http<OnlineLobby>("/lobbies/create", {
    method: "POST",
    token: session.token,
    body: JSON.stringify(payload),
  });

  return lobby;
}

async function listLobbies(): Promise<OnlineLobby[]> {
  if (USE_MOCK) {
    return mockLoadLobbies();
  }

  const session = mockLoadAuth();
  if (!session?.token) {
    throw new Error("Non authentifié");
  }

  const lobbies = await http<OnlineLobby[]>("/lobbies/list", {
    method: "GET",
    token: session.token,
  });

  return lobbies;
}

async function joinLobby(
  payload: JoinLobbyPayload
): Promise<OnlineLobby> {
  if (USE_MOCK) {
    const list = mockLoadLobbies();
    const code = payload.code.trim().toUpperCase();

    const lobby = list.find((l) => l.code === code);
    if (!lobby) {
      throw new Error("Salon introuvable (code incorrect).");
    }

    if (lobby.status !== "waiting") {
      throw new Error("Ce salon n'est plus disponible.");
    }

    const already = lobby.players.find((p) => p.userId === payload.userId);
    const nowTs = now();

    if (already) {
      already.nickname = payload.nickname;
      already.lastSeen = nowTs;
    } else {
      if (lobby.players.length >= lobby.maxPlayers) {
        throw new Error("Ce salon est complet.");
      }
      lobby.players.push({
        userId: payload.userId,
        nickname: payload.nickname,
        isHost: false,
        joinedAt: nowTs,
        lastSeen: nowTs,
      });
    }

    lobby.updatedAt = nowTs;
    mockSaveLobbies(list);
    return lobby;
  }

  const session = mockLoadAuth();
  if (!session?.token) {
    throw new Error("Non authentifié");
  }

  const lobby = await http<OnlineLobby>("/lobbies/join", {
    method: "POST",
    token: session.token,
    body: JSON.stringify(payload),
  });

  return lobby;
}

async function leaveLobby(
  lobbyId: string,
  userId: string
): Promise<OnlineLobby | null> {
  if (USE_MOCK) {
    const list = mockLoadLobbies();
    const lobby = list.find((l) => l.id === lobbyId);
    if (!lobby) return null;

    const beforeCount = lobby.players.length;
    lobby.players = lobby.players.filter((p) => p.userId !== userId);

    // Si plus personne -> on marque terminé
    if (lobby.players.length === 0) {
      lobby.status = "finished";
    } else {
      // Si l'host est parti, on passe l'host au prochain joueur
      if (!lobby.players.some((p) => p.isHost)) {
        lobby.players[0].isHost = true;
      }
    }

    if (beforeCount !== lobby.players.length) {
      lobby.updatedAt = now();
      mockSaveLobbies(list);
    }

    return lobby;
  }

  const session = mockLoadAuth();
  if (!session?.token) {
    throw new Error("Non authentifié");
  }

  const lobby = await http<OnlineLobby | null>("/lobbies/leave", {
    method: "POST",
    token: session.token,
    body: JSON.stringify({ lobbyId, userId }),
  });

  return lobby;
}

async function updateLobbyState(
  lobbyId: string,
  patch: Partial<Pick<OnlineLobby, "status" | "settings">>
): Promise<OnlineLobby> {
  if (USE_MOCK) {
    const list = mockLoadLobbies();
    const lobby = list.find((l) => l.id === lobbyId);
    if (!lobby) {
      throw new Error("Salon introuvable (mock).");
    }

    if (patch.status) {
      lobby.status = patch.status;
    }
    if (patch.settings) {
      lobby.settings = {
        ...(lobby.settings || {}),
        ...patch.settings,
      };
    }
    lobby.updatedAt = now();
    mockSaveLobbies(list);
    return lobby;
  }

  const session = mockLoadAuth();
  if (!session?.token) {
    throw new Error("Non authentifié");
  }

  const lobby = await http<OnlineLobby>("/lobbies/update", {
    method: "POST",
    token: session.token,
    body: JSON.stringify({ lobbyId, patch }),
  });

  return lobby;
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
  // Salons
  createLobby,
  listLobbies,
  joinLobby,
  leaveLobby,
  updateLobbyState,
  // Info
  USE_MOCK,
};
