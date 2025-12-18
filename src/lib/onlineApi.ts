// ============================================================
// src/lib/onlineApi.ts
// API Mode Online
// - Auth / Profil / Matchs → Supabase
// - Salons X01 (lobbies) → Supabase ("online_lobbies")
// - Surface d'API unique pour le front
// ============================================================

import { supabase } from "./supabase";
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
  password?: string; // requis pour Supabase
};

export type LoginPayload = {
  email?: string;
  nickname?: string;
  password?: string; // requis pour Supabase
};

// PATCH profil : on ajoute ici TOUTES les infos perso
export type UpdateProfilePayload = {
  displayName?: string;
  avatarUrl?: string;
  country?: string;
  surname?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string; // "YYYY-MM-DD"
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
// Types Lobbies (Supabase "online_lobbies")
// --------------------------------------------

export type OnlineLobbySettings = {
  start: number;
  doubleOut: boolean;
  [k: string]: any;
};

export type OnlineLobby = {
  id: string;
  code: string; // "4F9Q"
  mode: string; // "x01"
  maxPlayers: number;
  hostUserId: string;
  hostNickname: string;
  settings: OnlineLobbySettings;
  status: string; // "waiting" | "running" | ...
  createdAt: string;
};

// --------------------------------------------
// Config / helpers locaux
// --------------------------------------------

const USE_MOCK = false;
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

// Schéma actuel Supabase :
// profiles_online (id, display_name, country, avatar_url, ... + colonnes perso)
type SupabaseProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;
  // nouvelles colonnes infos perso (si présentes dans la table)
  surname?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  // on tolère bio / stats au cas où tu les ajoutes plus tard
  bio?: string | null;
  stats?: any | null;
};

function mapProfile(row: SupabaseProfileRow): OnlineProfile {
  return {
    id: row.id,
    // Dans notre app, OnlineProfile.userId = id Supabase (auth user)
    userId: row.id,
    displayName: row.display_name ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    country: row.country ?? undefined,
    // infos perso (on les met en camelCase dans OnlineProfile)
    surname: row.surname ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    birthDate: row.birth_date ?? null,
    city: row.city ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    // Champs compat
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

// Table d’historique actuelle : "matches_online"
// (id, user_id, mode, payload, created_at)
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

// Lobbies : table "online_lobbies"
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
    settings:
      (row.settings as OnlineLobbySettings) || { start: 501, doubleOut: true },
    status: row.status || "waiting",
    createdAt: row.created_at || new Date().toISOString(),
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
    createdAt: user.created_at ? Date.parse(user.created_at) : now(),
  };

  // On lit / crée le profil en utilisant id = user.id (FK vers auth.users)
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles_online")
    .select("*")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();

  let profile: OnlineProfile | null = null;

  if (profileError) {
    console.warn("[onlineApi] profiles_online select error", profileError);
  } else if (profileRow) {
    profile = mapProfile(profileRow as unknown as SupabaseProfileRow);
  } else {
    // Pas encore de profil -> on en crée un minimal avec id = user.id
    const { data: created, error: createError } = await supabase
      .from("profiles_online")
      .insert({
        id: user.id,
        display_name: userAuth.nickname,
        country: null,
        avatar_url: null,
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
  // Source de vérité : Supabase (toujours)
  const live = await buildAuthSessionFromSupabase();

  // Si Supabase dit "pas de session", on purge le cache local
  if (!live?.user || !live.token) {
    saveAuthToLS(null);
    return null;
  }

  return live;
}

async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("[onlineApi] logout error", error);
  }
  saveAuthToLS(null);
}

// --------------------------------------------
// Fonctions publiques : GESTION COMPTE
// --------------------------------------------

// Demander un mail de réinitialisation de mot de passe
async function requestPasswordReset(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error("Adresse mail requise pour réinitialiser le mot de passe.");
  }
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
  if (error) {
    console.error("[onlineApi] requestPasswordReset error", error);
    throw new Error(error.message);
  }
}

// Mettre à jour l'email du compte courant
async function updateEmail(newEmail: string): Promise<void> {
  const trimmed = newEmail.trim();
  if (!trimmed) {
    throw new Error("Nouvelle adresse mail invalide.");
  }
  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) {
    console.error("[onlineApi] updateEmail error", error);
    throw new Error(error.message);
  }
}

// Récupérer la session courante (helper pratique)
async function getCurrentSession(): Promise<AuthSession | null> {
  return await restoreSession();
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

  // construction du patch DB → colonnes snake_case
  const dbPatch: any = {
    updated_at: new Date().toISOString(),
  };

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
    .eq("id", userId)
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

  const { data, error } = await supabase
    .from("matches_online") // 🔄 nom réel de la table
    .insert({
      user_id: userId,
      mode: payload.mode,
      payload: payload.payload,
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
  const { data, error } = await supabase
    .from("matches_online") // 🔄 nom réel de la table
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[onlineApi] listMatches error", error);
    throw new Error(error.message);
  }

  return (data as SupabaseMatchRow[]).map(mapMatch);
}

// ============================================================
// 2) Salons X01 ONLINE (Supabase "online_lobbies")
// ============================================================

function generateLobbyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// Création d’un salon X01
async function createLobby(args: {
  mode: string; // "x01"
  maxPlayers: number;
  settings: OnlineLobbySettings;
}): Promise<OnlineLobby> {
  const { mode, maxPlayers, settings } = args;

  const { data: sessData, error: sessError } =
    await supabase.auth.getSession();
  if (sessError || !sessData?.session?.user) {
    console.error("[onlineApi] createLobby no session", sessError);
    throw new Error("Session online introuvable (reconnecte-toi).");
  }

  const user = sessData.session.user;
  const meta = (user.user_metadata || {}) as any;
  const nickname =
    meta.nickname || meta.displayName || user.email || "Hôte";

  let lastError: any = null;

  // On tente plusieurs codes en cas de collision (clé unique sur code)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateLobbyCode();

    const { data, error } = await supabase
      .from("online_lobbies")
      .insert({
        code,
        mode,
        max_players: maxPlayers,
        host_user_id: user.id,
        host_nickname: nickname,
        settings,
        status: "waiting",
      })
      .select("*")
      .single();

    if (!error && data) {
      return mapLobbyRow(data as SupabaseLobbyRow);
    }

    lastError = error;
    // 23505 = violation contrainte unique (code déjà pris)
    if (error && (error as any).code === "23505") continue;

    console.error("[onlineApi] createLobby error", error);
    break;
  }

  throw new Error(
    lastError?.message || "Impossible de créer un salon online pour le moment."
  );
}

// Rejoindre un salon par code
async function joinLobby(args: {
  code: string;
  userId: string;
  nickname: string;
}): Promise<OnlineLobby> {
  const codeUpper = args.code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("online_lobbies")
    .select("*")
    .eq("code", codeUpper)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[onlineApi] joinLobby error", error);
    throw new Error(
      error.message || "Impossible de rejoindre ce salon pour le moment."
    );
  }

  if (!data) {
    throw new Error("Aucun salon trouvé avec ce code.");
  }

  // (optionnel plus tard : insérer l’invité dans une table lobby_players)
  return mapLobbyRow(data as SupabaseLobbyRow);
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

  // Gestion compte
  requestPasswordReset,
  updateEmail,
  getCurrentSession,

  // Profil (toutes infos perso + avatar)
  updateProfile,

  // Matchs (stats / historique online)
  uploadMatch,
  listMatches,

  // Salons Supabase
  createLobby,
  joinLobby,

  // Info
  USE_MOCK,
};
