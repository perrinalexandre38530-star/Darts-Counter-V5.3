// ============================================
// src/lib/onlineApi.ts
// API Mode Online (auth / profil / matchs / salons)
// - Implémentation directe Supabase (auth + tables)
// - Garde la même surface d'API que la version mock
// ============================================

import { supabase } from "./supabase";
import type {
  UserAuth,
  OnlineProfile,
  OnlineMatch,
} from "./onlineTypes";

// --------------------------------------------
// Types publics de l'API (inchangés)
// --------------------------------------------

export type AuthSession = {
  token: string;
  user: UserAuth;
  profile: OnlineProfile | null;
};

export type SignupPayload = {
  email?: string;
  nickname: string;
  password?: string; // requis pour Supabase
};

export type LoginPayload = {
  email?: string;
  nickname?: string;
  password?: string; // requis pour Supabase
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
// Config / helpers locaux
// --------------------------------------------

// On n'est plus en mode mock : tout passe par Supabase
const USE_MOCK = false;

// Clé localStorage pour garder la dernière session sérialisée
const LS_AUTH_KEY = "dc_online_auth_supabase_v1";

function now() {
  return Date.now();
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadAuthFromLS(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LS_AUTH_KEY);
  return safeParse<AuthSession | null>(raw, null);
}

function saveAuthToLS(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(LS_AUTH_KEY);
  } else {
    window.localStorage.setItem(LS_AUTH_KEY, JSON.stringify(session));
  }
}

// --------------------------------------------
// Mapping Supabase -> types de l'app
// --------------------------------------------

type SupabaseProfileRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  stats: any | null;
  updated_at: string | null;
};

function mapProfile(row: SupabaseProfileRow): OnlineProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    country: row.country ?? undefined,
    bio: row.bio ?? "",
    stats: row.stats ?? {
      totalMatches: 0,
      totalLegs: 0,
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
    },
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : now(),
  };
}

type SupabaseMatchRow = {
  id: string;
  user_id: string;
  mode: string;
  payload: any;
  is_training: boolean | null;
  started_at: string | null;
  finished_at: string | null;
};

function mapMatch(row: SupabaseMatchRow): OnlineMatch {
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    payload: row.payload,
    isTraining: row.is_training ?? false,
    startedAt: row.started_at ? Date.parse(row.started_at) : now(),
    finishedAt: row.finished_at ? Date.parse(row.finished_at) : now(),
  };
}

type SupabaseLobbyRow = {
  id: string;
  code: string;
  mode: string;
  status: string;
  created_by_user_id: string;
  created_at: string | null;
  updated_at: string | null;
  max_players: number | null;
  players: LobbyPlayer[] | null;
  settings: Record<string, any> | null;
};

function mapLobby(row: SupabaseLobbyRow): OnlineLobby {
  return {
    id: row.id,
    code: row.code,
    mode: row.mode,
    status: (row.status as LobbyStatus) || "waiting",
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at ? Date.parse(row.created_at) : now(),
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : now(),
    maxPlayers: row.max_players ?? 4,
    players: row.players ?? [],
    settings: row.settings ?? {},
  };
}

// --------------------------------------------
// Helpers AUTH Supabase
// --------------------------------------------

async function buildAuthSessionFromSupabase(): Promise<AuthSession | null> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    console.warn("[onlineApi] getSession error", sessionError);
    return null;
  }

  const session = sessionData.session;
  const user = session?.user;
  if (!user) return null;

  const userAuth: UserAuth = {
    id: user.id,
    email: user.email ?? undefined,
    nickname:
      (user.user_metadata as any)?.nickname ||
      user.email ||
      "Player",
    createdAt: user.created_at
      ? Date.parse(user.created_at)
      : now(),
  };

  // Récupère (ou crée) le profil en ligne
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles_online")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  let profile: OnlineProfile | null = null;

  if (profileError) {
    console.warn("[onlineApi] profiles_online select error", profileError);
  } else if (profileRow) {
    profile = mapProfile(profileRow as unknown as SupabaseProfileRow);
  } else {
    // Pas encore de profil -> on en crée un minimal
    const { data: created, error: createError } = await supabase
      .from("profiles_online")
      .insert({
        user_id: user.id,
        display_name: userAuth.nickname,
      })
      .select()
      .single();

    if (createError) {
      console.warn("[onlineApi] profiles_online insert error", createError);
    } else {
      profile = mapProfile(created as unknown as SupabaseProfileRow);
    }
  }

  const authSession: AuthSession = {
    token: session?.access_token ?? "",
    user: userAuth,
    profile,
  };

  saveAuthToLS(authSession);
  return authSession;
}

