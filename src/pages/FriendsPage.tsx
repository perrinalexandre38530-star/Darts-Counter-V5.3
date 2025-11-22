// ============================================
// src/pages/FriendsPage.tsx
// Mode Online & Amis — v1 (mock + futur backend)
// - Compte online synchronisé avec le profil local actif
// - Connexion / création rapide (pseudo + email + mot de passe)
// - Statut en ligne (online / away / offline) unifié via store.selfStatus
// - Historique Online (mock) : Training + Matches
// - Présence locale lastSeen + ping toutes les 30s
// - Salons online mock : création + join par code
// - Affiche le DRAPEAU du pays du profil actif (privateInfo.country)
// - Bouton TEST SUPABASE pour vérifier la connexion à la base
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";
import type { OnlineMatch } from "../lib/onlineTypes";
import {
  createLobby,
  joinLobbyByCode,
  type OnlineLobby,
} from "../lib/onlineLobbiesMock";
import { supabase } from "../lib/supabase";

/* -------------------------------------------------
   Constantes localStorage
--------------------------------------------------*/
const LS_PRESENCE_KEY = "dc_online_presence_v1";
const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

type PresenceStatus = "online" | "away" | "offline";

type StoredPresence = {
  status: PresenceStatus;
  lastSeen: number;
};

function savePresenceToLS(status: PresenceStatus) {
  if (typeof window === "undefined") return;
  const payload: StoredPresence = {
    status,
    lastSeen: Date.now(),
  };
  try {
    window.localStorage.setItem(LS_PRESENCE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function loadPresenceFromLS(): StoredPresence | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_PRESENCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.lastSeen !== "number") return null;
    return {
      status:
        parsed.status === "online" ||
        parsed.status === "away" ||
        parsed.status === "offline"
          ? parsed.status
          : "offline",
      lastSeen: parsed.lastSeen,
    };
  } catch {
    return null;
  }
}

