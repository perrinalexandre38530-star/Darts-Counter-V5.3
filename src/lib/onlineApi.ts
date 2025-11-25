// ============================================================
// src/lib/onlineApi.ts
// API Mode Online
// - Auth / Profil / Matchs → Supabase
// - Lobbies temps réel X01 → Cloudflare Durable Objects (REST+WS)
// - Surface d'API unique pour le front
// ============================================================

import { supabase } from "./supabase";
import type {
  UserAuth,
  OnlineProfile,
  OnlineMatch,
} from "./onlineTypes";

// --------------------------------------------
// Types publics de l'API (auth / profils / matchs)
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

// --------------------------------------------
// Types Lobbies (Cloudflare DO)
// --------------------------------------------

// statut de salle en temps réel
export type LobbyStatus = "waiting" | "running" | "ended";

// joueur dans un lobby temps réel
export type LobbyPlayer = {
  id: string;              // id "online" (ou profil local si tu veux)
  name: string;
  avatar?: string | null;
  joinedAt: number;
};

// Lobby temps réel (géré par Durable Object RoomDO)
export type OnlineLobby = {
  code: string;            // code court type "AB7F"
  players: LobbyPlayer[];
  hostId: string | null;
  status: LobbyStatus;
  engineState?: any;       // snapshot du moteur X01 (optionnel)
};

// payloads REST côté front
export type CreateLobbyPayload = {
  // pour l'instant on peut laisser vide (RoomDO gère tout),
  // mais on garde le type si on veut ajouter des options plus tard
};

export type JoinLobbyPayload = {
  code: string;
  player: {
    id: string;
    name: string;
    avatar?: string | null;
  };
};

export type LeaveLobbyPayload = {
  code: string;
  playerId: string;
};

// --------------------------------------------
// Config / helpers locaux
// --------------------------------------------

// On n'est plus en mode mock : tout passe par Supabase + Worker DO
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

// ============================================================
// 1) PARTIE SUPABASE (Auth / Profils / Matchs)
// ============================================================

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

  const { error } = await supabase.auth.signUp({
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

// ============================================================
// 2) PARTIE CLOUDFLARE DURABLE OBJECTS (Lobbies temps réel)
// ============================================================

// ⚙️ BASE HTTP pour les appels REST → Worker
//    -> configure VITE_ONLINE_BASE_URL dans ton .env
const BASE_HTTP =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_ONLINE_BASE_URL) ||
  "https://darts-online.example.workers.dev"; // ⬅️ à remplacer

// ⚙️ BASE WS pour les WebSockets
function makeWsBase(httpBase: string): string {
  if (httpBase.startsWith("https://")) {
    return "wss://" + httpBase.slice("https://".length);
  }
  if (httpBase.startsWith("http://")) {
    return "ws://" + httpBase.slice("http://".length);
  }
  // fallback
  return httpBase.replace(/^http/, "ws");
}
const BASE_WS = makeWsBase(BASE_HTTP);

// Helpers JSON REST
async function post(path: string, body: any) {
  const res = await fetch(`${BASE_HTTP}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[onlineApi] POST error", path, res.status, txt);
    throw new Error(
      `Erreur serveur (${res.status}) sur ${path}${txt ? `: ${txt}` : ""}`
    );
  }

  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as any;
  }
  return null;
}

async function get(path: string) {
  const res = await fetch(`${BASE_HTTP}${path}`);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("[onlineApi] GET error", path, res.status, txt);
    throw new Error(
      `Erreur serveur (${res.status}) sur ${path}${txt ? `: ${txt}` : ""}`
    );
  }
  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) {
    return (await res.json()) as any;
  }
  return null;
}

// --------------------------------------------
// Fonctions publiques : LOBBIES temps réel
// (impl Cloudflare DO)
// --------------------------------------------

// 1) CREATE LOBBY
async function createLobbyRealtime(
  _payload?: CreateLobbyPayload
): Promise<{ code: string }> {
  // Pour l'instant on ne passe rien, la RoomDO gère tout
  return await post("/lobby/create", {});
}

// 2) JOIN LOBBY
async function joinLobbyRealtime(payload: JoinLobbyPayload): Promise<OnlineLobby> {
  const { code, player } = payload;
  return await post(`/lobby/${encodeURIComponent(code)}/join`, player);
}

// 3) LEAVE LOBBY
async function leaveLobbyRealtime(payload: LeaveLobbyPayload): Promise<void> {
  const { code, playerId } = payload;
  await post(`/lobby/${encodeURIComponent(code)}/leave`, { playerId });
}

// 4) START MATCH (l'host démarre la partie X01)
async function startMatchRealtime(code: string): Promise<OnlineLobby> {
  return await post(`/lobby/${encodeURIComponent(code)}/start`, {});
}

// 5) SEND COMMAND (throw / undo / next / snapshot, etc.)
async function sendCommandRealtime(code: string, cmd: any): Promise<void> {
  await post(`/lobby/${encodeURIComponent(code)}/command`, cmd);
}

// 6) GET STATE (charge l'état initial du lobby)
async function getLobbyStateRealtime(code: string): Promise<OnlineLobby> {
  return await get(`/lobby/${encodeURIComponent(code)}/state`);
}

// 7) WebSocket temps réel
function connectLobbyWS(
  code: string,
  onMessage: (msg: any) => void
): WebSocket {
  const url = `${BASE_WS}/lobby/${encodeURIComponent(code)}/ws`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[onlineApi] WS connected", code);
  };

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      onMessage(msg);
    } catch (err) {
      console.warn("[onlineApi] Bad WS message:", evt.data);
    }
  };

  ws.onclose = () => {
    console.log("[onlineApi] WS closed");
  };

  ws.onerror = (err) => {
    console.warn("[onlineApi] WS error", err);
  };

  return ws;
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

  // Matchs (stats / historique online)
  uploadMatch,
  listMatches,

  // Lobbies temps réel (Cloudflare DO)
  createLobbyRealtime,
  joinLobbyRealtime,
  leaveLobbyRealtime,
  startMatchRealtime,
  sendCommandRealtime,
  getLobbyStateRealtime,
  connectLobbyWS,

  // Info
  USE_MOCK,
};