// --------------------------------------------
// Fonctions publiques : AUTH
// --------------------------------------------

async function signup(payload: SignupPayload): Promise<AuthSession> {
  const email = payload.email?.trim();
  const password = payload.password?.trim();

  if (!email || !password) {
    throw new Error(
      "Pour créer un compte online, email et mot de passe sont requis."
    );
  }

  const nickname = payload.nickname?.trim() || email;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  });

  if (error) {
    console.error("[onlineApi] signup error", error);
    throw new Error(error.message);
  }

  // data.user peut être nul si email de confirmation requis,
  // mais on va de toute façon reconstruire la session via getSession()
  const session = await buildAuthSessionFromSupabase();
  if (!session) {
    throw new Error(
      "Compte créé, mais impossible de récupérer la session. Vérifie tes mails si la confirmation est requise."
    );
  }

  return session;
}

async function login(payload: LoginPayload): Promise<AuthSession> {
  const email = payload.email?.trim();
  const password = payload.password?.trim();

  if (!email || !password) {
    throw new Error("Email et mot de passe sont requis pour se connecter.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[onlineApi] login error", error);
    throw new Error(error.message);
  }

  const session = await buildAuthSessionFromSupabase();
  if (!session) {
    throw new Error("Impossible de récupérer la session après la connexion.");
  }

  return session;
}

async function restoreSession(): Promise<AuthSession | null> {
  // Tentative rapide depuis localStorage (pour éviter les flashes)
  const fromLS = loadAuthFromLS();
  if (fromLS?.user && fromLS.token) {
    return fromLS;
  }

  // Source de vérité : Supabase
  return await buildAuthSessionFromSupabase();
}

async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("[onlineApi] logout error", error);
  }
  saveAuthToLS(null);
}

// --------------------------------------------
// Fonctions publiques : PROFIL
// --------------------------------------------

