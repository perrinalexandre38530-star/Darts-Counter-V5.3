// =======================================================
// src/hooks/useX01OnlineV3.ts
// Couche ONLINE autour du moteur X01 V3
// - Multi-joueurs ONLINE (jusqu'à 10 joueurs)
// - Ordre ALEATOIRE imposé par l'hôte
// - Support complet Sets / Legs (moteur X01 V3)
// - Commands réseau ("throw", "undo", "next") + snapshots
// - Gestion HOST / GUEST
// - Gestion commandes JOIN / LEAVE / READY / START (préparée)
// =======================================================

import * as React from "react";
import { useX01EngineV3 } from "./useX01EngineV3";

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01CommandV3,
  X01PlayerId,
} from "../types/x01v3";

import {
  scoreDartV3,
  type X01DartInputV3,
} from "../lib/x01v3/x01LogicV3";

import type {
  X01OnlineRoleV3,
  X01OnlineMatchMetaV3,
  X01OnlineCommandEnvelope,
  X01OnlineLifecycleCommand,
} from "../lib/x01v3/x01OnlineProtocolV3";

// =============================================================
// TYPES
// =============================================================

export interface UseX01OnlineV3Args {
  role: X01OnlineRoleV3;                 // "host" ou "guest"
  meta: X01OnlineMatchMetaV3;            // lobbyId, matchId...
  config: X01ConfigV3;

  // callbacks réseau (implémentés plus tard dans FriendsPage / onlineApi)
  onSendCommand?: (payload: X01OnlineCommandEnvelope) => void;
  onSendSnapshot?: (payload: { seq: number; state: X01MatchStateV3 }) => void;
}

export interface UseX01OnlineV3Value {
  engine: ReturnType<typeof useX01EngineV3>;
  role: X01OnlineRoleV3;
  meta: X01OnlineMatchMetaV3;
  seq: number;

  // Local player (index dans config)
  getLocalPlayerId: () => X01PlayerId | null;

  // --- COMMANDES LOCALES ---
  sendLocalThrow: (input: X01DartInputV3) => void;
  sendLocalUndo: () => void;
  sendForceNextPlayer: () => void;

  // --- SNAPSHOT / SYNC ---
  sendSnapshot: () => void;

  // --- COMMANDES REMOTES ---
  applyRemoteCommand: (env: X01OnlineCommandEnvelope) => void;
  applyRemoteSnapshot: (seq: number, state: X01MatchStateV3) => void;

  // --- ÉVÉNEMENTS DE SALLE (join/ready/start) ---
  sendLifecycle: (cmd: X01OnlineLifecycleCommand) => void;
  applyLifecycle: (cmd: X01OnlineLifecycleCommand) => void;
}

// =============================================================
// HOOK PRINCIPAL
// =============================================================

