// ============================================================
// src/lib/onlineApi.ts
// API Mode Online
// - Auth / Profil / Matchs → Supabase
// - Salons X01 (lobbies) → Supabase ("online_lobbies")
// - Surface d'API unique pour le front
// ============================================================

// ✅ IMPORTANT : un seul client Supabase partout
import { supabase } from "./supabaseClient";
import type { UserAuth, OnlineProfile, OnlineMatch } from "./onlineTypes";

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
  password?: string;
};

export type LoginPayload = {
  email?: string;
  nickname?: string;
  password?: string;
};

export type UpdateProfilePayload = {
  displayName?: string;
  avatarUrl?: string;
  country?: string;
  surname?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  city?: string;
  email?: string;
  phone?: string;
};

export type UploadMatchPayload = Omit<
  OnlineMatch,
  "id" | "userId" | "startedAt" | "finishedAt" | "isTraining"
> & {
  startedAt?: number;
  finishedAt?: number;
  isTraining?: boolean;
};

// --------------------------------------------
// Types Lobbies
// --------------------------------------------

export type OnlineLobbySettings = {
  start: number;
  doubleOut: boolean;
  [k: string]: any;
};

export type OnlineLobby = {
  id: string;
  code: string;
  mode: string;
  maxPlayers: number;
  hostUserId: string;
  hostNickname: string;
  settings: OnlineLobbySettings;
  status: string;
  createdAt: string;
};

// --------------------------------------------
// Config / helpers locaux
// --------------------------------------------

const USE_MOCK = false;
const LS_AUTH_KEY = "dc_online_auth_supabase_v1";

const now = () => Date.now();

// ============================================================
// 🖼️ Helpers image (UNIQUE – pas de doublon)
// ============================================================

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = String(dataUrl || "").split(",");
  if (parts.length < 2) {
    throw new Error("dataUrl invalide (pas de base64).");
  }

  const meta = parts[0] || "";
  const b64 = parts[1] || "";
  const mime =
    (meta.match(/data:(.*?);base64/i) || [])[1] || "image/png";

  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);

  return new Blob([arr], { type: mime });
}

function extFromMime(mime: string) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("webp")) return "webp";
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  return "png";
}

// ============================================================
// Storage Auth local (cache seulement)
// ============================================================

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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
// 1) SUPABASE – Mapping DB → App
// ============================================================

type SupabaseProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  surname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  stats?: any | null;
  updated_at: string | null;
};

