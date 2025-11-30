// =============================================================
// src/pages/X01OnlineSetup.tsx
// Pré-salle X01 Online (FULLWEB)
// - Reçoit un lobbyCode depuis FriendsPage
// - Se connecte au Worker Cloudflare via useOnlineRoom
// - Affiche le code, l'état de connexion et la liste des joueurs
// - Boutons pour : ping, join, démarrer une manche X01 501,
//   envoyer une visite de test, undo, etc.
// - Mode "debug" repliable pour ne pas polluer l'UX joueur.
// - Prochaine étape : brancher un vrai écran X01OnlinePlay
//   avec Keypad, scores, etc. à partir du match DO.
// =============================================================

import React from "react";
import type { Store } from "../lib/types";
import { useOnlineRoom } from "../online/client/useOnlineRoom";

type Props = {
  store: Store | null | undefined;
  go: (tab: any, params?: any) => void;
  params?: {
    lobbyCode?: string | null;
  };
};

export default function X01OnlineSetup({ store, go, params }: Props) {
  // Si pour une raison quelconque le store est manquant, on évite de tout faire crasher
  if (!store) {
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
            marginBottom: 8,
          }}
        >
          X01 Online — Salle d’attente
        </h2>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Store indisponible (props.store est undefined). Vérifie le wiring de
          l&apos;onglet <code>x01_online_setup</code> dans App.tsx.
        </div>
        <button
          type="button"
          onClick={() => go("friends")}
          style={{
            marginTop: 16,
            width: "100%",
            borderRadius: 999,
            padding: "8px 12px",
            border: "none",
            fontWeight: 800,
            fontSize: 13,
            background: "linear-gradient(180deg,#444,#262626)",
            color: "#f5f5f7",
            cursor: "pointer",
          }}
        >
          ⬅️ Retour Mode Online & Amis
        </button>
      </div>
    );
  }

  // --- Profil local actif (id + nom + avatar)
  const profiles = store.profiles || [];
  const activeProfile =
    profiles.find((p) => p.id === store.activeProfileId) ||
    profiles[0] ||
    null;

  const lobbyCode = (params?.lobbyCode || "")
    .toString()
    .trim()
    .toUpperCase();

  // Si pas de code => on affiche juste un placeholder
  const effectiveCode = lobbyCode || "----";

  // Mode debug (pour cacher/afficher les blocs de dev)
  const [showDebug, setShowDebug] = React.useState(false);

  // Hook WebSocket temps réel
  const {
    roomState,
    wsStatus,
    lastError,
    reconnect,
    close,
    sendPing,
    joinRoom,
    leaveRoom,
    startX01Match,
    sendVisit,
    undoLast,
  } = useOnlineRoom({
    roomCode: lobbyCode || "default",
    playerId: (activeProfile?.id as any) || "local",
    playerName: activeProfile?.name || "Joueur",
    autoJoin: true,
  });

  // --------------------------------------------
  // Helpers d'affichage
  // --------------------------------------------

  const statusLabel =
    wsStatus === "idle"
      ? "En attente"
      : wsStatus === "connecting"
      ? "Connexion en cours…"
      : wsStatus === "connected"
      ? "Connecté"
      : "Déconnecté";

  const statusColor =
    wsStatus === "connected"
      ? "#7fe2a9"
      : wsStatus === "connecting"
      ? "#ffd56a"
      : "#ff8a8a";

  const clients = roomState?.clients || [];
  const match: any = roomState?.match || null;

  // Exemple d'ordre par défaut pour démarrer une manche
  const defaultOrder =
    clients.length > 0
      ? clients.map((c) => ({ id: c.id, name: c.name }))
      : activeProfile
      ? [{ id: activeProfile.id as any, name: activeProfile.name }]
      : [];

  function handleStartMatch501() {
    if (!defaultOrder.length) return;
    startX01Match({
      startScore: 501,
      order: defaultOrder,
    });
  }

  function handleSendDemoVisit() {
    // Simple démo : visite T20, 20, miss
    sendVisit([
      { value: 20, mult: 3 },
      { value: 20, mult: 1 },
      { value: 0, mult: 1 },
    ]);
  }

  // --------------------------------------------
  // RENDER
  // --------------------------------------------

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
        X01 Online — Salle d’attente
      </h2>

      <p
        style={{
          fontSize: 13,
          opacity: 0.8,
          marginBottom: 12,
        }}
      >
        Code de salon partagé entre les joueurs. Dès que tout le monde est
        connecté à la même room, tu peux lancer la manche X01.
      </p>

      {/* Code du salon */}
      <div
        style={{
          marginBottom: 14,
          padding: "10px 12px",
          borderRadius: 12,
          background: "#111",
          border: "1px solid rgba(255,255,255,.16)",
          fontFamily: "monospace",
          letterSpacing: 3,
          fontSize: 18,
          fontWeight: 800,
          textAlign: "center",
          color: lobbyCode ? "#ffd56a" : "#888",
          boxShadow: lobbyCode
            ? "0 0 12px rgba(255,215,80,.25)"
            : "0 0 8px rgba(0,0,0,.6)",
        }}
      >
        {effectiveCode}
      </div>

      {/* Statut WebSocket */}
      <div
        style={{
          marginBottom: 12,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(32,32,40,.95), rgba(10,10,14,.98))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Connexion temps réel
          </div>
          <div style={{ opacity: 0.9 }}>
            Statut :{" "}
            <span
              style={{
                fontWeight: 700,
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>
          {lastError && (
            <div
              style={{
                marginTop: 4,
                color: "#ff8a8a",
              }}
            >
              {lastError}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={reconnect}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              background: "linear-gradient(180deg,#4fb4ff,#1c78d5)",
              color: "#04101f",
              cursor: "pointer",
            }}
          >
            Reconnecter
          </button>
          <button
            type="button"
            onClick={close}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              background: "linear-gradient(180deg,#ff5a5a,#e01f1f)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Infos joueur local */}
      {activeProfile && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.10)",
            background:
              "linear-gradient(180deg, rgba(24,24,30,.96), rgba(10,10,12,.98))",
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Joueur local
          </div>
          <div style={{ opacity: 0.9 }}>
            Tu es connecté en tant que{" "}
            <b>{activeProfile.name || "Joueur"}</b> (
            <code style={{ fontSize: 11 }}>{activeProfile.id}</code>).
          </div>
        </div>
      )}

      {/* Liste des clients dans la room */}
      <div
        style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "linear-gradient(180deg, rgba(26,26,34,.96), rgba(8,8,12,.98))",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Joueurs connectés dans la room
        </div>

        {clients.length === 0 ? (
          <div style={{ opacity: 0.85 }}>
            Aucun client pour le moment. Demande à ton ami de se connecter au
            même code de salon.
          </div>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: 16,
            }}
          >
            {clients.map((c) => (
              <li key={c.id} style={{ marginBottom: 2 }}>
                <span style={{ fontWeight: 700 }}>{c.name}</span>{" "}
                <span
                  style={{
                    opacity: 0.8,
                    fontSize: 11,
                  }}
                >
                  (<code>{c.id}</code>)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Boutons actions principales (utiles en prod pour l'instant) */}
      <div
        style={{
          marginBottom: 10,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.12)",
          background:
            "linear-gradient(180deg, rgba(30,30,40,.96), rgba(10,10,14,.98))",
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Lancer la manche X01
        </div>

        <button
          type="button"
          onClick={handleStartMatch501}
          disabled={!defaultOrder.length}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "8px 12px",
            border: "none",
            fontSize: 13,
            fontWeight: 800,
            background: defaultOrder.length
              ? "linear-gradient(180deg,#ffd56a,#e9a93d)"
              : "linear-gradient(180deg,#444,#333)",
            color: "#1c1304",
            cursor: defaultOrder.length ? "pointer" : "default",
            opacity: defaultOrder.length ? 1 : 0.5,
            marginBottom: 8,
          }}
        >
          🚀 Démarrer X01 (501)
        </button>

        <div
          style={{
            fontSize: 11,
            opacity: 0.8,
          }}
        >
          Pour l&apos;instant, cette action démarre la manche côté Worker
          (Cloudflare) et tu peux voir l&apos;état dans le mode debug ci-dessous.
          La prochaine étape sera d&apos;afficher un vrai écran de jeu à partir du
          state DO.
        </div>
      </div>

      {/* Toggle debug */}
      <button
        type="button"
        onClick={() => setShowDebug((v) => !v)}
        style={{
          marginBottom: showDebug ? 10 : 6,
          width: "100%",
          borderRadius: 999,
          padding: "7px 12px",
          border: "none",
          fontWeight: 700,
          fontSize: 12,
          background: showDebug
            ? "linear-gradient(180deg,#555,#333)"
            : "linear-gradient(180deg,#4fb4ff,#1c78d5)",
          color: "#f5f5f7",
          cursor: "pointer",
        }}
      >
        {showDebug ? "Masquer le mode debug" : "Afficher le mode debug (DO)"}
      </button>

      {/* ---------- BLOCS DEBUG (DO) ---------- */}
      {showDebug && (
        <>
          {/* Boutons actions "debug" DO */}
          <div
            style={{
              marginBottom: 16,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.12)",
              background:
                "linear-gradient(180deg, rgba(30,30,40,.96), rgba(10,10,14,.98))",
              fontSize: 12,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Actions DO (debug)
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={sendPing}
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "linear-gradient(180deg,#666,#444)",
                  color: "#f5f5f7",
                  cursor: "pointer",
                }}
              >
                Ping
              </button>

              <button
                type="button"
                onClick={joinRoom}
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "linear-gradient(180deg,#35c86d,#23a958)",
                  color: "#03140a",
                  cursor: "pointer",
                }}
              >
                join_room
              </button>

              <button
                type="button"
                onClick={leaveRoom}
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "linear-gradient(180deg,#ff8a5a,#e0491f)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                leave_room
              </button>

              <button
                type="button"
                onClick={handleStartMatch501}
                disabled={!defaultOrder.length}
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  background: defaultOrder.length
                    ? "linear-gradient(180deg,#ffd56a,#e9a93d)"
                    : "linear-gradient(180deg,#444,#333)",
                  color: "#1c1304",
                  cursor: defaultOrder.length ? "pointer" : "default",
                  opacity: defaultOrder.length ? 1 : 0.5,
                }}
              >
                Démarrer X01 (501)
              </button>

              <button
                type="button"
                onClick={handleSendDemoVisit}
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "linear-gradient(180deg,#4fb4ff,#1c78d5)",
                  color: "#04101f",
                  cursor: "pointer",
                }}
              >
                Envoyer visite T20-20-miss
              </button>

              <button
                type="button"
                onClick={undoLast}
                style={{
                  borderRadius: 999,
                  padding: "6px 10px",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "linear-gradient(180deg,#888,#555)",
                  color: "#f5f5f7",
                  cursor: "pointer",
                }}
              >
                Undo last
              </button>
            </div>
          </div>

          {/* Affichage brut de l'état Room / Match (debug) */}
          <div
            style={{
              fontSize: 11,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(0,0,0,0.8)",
              maxHeight: 260,
              overflow: "auto",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              État RoomState (debug)
            </div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(roomState, null, 2)}
            </pre>
          </div>
        </>
      )}

      {/* Retour Friends / Home */}
      <button
        type="button"
        onClick={() => go("friends")}
        style={{
          marginTop: 14,
          width: "100%",
          borderRadius: 999,
          padding: "8px 12px",
          border: "none",
          fontWeight: 800,
          fontSize: 13,
          background: "linear-gradient(180deg,#444,#262626)",
          color: "#f5f5f7",
          cursor: "pointer",
        }}
      >
        ⬅️ Retour Mode Online & Amis
      </button>
    </div>
  );
}