async function updateProfile(
  patch: UpdateProfilePayload
): Promise<OnlineProfile> {
  const session = await restoreSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("profiles_online")
    .update({
      display_name: patch.displayName,
      avatar_url: patch.avatarUrl,
      country: patch.country,
      bio: patch.bio,
      stats: patch.stats,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[onlineApi] updateProfile error", error);
    throw new Error(error.message);
  }

  const profile = mapProfile(data as unknown as SupabaseProfileRow);

  const newSession: AuthSession = {
    ...session,
    profile,
  };
  saveAuthToLS(newSession);

  return profile;
}

// --------------------------------------------
// Fonctions publiques : MATCHS ONLINE
// --------------------------------------------

async function uploadMatch(
  payload: UploadMatchPayload
): Promise<OnlineMatch> {
  const session = await restoreSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const userId = session.user.id;
  const started = payload.startedAt ?? now();
  const finished = payload.finishedAt ?? now();

  const { data, error } = await supabase
    .from("live_match_sessions")
    .insert({
      user_id: userId,
      mode: payload.mode,
      payload: payload.payload,
      is_training: (payload as any).isTraining ?? false,
      started_at: new Date(started).toISOString(),
      finished_at: new Date(finished).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[onlineApi] uploadMatch error", error);
    throw new Error(error.message);
  }

  return mapMatch(data as unknown as SupabaseMatchRow);
}

async function listMatches(limit = 50): Promise<OnlineMatch[]> {
  const session = await restoreSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("live_match_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("finished_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[onlineApi] listMatches error", error);
    throw new Error(error.message);
  }

  return (data as SupabaseMatchRow[]).map(mapMatch);
}

// --------------------------------------------
// Fonctions publiques : SALONS (LOBBIES)
// --------------------------------------------

function generateCode(length = 4): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // pas de 0/O/1/I
  let res = "";
  for (let i = 0; i < length; i++) {
    res += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return res;
}

async function createLobby(
  payload: CreateLobbyPayload
): Promise<OnlineLobby> {
  const session = await restoreSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const user = session.user;
  const nowIso = new Date().toISOString();

  // Code salon optionnel
  const code = (payload.code || generateCode()).toUpperCase();

  const players: LobbyPlayer[] = [
    {
      userId: user.id,
      nickname: user.nickname,
      isHost: true,
      joinedAt: now(),
      lastSeen: now(),
    },
  ];

  const { data, error } = await supabase
    .from("lobbies_online")
    .insert({
      code,
      mode: payload.mode,
      status: "waiting",
      created_by_user_id: user.id,
      created_at: nowIso,
      updated_at: nowIso,
      max_players: payload.maxPlayers ?? 4,
      players,
      settings: payload.settings ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("[onlineApi] createLobby error", error);
    throw new Error(error.message);
  }

  return mapLobby(data as unknown as SupabaseLobbyRow);
}

async function listLobbies(): Promise<OnlineLobby[]> {
  const { data, error } = await supabase
    .from("lobbies_online")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[onlineApi] listLobbies error", error);
    throw new Error(error.message);
  }

  return (data as SupabaseLobbyRow[]).map(mapLobby);
}

async function joinLobby(
  payload: JoinLobbyPayload
): Promise<OnlineLobby> {
  const session = await restoreSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const code = payload.code.trim().toUpperCase();
  const nowTs = now();
  const nowIso = new Date().toISOString();

  // On récupère le lobby par code
  const { data, error } = await supabase
    .from("lobbies_online")
    .select("*")
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[onlineApi] joinLobby select error", error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Salon introuvable (code incorrect).");
  }

  const row = data as SupabaseLobbyRow;
  const lobby = mapLobby(row);

  if (lobby.status !== "waiting") {
    throw new Error("Ce salon n'est plus disponible.");
  }

  const players = [...(lobby.players || [])];
  const existing = players.find((p) => p.userId === payload.userId);

  if (existing) {
    existing.nickname = payload.nickname;
    existing.lastSeen = nowTs;
  } else {
    if (players.length >= lobby.maxPlayers) {
      throw new Error("Ce salon est complet.");
    }
    players.push({
      userId: payload.userId,
      nickname: payload.nickname,
      isHost: false,
      joinedAt: nowTs,
      lastSeen: nowTs,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("lobbies_online")
    .update({
      players,
      updated_at: nowIso,
    })
    .eq("id", lobby.id)
    .select()
    .single();

  if (updateError) {
    console.error("[onlineApi] joinLobby update error", updateError);
    throw new Error(updateError.message);
  }

  return mapLobby(updated as unknown as SupabaseLobbyRow);
}

async function leaveLobby(
  lobbyId: string,
  userId: string
): Promise<OnlineLobby | null> {
  const { data, error } = await supabase
    .from("lobbies_online")
    .select("*")
    .eq("id", lobbyId)
    .maybeSingle();

  if (error) {
    console.error("[onlineApi] leaveLobby select error", error);
    throw new Error(error.message);
  }

  if (!data) return null;

  const row = data as SupabaseLobbyRow;
  const lobby = mapLobby(row);

  let players = [...(lobby.players || [])];
  const beforeCount = players.length;

  players = players.filter((p) => p.userId !== userId);

  if (players.length === 0) {
    // plus personne -> terminé
    const { data: updated, error: updateError } = await supabase
      .from("lobbies_online")
      .update({
        players: [],
        status: "finished",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobbyId)
      .select()
      .single();

    if (updateError) {
      console.error("[onlineApi] leaveLobby update error", updateError);
      throw new Error(updateError.message);
    }

    return mapLobby(updated as unknown as SupabaseLobbyRow);
  }

  // Si l'host est parti, on passe l'host au premier joueur restant
  if (!players.some((p) => p.isHost)) {
    players[0].isHost = true;
  }

  if (beforeCount !== players.length) {
    const { data: updated, error: updateError } = await supabase
      .from("lobbies_online")
      .update({
        players,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobbyId)
      .select()
      .single();

    if (updateError) {
      console.error("[onlineApi] leaveLobby update2 error", updateError);
      throw new Error(updateError.message);
    }

    return mapLobby(updated as unknown as SupabaseLobbyRow);
  }

  return lobby;
}

async function updateLobbyState(
  lobbyId: string,
  patch: Partial<Pick<OnlineLobby, "status" | "settings">>
): Promise<OnlineLobby> {
  const update: any = {
    updated_at: new Date().toISOString(),
  };

  if (patch.status) update.status = patch.status;
  if (patch.settings) update.settings = patch.settings;

  const { data, error } = await supabase
    .from("lobbies_online")
    .update(update)
    .eq("id", lobbyId)
    .select()
    .single();

  if (error) {
    console.error("[onlineApi] updateLobbyState error", error);
    throw new Error(error.message);
  }

  return mapLobby(data as unknown as SupabaseLobbyRow);
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