function mapProfile(row: SupabaseProfileRow): OnlineProfile {
  return {
    id: row.id,
    userId: row.id,
    displayName: row.display_name ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    country: row.country ?? undefined,
    surname: row.surname ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    birthDate: row.birth_date ?? null,
    city: row.city ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    bio: row.bio ?? "",
    stats:
      row.stats ?? {
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
  created_at: string | null;
};

function mapMatch(row: SupabaseMatchRow): OnlineMatch {
  const t = row.created_at ? Date.parse(row.created_at) : now();
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    payload: row.payload,
    isTraining: false,
    startedAt: t,
    finishedAt: t,
  };
}

type SupabaseLobbyRow = {
  id: string;
  code: string;
  mode: string;
  max_players: number;
  host_user_id: string;
  host_nickname: string;
  settings: any;
  status: string;
  created_at: string;
};

function mapLobbyRow(row: SupabaseLobbyRow): OnlineLobby {
  return {
    id: String(row.id),
    code: String(row.code).toUpperCase(),
    mode: row.mode || "x01",
    maxPlayers: Number(row.max_players ?? 2),
    hostUserId: String(row.host_user_id),
    hostNickname: row.host_nickname || "Hôte",
    settings: row.settings || { start: 501, doubleOut: true },
    status: row.status || "waiting",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// ============================================================
// AUTH
// ============================================================

async function buildAuthSessionFromSupabase(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;

  const u = data.session.user;

  const userAuth: UserAuth = {
    id: u.id,
    email: u.email ?? undefined,
    nickname: (u.user_metadata as any)?.nickname || u.email || "Player",
    createdAt: u.created_at ? Date.parse(u.created_at) : now(),
  };

  const { data: profileRow } = await supabase
    .from("profiles_online")
    .select("*")
    .eq("id", u.id)
    .maybeSingle();

  const session: AuthSession = {
    token: data.session.access_token,
    user: userAuth,
    profile: profileRow ? mapProfile(profileRow) : null,
  };

  saveAuthToLS(session);
  return session;
}

async function signup(payload: SignupPayload): Promise<AuthSession> {
  const { error } = await supabase.auth.signUp({
    email: payload.email!,
    password: payload.password!,
    options: { data: { nickname: payload.nickname } },
  });
  if (error) throw new Error(error.message);
  const s = await buildAuthSessionFromSupabase();
  if (!s) throw new Error("Session introuvable après signup");
  return s;
}

async function login(payload: LoginPayload): Promise<AuthSession> {
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email!,
    password: payload.password!,
  });
  if (error) throw new Error(error.message);
  const s = await buildAuthSessionFromSupabase();
  if (!s) throw new Error("Session introuvable après login");
  return s;
}

async function restoreSession() {
  return buildAuthSessionFromSupabase();
}

async function logout() {
  await supabase.auth.signOut();
  saveAuthToLS(null);
}

// ============================================================
// PROFIL & AVATAR (SOURCE UNIQUE)
// ============================================================

async function updateProfile(
  patch: UpdateProfilePayload
): Promise<OnlineProfile> {
  const session = await restoreSession();
  if (!session?.user) throw new Error("Non authentifié");

  const dbPatch: any = { updated_at: new Date().toISOString() };
  if (patch.displayName !== undefined) dbPatch.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
  if (patch.country !== undefined) dbPatch.country = patch.country;
  if (patch.surname !== undefined) dbPatch.surname = patch.surname;
  if (patch.firstName !== undefined) dbPatch.first_name = patch.firstName;
  if (patch.lastName !== undefined) dbPatch.last_name = patch.lastName;
  if (patch.birthDate !== undefined) dbPatch.birth_date = patch.birthDate;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.email !== undefined) dbPatch.email = patch.email;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;

  const { data, error } = await supabase
    .from("profiles_online")
    .update(dbPatch)
    .eq("id", session.user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const profile = mapProfile(data);
  saveAuthToLS({ ...session, profile });
  return profile;
}

async function uploadAvatarImage(args: {
  dataUrl: string;
}): Promise<{ publicUrl: string; path: string }> {
  const session = await restoreSession();
  if (!session?.user) throw new Error("Non authentifié");

  const blob = dataUrlToBlob(args.dataUrl);
  const ext = extFromMime(blob.type);
  const path = `${session.user.id}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("URL avatar introuvable");

  await updateProfile({ avatarUrl: data.publicUrl });
  return { publicUrl: data.publicUrl, path };
}

// ============================================================
// MATCHS ONLINE
// ============================================================

async function uploadMatch(
  payload: UploadMatchPayload
): Promise<OnlineMatch> {
  const session = await restoreSession();
  if (!session?.user) throw new Error("Non authentifié");

  const { data, error } = await supabase
    .from("matches_online")
    .insert({
      user_id: session.user.id,
      mode: payload.mode,
      payload: payload.payload,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapMatch(data);
}

async function listMatches(limit = 50): Promise<OnlineMatch[]> {
  const { data, error } = await supabase
    .from("matches_online")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map(mapMatch);
}

// ============================================================
// SNAPSHOT CLOUD (SOURCE UNIQUE DES DONNÉES)
// ============================================================

type StoreSnapshotRow = {
  user_id: string;
  payload: any;
  updated_at: string | null;
};

async function pullStoreSnapshot(): Promise<{
  payload: any;
  updatedAt: number;
} | null> {
  const session = await restoreSession();
  if (!session?.user) return null;

  const { data } = await supabase
    .from("dc_store_snapshots")
    .select("payload, updated_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!data?.payload) return null;
  return {
    payload: data.payload,
    updatedAt: data.updated_at ? Date.parse(data.updated_at) : now(),
  };
}

async function pushStoreSnapshot(payload: any): Promise<void> {
  const session = await restoreSession();
  if (!session?.user) throw new Error("Non authentifié");

  const row: StoreSnapshotRow = {
    user_id: session.user.id,
    payload,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("dc_store_snapshots")
    .upsert(row, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
}

// ============================================================
// LOBBIES ONLINE
// ============================================================

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
}

async function createLobby(args: {
  mode: string;
  maxPlayers: number;
  settings: OnlineLobbySettings;
}): Promise<OnlineLobby> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Non authentifié");

  const user = data.session.user;
  const nickname =
    (user.user_metadata as any)?.nickname || user.email || "Hôte";

  for (let i = 0; i < 5; i++) {
    const code = generateLobbyCode();
    const { data: row, error } = await supabase
      .from("online_lobbies")
      .insert({
        code,
        mode: args.mode,
        max_players: args.maxPlayers,
        host_user_id: user.id,
        host_nickname: nickname,
        settings: args.settings,
        status: "waiting",
      })
      .select()
      .single();

    if (!error && row) return mapLobbyRow(row);
  }

  throw new Error("Impossible de créer le salon");
}

async function joinLobby(args: {
  code: string;
  userId: string;
  nickname: string;
}): Promise<OnlineLobby> {
  const { data, error } = await supabase
    .from("online_lobbies")
    .select("*")
    .eq("code", args.code.toUpperCase())
    .limit(1)
    .maybeSingle();

  if (error || !data) throw new Error("Salon introuvable");
  return mapLobbyRow(data);
}

// ============================================================
// EXPORT API UNIQUE
// ============================================================

export const onlineApi = {
  // Auth
  signup,
  login,
  restoreSession,
  logout,

  // Gestion compte
  updateProfile,
  uploadAvatarImage,

  // Matchs
  uploadMatch,
  listMatches,

  // Snapshot cloud
  pullStoreSnapshot,
  pushStoreSnapshot,

  // Salons
  createLobby,
  joinLobby,

  USE_MOCK,
};
