// ============================================
// src/pages/FriendsPage.tsx
// Mode Online & Amis — v1 (mock + futur backend)
// - Compte online (pseudo) synchronisé avec le profil local actif
// - Connexion / création rapide
// - Statut en ligne (online / absent) lié à store.selfStatus
// - Historique Online (mock) : Training + Matches
// - Présence locale (lastSeen) pingée toutes les 30s
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { onlineApi } from "../lib/onlineApi";
import type { OnlineMatch } from "../lib/onlineTypes";

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
};

/* ---------- Constantes localStorage ---------- */

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

  // Profil local actif = référence pour le pseudo par défaut
  const activeProfile =
    (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  const [nickname, setNickname] = React.useState(
    user?.nickname || activeProfile?.name || ""
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  // Historique Online (mock)
  const [matches, setMatches] = React.useState<OnlineMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = React.useState(false);

  // Présence locale (lastSeen)
  const initialPresence = React.useMemo(() => loadPresenceFromLS(), []);
  const [lastSeen, setLastSeen] = React.useState<number | null>(
    initialPresence?.lastSeen ?? null
  );

  // Met à jour le pseudo quand la session change
  React.useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname);
    }
  }, [user?.nickname]);

  const isChecking = status === "checking";

  /* ---------- Présence : set + ping périodique ---------- */

  function setPresence(status: PresenceStatus) {
    update((s) => ({
      ...s,
      selfStatus: status as any,
    }));
    savePresenceToLS(status);
    setLastSeen(Date.now());
  }

  // Ping périodique toutes les 30s quand on est en ligne
  React.useEffect(() => {
    if (!isSignedIn || store.selfStatus !== "online") return;
    if (typeof window === "undefined") return;

    const id = window.setInterval(() => {
      savePresenceToLS("online");
      setLastSeen(Date.now());
    }, 30000); // 30s

    return () => window.clearInterval(id);
  }, [isSignedIn, store.selfStatus]);

  // Auto-ajustement si la dernière activité est très ancienne (ex > 10 min)
  React.useEffect(() => {
    if (!initialPresence) return;
    const diffMs = Date.now() - initialPresence.lastSeen;
    if (diffMs > 10 * 60 * 1000 && store.selfStatus === "online") {
      setPresence("away");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /* ---------- Historique Online (mock) ---------- */

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
        if (!cancelled) {
          setMatches(list || []);
        }
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
    // fallback générique
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

  /* ---------- Actions AUTH ---------- */

  async function handleSignup() {
    const nick = nickname.trim();
    if (!nick) {
      setError("Choisis un pseudo en ligne.");
      setInfo(null);
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await signup({ nickname: nick });

      // Option : aligner le displayName sur le profil local actif
      if (activeProfile) {
        await updateProfile({
          displayName: activeProfile.name,
          avatarUrl: activeProfile.avatarDataUrl ?? undefined,
        }).catch(() => {});
      }

      setPresence("online");
      setInfo("Compte online créé et connecté.");
      console.log("[online] signup ok");
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
    if (!nick) {
      setError("Entre ton pseudo pour te connecter.");
      setInfo(null);
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await login({ nickname: nick });
      setPresence("online");
      setInfo("Connexion réussie.");
      console.log("[online] login ok");
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
      // on ignore l'erreur
    } finally {
      setPresence("offline");
      setInfo("Déconnecté du mode online.");
      setBusy(false);
    }
  }

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
      }}
    >
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

      {/* --------- BLOC INFO MODE (démo / réel) --------- */}
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
          appareil (localStorage). Plus tard, un vrai serveur permettra de
          partager ton profil entre plusieurs appareils.
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

      {/* --------- BLOC CONNEXION / COMPTE --------- */}
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
              Profil local actif :{" "}
              <b>{activeProfile.name || "Profil local"}</b>. Ton compte online
              utilisera ce pseudo par défaut.
            </div>
          )}

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
              marginBottom: 10,
            }}
          />

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
                opacity: busy || loading || isChecking ? 0.6 : 1,
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
                opacity: busy || loading || isChecking ? 0.6 : 1,
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
        /* --------- BLOC PROFIL CONNECTÉ --------- */
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                overflow: "hidden",
                background:
                  "radial-gradient(circle at 30% 0%, #ffde75, #c2871f)",
                flexShrink: 0,
              }}
            >
              {activeProfile?.avatarDataUrl ? (
                <img
                  src={activeProfile.avatarDataUrl}
                  alt={activeProfile.name}
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
              <div
                style={{
                  fontSize: 12,
                  marginTop: 2,
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
                      boxShadow: `0 0 6px ${statusColor}`, // halo néon
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
                setPresence(
                  store.selfStatus === "away" ? "online" : "away"
                )
              }
              disabled={busy || loading || isChecking}
              style={{
                flex: 1,
                borderRadius: 999,
                padding: "7px 10px",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                cursor: busy || loading || isChecking ? "default" : "pointer",
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
                cursor: busy || loading || isChecking ? "default" : "pointer",
                background: "linear-gradient(180deg,#ff5a5a,#e01f1f)",
                color: "#fff",
              }}
            >
              Quitter
            </button>
          </div>
        </div>
      )}

      {/* --------- PLACEHOLDER FUTUR : Amis / présence détaillée --------- */}
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
          Liste d&apos;amis, invitations, présence en ligne détaillée, lobbys
          de parties online (X01, Cricket, etc.) seront ajoutés ici.
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
                    background:
                      "linear-gradient(180deg,#181820,#0c0c12)",
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
              Effacer l&apos;historique local
            </button>
          </>
        )}
      </div>

      {/* --------- NOUVEAU BLOC : Salons online (bientôt) --------- */}
      <div
        style={{
          marginTop: 10,
          fontSize: 11.5,
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(30,30,38,.96), rgba(8,8,12,.98))",
          boxShadow: "0 12px 26px rgba(0,0,0,.55)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
            fontSize: 13,
            color: "#ffcf57",
            textShadow: "0 0 10px rgba(255,215,80,.35)",
          }}
        >
          Salons online (bientôt)
        </div>
        <div
          style={{
            opacity: 0.9,
            marginBottom: 10,
            fontSize: 12,
          }}
        >
          Crée un salon X01 ou rejoins celui d’un ami avec un code pour jouer
          en ligne. Cette section sera activée dans une prochaine version.
        </div>
        <button
          type="button"
          disabled
          style={{
            width: "100%",
            borderRadius: 12,
            padding: "9px 12px",
            border: "1px solid rgba(255,255,255,.16)",
            background:
              "linear-gradient(180deg, rgba(60,60,70,.32), rgba(25,25,32,.6))",
            color: "rgba(255,255,255,.65)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "not-allowed",
            marginBottom: 6,
          }}
        >
          Créer un salon X01 (à venir)
        </button>
        <button
          type="button"
          disabled
          style={{
            width: "100%",
            borderRadius: 12,
            padding: "9px 12px",
            border: "1px solid rgba(255,255,255,.16)",
            background:
              "linear-gradient(180deg, rgba(60,60,70,.32), rgba(25,25,32,.6))",
            color: "rgba(255,255,255,.65)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "not-allowed",
          }}
        >
          Rejoindre avec un code (à venir)
        </button>
      </div>
    </div>
  );
}