function formatLastSeenAgo(lastSeen: number | null): string | null {
  if (!lastSeen) return null;
  const diffMs = Date.now() - lastSeen;
  if (diffMs < 0) return null;

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 0) return "À l’instant";
  if (diffMin === 1) return "Il y a 1 min";
  if (diffMin < 60) return `Il y a ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return "Il y a 1 h";
  return `Il y a ${diffH} h`;
}

/* -------------------------------------------------
   Types & props
--------------------------------------------------*/

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
};

/* -------------------------------------------------
   Composant principal
--------------------------------------------------*/

export default function FriendsPage({ store, update }: Props) {
  const {
    status,
    loading,
    user,
    profile,
    signup,
    login,
    logout,
    updateProfile,
    isMock,
  } = useAuthOnline();

  const isSignedIn = status === "signed_in" && !!user;
  const isChecking = status === "checking";

  // Profil local actif (fallback nickname)
  const activeProfile =
    (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  /* -------- Formulaire auth -------- */

  const [nickname, setNickname] = React.useState(
    user?.nickname || activeProfile?.name || ""
  );
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  // Historique online (mock)
  const [matches, setMatches] = React.useState<OnlineMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = React.useState(false);

  // Salons (mock)
  const [creatingLobby, setCreatingLobby] = React.useState(false);
  const [lastCreatedLobby, setLastCreatedLobby] =
    React.useState<OnlineLobby | null>(null);
  const [showLobbyModal, setShowLobbyModal] = React.useState(false);

  const [joinCode, setJoinCode] = React.useState("");
  const [joiningLobby, setJoiningLobby] = React.useState(false);
  const [joinedLobby, setJoinedLobby] = React.useState<OnlineLobby | null>(
    null
  );
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joinInfo, setJoinInfo] = React.useState<string | null>(null);

  // Présence locale
  const initialPresence = React.useMemo(() => loadPresenceFromLS(), []);
  const [lastSeen, setLastSeen] = React.useState<number | null>(
    initialPresence?.lastSeen ?? null
  );

  // Sync nickname depuis la session
  React.useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user?.nickname]);

  /* -------------------------------------------------
      TEST SUPABASE
  --------------------------------------------------*/
  async function testSupabase() {
    console.log("[TEST] Supabase: démarrage…");
    try {
      const { data, error } = await supabase
        .from("profiles_online")
        .select("*")
        .limit(1);

      console.log("[TEST] Supabase result:", { data, error });

      alert(
        error
          ? "Erreur Supabase (voir console)"
          : "Connexion Supabase OK (voir console)"
      );
    } catch (e) {
      console.error("[TEST] Supabase: exception", e);
      alert("Exception lors de l’appel Supabase (voir console)");
    }
  }

  /* -------------------------------------------------
      Gestion présence locale (store.selfStatus + ping)
  --------------------------------------------------*/

  function setPresence(s: PresenceStatus) {
    update((st) => ({ ...st, selfStatus: s as any }));
    savePresenceToLS(s);
    setLastSeen(Date.now());
  }

  // Ping toutes les 30s quand online
  React.useEffect(() => {
    if (!isSignedIn || store.selfStatus !== "online") return;
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      savePresenceToLS("online");
      setLastSeen(Date.now());
    }, 30000);

    return () => window.clearInterval(id);
  }, [isSignedIn, store.selfStatus]);

  // Au boot : si lastSeen trop vieux, bascule en "away"
  React.useEffect(() => {
    if (!initialPresence) return;
    const diff = Date.now() - initialPresence.lastSeen;
    if (diff > 10 * 60000 && store.selfStatus === "online") {
      setPresence("away");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Libellés de statut unifiés
  const statusLabel =
    store.selfStatus === "away"
      ? "Absent"
      : store.selfStatus === "online"
      ? "En ligne"
      : "Hors ligne";

  const statusColor =
    store.selfStatus === "away"
      ? "#ffb347"
      : store.selfStatus === "online"
      ? "#7fe2a9"
      : "#cccccc";

  const displayName =
    profile?.displayName ||
    user?.nickname ||
    activeProfile?.name ||
    "Profil online";

  const lastSeenLabel = formatLastSeenAgo(lastSeen);

  // Drapeau pays du profil actif
  const privateInfo = ((activeProfile as any)?.privateInfo || {}) as any;
  const countryRaw = privateInfo.country || "";
  const countryFlag = getCountryFlag(countryRaw);

  /* -------------------------------------------------
      Historique Online (mock)
  --------------------------------------------------*/

  React.useEffect(() => {
    if (!isSignedIn) {
      setMatches([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoadingMatches(true);
      try {
        const list = await onlineApi.listMatches(50);
        if (!cancelled) setMatches(list || []);
      } catch (e) {
        console.warn("[online] listMatches failed", e);
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  function handleClearOnlineHistory() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(LS_ONLINE_MATCHES_KEY);
      } catch {
        // ignore
      }
    }
    setMatches([]);
  }

  function getMatchTitle(m: OnlineMatch): string {
    const isTraining =
      (m as any).isTraining === true ||
      (m.payload as any)?.kind === "training_x01";

    if (m.mode === "x01") {
      return isTraining ? "X01 Training" : "X01 (match)";
    }

    return m.mode || "Match";
  }

  function formatMatchDate(m: OnlineMatch): string {
    const ts = m.finishedAt || m.startedAt;
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* -------------------------------------------------
      Actions AUTH (signup / login / logout)
  --------------------------------------------------*/

  async function handleSignup() {
    const nick = nickname.trim();
    const mail = email.trim();
    const pass = password;

    if (!nick || !mail || !pass) {
      setError(
        "Pseudo requis (pour la création de compte online, email et mot de passe sont requis)."
      );
      setInfo(null);
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      await signup({ nickname: nick, email: mail, password: pass });

      // synchro profil online avec profil local actif
      if (activeProfile) {
        await updateProfile({
          displayName: activeProfile.name,
          avatarUrl: activeProfile.avatarDataUrl ?? undefined,
        }).catch(() => {});
      }

      setPresence("online");
      setInfo("Compte online créé et connecté.");
    } catch (e: any) {
      console.warn(e);
      setError(
        e?.message || "Impossible de créer le compte en ligne pour le moment."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    const nick = nickname.trim();
    const mail = email.trim();
    const pass = password;

    if (!mail || !pass) {
      setError(
        "Pour te connecter, renseigne l’email et le mot de passe du compte."
      );
      setInfo(null);
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      await login({ email: mail, password: pass, nickname: nick || undefined });
      setPresence("online");
      setInfo("Connexion réussie.");
    } catch (e: any) {
      console.warn(e);
      setError(
        e?.message || "Impossible de te connecter en ligne pour le moment."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await logout();
    } catch {
      // ignore
    }
    setPresence("offline");
    setInfo("Déconnecté du mode online.");
    setBusy(false);
  }

  /* -------------------------------------------------
      Salons X01 (mock)
  --------------------------------------------------*/

  async function handleCreateLobby() {
    if (!isSignedIn) {
      setError("Tu dois être connecté en mode online pour créer un salon.");
      setInfo(null);
      return;
    }
    if (creatingLobby) return;

    setCreatingLobby(true);
    setError(null);
    setInfo(null);

    try {
      const lobby = await createLobby({
        hostProfileId: activeProfile?.id ?? null,
        hostName:
          activeProfile?.name ||
          profile?.displayName ||
          user?.nickname ||
          "Joueur",
      });

      setLastCreatedLobby(lobby);
      setShowLobbyModal(true);
      console.log("[online] lobby créé", lobby);
    } catch (e: any) {
      console.warn(e);
      setError(e?.message || "Impossible de créer un salon pour le moment.");
    } finally {
      setCreatingLobby(false);
    }
  }

  async function handleJoinLobby() {
    const code = joinCode.trim().toUpperCase();

    setJoinError(null);
    setJoinInfo(null);
    setJoinedLobby(null);

    if (!code) {
      setJoinError("Entre un code de salon.");
      return;
    }
    if (!isSignedIn) {
      setJoinError(
        "Tu dois être connecté en mode online pour rejoindre un salon."
      );
      return;
    }

    setJoiningLobby(true);

    try {
      const lobby = await joinLobbyByCode(code);
      if (!lobby) {
        setJoinError("Aucun salon trouvé avec ce code.");
        return;
      }
      setJoinedLobby(lobby);
      setJoinInfo("Salon trouvé (mock). La vraie connexion viendra plus tard.");
      console.log("[online] join lobby ok", lobby);
    } catch (e: any) {
      console.warn(e);
      setJoinError(
        e?.message || "Impossible de rejoindre ce salon pour le moment."
      );
    } finally {
      setJoiningLobby(false);
    }
  }

  /* -------------------------------------------------
      RENDER
  --------------------------------------------------*/

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
      }}
    >
      {/* ✅ Bouton de test Supabase */}
      <button
        onClick={testSupabase}
        style={{
          marginBottom: 12,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "#222",
          color: "#fff",
          fontSize: 12,
        }}
      >
        TEST SUPABASE
      </button>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        Mode Online & Amis
      </h2>

      <p
        style={{
          fontSize: 13,
          opacity: 0.8,
          marginBottom: 12,
        }}
      >
        Crée ton compte online pour synchroniser ton profil entre appareils et
        préparer les parties en ligne avec tes amis.
      </p>

      {/* --------- BLOC INFO MODE DEMO --------- */}
      <div
        style={{
          fontSize: 11.5,
          marginBottom: 12,
          padding: 8,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(40,40,48,.88), rgba(18,18,22,.96))",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Mode démo</div>

        <div style={{ opacity: 0.9 }}>
          Pour l’instant, les données online sont stockées uniquement sur cet
          appareil. Plus tard, un vrai serveur permettra de partager ton profil.
        </div>

        <div style={{ marginTop: 4, color: "#ffcf57" }}>
          {isSignedIn ? "Connecté en mode démo." : "Non connecté."}{" "}
          {isMock && "(mock local)"}
        </div>

        {lastSeenLabel && (
          <div
            style={{
              marginTop: 2,
              opacity: 0.8,
              fontSize: 11,
            }}
          >
            Dernière activité : {lastSeenLabel}
          </div>
        )}
      </div>

      {/* --------- AUTH --------- */}
      {!isSignedIn ? (
        <div
          style={{
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            background:
              "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.08), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.96), rgba(10,10,12,.98))",
            border: "1px solid rgba(255,255,255,.12)",
            boxShadow: "0 14px 30px rgba(0,0,0,.55)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Connexion / création rapide
          </div>

          {activeProfile && (
            <div
              style={{
                fontSize: 11.5,
                opacity: 0.85,
                marginBottom: 6,
              }}
            >
              Profil local actif : <b>{activeProfile.name}</b> — utilisé comme
              pseudo par défaut.
            </div>
          )}

          {/* Pseudo */}
          <label
            style={{
              fontSize: 11.5,
              opacity: 0.9,
              display: "block",
              marginBottom: 4,
            }}
          >
            Pseudo online
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={busy || loading || isChecking}
            placeholder="Ex : CHEVROUTE, NINZALEX…"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(8,8,10,.95)",
              color: "#f5f5f7",
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 8,
            }}
          />

          {/* Email */}
          <label
            style={{
              fontSize: 11.5,
              opacity: 0.9,
              display: "block",
              marginBottom: 4,
            }}
          >
            Email (serveur réel)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy || loading || isChecking}
            placeholder="perrin.alexandre@exemple.com"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(8,8,10,.95)",
              color: "#f5f5f7",
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 8,
            }}
          />

          {/* Mot de passe */}
          <label
            style={{
              fontSize: 11.5,
              opacity: 0.9,
              display: "block",
              marginBottom: 4,
            }}
          >
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy || loading || isChecking}
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(8,8,10,.95)",
              color: "#f5f5f7",
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 10,
            }}
          />

          {/* Messages d'erreur / info */}
          {error && (
            <div
              style={{
                marginBottom: 8,
                fontSize: 11.5,
                color: "#ff8a8a",
              }}
            >
              {error}
            </div>
          )}

          {info && !error && (
            <div
              style={{
                marginBottom: 8,
                fontSize: 11.5,
                color: "#8fe6aa",
              }}
            >
              {info}
            </div>
          )}

          {/* Boutons */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <button
              type="button"
              onClick={handleSignup}
              disabled={busy || loading || isChecking}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: "8px 10px",
                border: "none",
                fontWeight: 800,
                fontSize: 13,
                cursor: busy || loading || isChecking ? "default" : "pointer",
                background: "linear-gradient(180deg,#35c86d,#23a958)",
                color: "#08130c",
                boxShadow: "0 8px 18px rgba(0,0,0,.55)",
                opacity: busy || loading || isChecking ? 0.5 : 1,
              }}
            >
              Créer un compte
            </button>

            <button
              type="button"
              onClick={handleLogin}
              disabled={busy || loading || isChecking}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: "8px 10px",
                border: "none",
                fontWeight: 800,
                fontSize: 13,
                cursor: busy || loading || isChecking ? "default" : "pointer",
                background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                color: "#1b1508",
                boxShadow: "0 8px 18px rgba(0,0,0,.55)",
                opacity: busy || loading || isChecking ? 0.5 : 1,
              }}
            >
              Se connecter
            </button>
          </div>

          {(loading || isChecking || busy) && (
            <div
              style={{
                fontSize: 11,
                opacity: 0.8,
                marginTop: 4,
              }}
            >
              Vérification de la session en cours…
            </div>
          )}
        </div>
      ) : (
        /* --------- PROFIL CONNECTÉ --------- */
        <div
          style={{
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            background:
              "radial-gradient(120% 160% at 0% 0%, rgba(127,226,169,.10), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.96), rgba(10,10,12,.98))",
            border: "1px solid rgba(127,226,169,.45)",
            boxShadow: "0 14px 30px rgba(0,0,0,.55)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Profil online connecté
          </div>

          {/* Avatar + nom + statut */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            {/* Wrapper avatar + drapeau */}
            <div
              style={{
                position: "relative",
                width: 52,
                height: 52,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 30% 0%, #ffde75, #c2871f)",
                }}
              >
                {activeProfile?.avatarDataUrl ? (
                  <img
                    src={activeProfile.avatarDataUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: "#1a1a1a",
                      fontSize: 20,
                    }}
                  >
                    {(user?.nickname || "??").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {countryFlag && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -6,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "2px solid #000",
                    overflow: "hidden",
                    boxShadow: "0 0 8px rgba(0,0,0,.8)",
                    background: "#111",
                    display: "grid",
                    placeItems: "center",
                    zIndex: 2,
                  }}
                  title={countryRaw}
                >
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    {countryFlag}
                  </span>
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#ffcf57",
                }}
              >
                {displayName}
              </div>

              {countryRaw && (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginTop: 1,
                  }}
                >
                  {countryRaw}
                </div>
              )}

              <div
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,.55)",
                    border: "1px solid rgba(255,255,255,.12)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor,
                      boxShadow: `0 0 6px ${statusColor}`,
                    }}
                  />
                  <span>{statusLabel}</span>
                </span>

                {isMock && (
                  <span
                    style={{
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    (mode démo local)
                  </span>
                )}
              </div>

              {lastSeenLabel && (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    marginTop: 3,
                  }}
                >
                  Dernière activité : {lastSeenLabel}
                </div>
              )}
            </div>
          </div>

          {/* Boutons état + logout */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setPresence(store.selfStatus === "away" ? "online" : "away")
              }
              disabled={busy || loading || isChecking}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: "7px 10px",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                background: "linear-gradient(180deg,#444,#262626)",
                color: "#f5f5f7",
              }}
            >
              {store.selfStatus === "away" ? "Revenir en ligne" : "Absent"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={busy || loading || isChecking}
              style={{
                borderRadius: 999,
                padding: "7px 12px",
                border: "none",
                fontWeight: 800,
                fontSize: 12,
                background: "linear-gradient(180deg,#ff5a5a,#e01f1f)",
                color: "#fff",
              }}
            >
              Quitter
            </button>
          </div>
        </div>
      )}

      {/* --------- PLACEHOLDER FUTUR --------- */}
      <div
        style={{
          marginTop: 4,
          fontSize: 11.5,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "linear-gradient(180deg, rgba(24,24,30,.96), rgba(10,10,12,.98))",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          À venir
        </div>
        <div style={{ opacity: 0.85 }}>
          Liste d’amis, invitations, présence en ligne détaillée, lobbys de
          parties online seront ajoutés ici.
        </div>
      </div>

      {/* --------- HISTORIQUE ONLINE (MOCK) --------- */}
      <div
        style={{
          marginTop: 10,
          fontSize: 11.5,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "linear-gradient(180deg, rgba(26,26,34,.96), rgba(8,8,12,.98))",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Historique Online (mock)
        </div>

        {loadingMatches ? (
          <div style={{ opacity: 0.85 }}>Chargement…</div>
        ) : matches.length === 0 ? (
          <div style={{ opacity: 0.85 }}>
            Aucun match online enregistré pour le moment.
          </div>
        ) : (
          <>
            {matches.map((m) => {
              const title = getMatchTitle(m);
              const isTraining =
                (m as any).isTraining === true ||
                (m.payload as any)?.kind === "training_x01";

              return (
                <div
                  key={m.id}
                  style={{
                    marginTop: 8,
                    padding: 8,
                    borderRadius: 10,
                    background: "linear-gradient(180deg,#181820,#0c0c12)",
                    border: "1px solid rgba(255,255,255,.12)",
                    boxShadow: "0 8px 18px rgba(0,0,0,.55)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {title}
                    </div>

                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        background: isTraining
                          ? "linear-gradient(180deg,#35c86d,#23a958)"
                          : "linear-gradient(180deg,#ffc63a,#ffaf00)",
                        color: isTraining ? "#031509" : "#221600",
                      }}
                    >
                      {isTraining ? "Training" : "Match"}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 10.5,
                      opacity: 0.8,
                      marginBottom: 4,
                    }}
                  >
                    {formatMatchDate(m)}
                  </div>

                  <pre
                    style={{
                      margin: 0,
                      padding: 6,
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.85)",
                      fontSize: 10,
                      maxHeight: 120,
                      overflow: "auto",
                      border: "1px solid rgba(255,255,255,.08)",
                    }}
                  >
                    {JSON.stringify(m.payload, null, 2)}
                  </pre>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleClearOnlineHistory}
              style={{
                marginTop: 8,
                width: "100%",
                borderRadius: 999,
                padding: "6px 10px",
                border: "none",
                fontWeight: 800,
                fontSize: 12,
                background: "linear-gradient(180deg,#ff5a5a,#e01f1f)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Effacer l’historique local
            </button>
          </>
        )}
      </div>

      {/* --------- Salons online (mock) --------- */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(32,32,40,.95), rgba(10,10,14,.98))",
          boxShadow: "0 10px 24px rgba(0,0,0,.55)",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
            fontSize: 14,
            color: "#ffd56a",
            textShadow: "0 0 10px rgba(255,215,80,.4)",
          }}
        >
          Salons online (mock)
        </div>

        <div
          style={{
            opacity: 0.85,
            marginBottom: 10,
          }}
        >
          Crée un salon X01 local (mock) ou rejoins celui d’un ami avec un code.
        </div>

        {/* CREATE */}
        <button
          type="button"
          onClick={handleCreateLobby}
          disabled={creatingLobby}
          style={{
            width: "100%",
            borderRadius: 12,
            padding: "10px 12px",
            border: "1px solid rgba(255,255,255,.16)",
            background: creatingLobby
              ? "linear-gradient(180deg,#666,#444)"
              : "linear-gradient(180deg,#ffd56a,#e9a93d)",
            color: "#1c1304",
            fontWeight: 800,
            fontSize: 13,
            cursor: creatingLobby ? "default" : "pointer",
            marginBottom: 10,
            opacity: creatingLobby ? 0.6 : 1,
          }}
        >
          {creatingLobby ? "Création…" : "Créer un salon X01"}
        </button>

        {/* JOIN */}
        <div
          style={{
            marginTop: 2,
            marginBottom: 8,
          }}
        >
          <label
            style={{
              fontSize: 11,
              opacity: 0.9,
              display: "block",
              marginBottom: 4,
            }}
          >
            Code de salon
          </label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="Ex : 4F9Q"
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.2)",
              background: "rgba(5,5,8,.95)",
              color: "#f5f5f7",
              padding: "7px 10px",
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          />
          <button
            type="button"
            onClick={handleJoinLobby}
            disabled={joiningLobby}
            style={{
              width: "100%",
              borderRadius: 12,
              padding: "9px 12px",
              border: "1px solid rgba(255,255,255,.16)",
              background: joiningLobby
                ? "linear-gradient(180deg,#555,#333)"
                : "linear-gradient(180deg,#4fb4ff,#1c78d5)",
              color: "#04101f",
              fontWeight: 800,
              fontSize: 13,
              cursor: joiningLobby ? "default" : "pointer",
              opacity: joiningLobby ? 0.65 : 1,
            }}
          >
            {joiningLobby ? "Recherche…" : "Rejoindre avec ce code"}
          </button>

          {(joinError || joinInfo) && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11.5,
              }}
            >
              {joinError && (
                <div style={{ color: "#ff8a8a" }}>{joinError}</div>
              )}
              {joinInfo && !joinError && (
                <div style={{ color: "#8fe6aa" }}>{joinInfo}</div>
              )}
            </div>
          )}
        </div>

        {/* MODAL LOBBY CRÉÉ */}
        {showLobbyModal && lastCreatedLobby && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(255,255,255,.15)",
              boxShadow: "0 8px 20px rgba(0,0,0,.5)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 6,
                fontSize: 13,
                color: "#7fe2a9",
              }}
            >
              Salon créé !
            </div>

            <div style={{ fontSize: 11.5, opacity: 0.85, marginBottom: 8 }}>
              Code du salon :
            </div>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "#111",
                border: "1px solid rgba(255,255,255,.15)",
                fontSize: 16,
                fontWeight: 800,
                textAlign: "center",
                letterSpacing: 2,
                color: "#ffd56a",
                marginBottom: 12,
              }}
            >
              {lastCreatedLobby.code}
            </div>

            <button
              type="button"
              onClick={() => setShowLobbyModal(false)}
              style={{
                width: "100%",
                borderRadius: 999,
                padding: "8px 14px",
                border: "none",
                background: "linear-gradient(180deg,#444,#222)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        )}

        {/* RÉSUMÉ JOIN */}
        {joinedLobby && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(127,226,169,.45)",
              fontSize: 11.5,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 4,
                color: "#7fe2a9",
              }}
            >
              Salon trouvé
            </div>
            <div>Code : {joinedLobby.code}</div>
            <div>Hôte : {joinedLobby.hostName}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Utils : drapeau pays ---------- */

/**
 * Conversion "FR" -> 🇫🇷, "France" -> 🇫🇷, etc.
 * Version sans regex \p{} pour rester compatible partout.
 */
function getCountryFlag(country: string): string {
  if (!country) return "";
  const trimmed = country.trim();

  // L'utilisateur met directement un drapeau emoji ?
  const cps = Array.from(trimmed);
  if (cps.length === 2) {
    const cp0 = cps[0].codePointAt(0) ?? 0;
    const cp1 = cps[1].codePointAt(0) ?? 0;
    if (
      cp0 >= 0x1f1e6 &&
      cp0 <= 0x1f1ff &&
      cp1 >= 0x1f1e6 &&
      cp1 <= 0x1f1ff
    ) {
      return trimmed;
    }
  }

  const names: Record<string, string> = {
    france: "FR",
    belgique: "BE",
    belgium: "BE",
    suisse: "CH",
    switzerland: "CH",
    espagne: "ES",
    spain: "ES",
    italie: "IT",
    italy: "IT",
    allemagne: "DE",
    germany: "DE",
    royaumeuni: "GB",
    "royaume-uni": "GB",
    uk: "GB",
    angleterre: "GB",
    paysbas: "NL",
    "pays-bas": "NL",
    netherlands: "NL",
    usa: "US",
    étatsunis: "US",
    "états-unis": "US",
    unitedstates: "US",
    portugal: "PT",
  };

  let code: string | undefined;

  if (trimmed.length === 2) {
    code = trimmed.toUpperCase();
  } else {
    const key = trimmed
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[-']/g, "");
    code = names[key];
  }

  if (!code || code.length !== 2) return "";

  const A = 0x1f1e6;
  const chars = Array.from(code.toUpperCase()).map((c) =>
    String.fromCodePoint(A + (c.charCodeAt(0) - 65))
  );
  return chars.join("");
}