export function useX01OnlineV3({
  role,
  meta,
  config,
  onSendCommand,
  onSendSnapshot,
}: UseX01OnlineV3Args): UseX01OnlineV3Value {
  
  // Identifiant séquentiel unique pour chaque commande
  const [seq, setSeq] = React.useState(0);

  // ====================
  // MOTEUR LOCAL
  // ====================
  const engine = useX01EngineV3({
    config,
  });

  // Joueur local = premier joueur de la config
  const getLocalPlayerId = React.useCallback((): X01PlayerId | null => {
    return config.players[0]?.id ?? null;
  }, [config.players]);

  // ==================================================
  // FONCTIONS LOCALES (THROW, UNDO, NEXT PLAYER)
  // ==================================================

  function localApplyThrow(dart: X01DartInputV3) {
    engine.throwDart(dart);
  }

  function localApplyUndo() {
    engine.undoLast();
  }

  function localApplyForceNext() {
    engine.forceNextPlayer();
  }

  // ==================================================
  // EMETTRE une commande LOCALE → réseau
  // ==================================================

  const sendLocalThrow = React.useCallback(
    (input: X01DartInputV3) => {
      const dartScore = scoreDartV3(input);

      setSeq((prev) => {
        const nextSeq = prev + 1;

        // 1) appliquer en local
        engine.throwDart(input);

        // 2) envoyer au réseau
        if (onSendCommand) {
          const env: X01OnlineCommandEnvelope = {
            seq: nextSeq,
            type: "throw",
            origin: role,
            payload: {
              dart: {
                segment: input.segment,
                multiplier: input.multiplier,
                score: dartScore,
              },
            },
          };
          onSendCommand(env);
        }

        return nextSeq;
      });
    },
    [engine, role, onSendCommand]
  );

  const sendLocalUndo = React.useCallback(() => {
    setSeq((prev) => {
      const nextSeq = prev + 1;

      localApplyUndo();

      if (onSendCommand) {
        const env: X01OnlineCommandEnvelope = {
          seq: nextSeq,
          type: "undo",
          origin: role,
          payload: {},
        };
        onSendCommand(env);
      }

      return nextSeq;
    });
  }, [role, onSendCommand]);

  const sendForceNextPlayer = React.useCallback(() => {
    setSeq((prev) => {
      const nextSeq = prev + 1;

      localApplyForceNext();

      if (onSendCommand) {
        const env: X01OnlineCommandEnvelope = {
          seq: nextSeq,
          type: "next_player",
          origin: role,
          payload: {},
        };
        onSendCommand(env);
      }

      return nextSeq;
    });
  }, [role, onSendCommand]);

  // ==================================================
  // COMMANDES RÉSEAU → appliquer localement
  // ==================================================

  const applyRemoteCommand = React.useCallback(
    (env: X01OnlineCommandEnvelope) => {
      if (!env) return;

      if (env.type === "throw") {
        const d = env.payload.dart;
        if (!d) return;
        localApplyThrow({
          segment: d.segment,
          multiplier: d.multiplier,
        });
      }

      if (env.type === "undo") {
        localApplyUndo();
      }

      if (env.type === "next_player") {
        localApplyForceNext();
      }
    },
    []
  );

  // ==================================================
  // SNAPSHOT complet (host → réseau)
  // ==================================================

  const sendSnapshot = React.useCallback(() => {
    if (!onSendSnapshot) return;

    setSeq((prev) => {
      const nextSeq = prev + 1;
      onSendSnapshot({
        seq: nextSeq,
        state: engine.state,
      });
      return nextSeq;
    });
  }, [engine.state, onSendSnapshot]);

  const applyRemoteSnapshot = React.useCallback(
    (remoteSeq: number, state: X01MatchStateV3) => {
      console.warn(
        "[useX01OnlineV3] applyRemoteSnapshot — TODO: synchronisation moteur"
      );
      // plus tard :
      // engine.syncFromRemote(state)
    },
    []
  );

  // ==================================================
  // Commandes de SALLE : join / leave / ready / start
  // ==================================================

  const sendLifecycle = React.useCallback(
    (cmd: X01OnlineLifecycleCommand) => {
      if (onSendCommand) {
        onSendCommand({
          seq: seq + 1,
          type: "lifecycle",
          origin: role,
          payload: cmd,
        });
      }
      setSeq((s) => s + 1);
    },
    [onSendCommand, seq, role]
  );

  const applyLifecycle = React.useCallback(
    (cmd: X01OnlineLifecycleCommand) => {
      console.log("[Lifecycle] Remote:", cmd);
      // On préparera ici :
      // - mise à jour salle d'attente
      // - ready flags
      // - démarrage partie synchronisé
    },
    []
  );

  // ==================================================
  // EXPORT
  // ==================================================

  return {
    engine,
    role,
    meta,
    seq,
    getLocalPlayerId,
    sendLocalThrow,
    sendLocalUndo,
    sendForceNextPlayer,
    sendSnapshot,
    applyRemoteCommand,
    applyRemoteSnapshot,
    sendLifecycle,
    applyLifecycle,
  };
}
