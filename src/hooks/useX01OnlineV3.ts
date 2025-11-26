// =======================================================
// src/hooks/useX01OnlineV3.ts
// Couche ONLINE autour du moteur X01 V3
// - Multi-joueurs ONLINE (jusqu'à 10 joueurs)
// - Ordre ALEATOIRE imposé par l'hôte (géré dans la config)
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
  role: X01OnlineRoleV3; // "host" ou "guest"
  meta: X01OnlineMatchMetaV3; // lobbyId, matchId...
  config: X01ConfigV3;

  // callbacks réseau (implémentés plus tard via WebSocket client)
  onSendCommand?: (payload: X01OnlineCommandEnvelope) => void;
  onSendSnapshot?: (payload: { seq: number; state: X01MatchStateV3 }) => void;
}

export interface UseX01OnlineV3Value {
  engine: ReturnType<typeof useX01EngineV3>;
  role: X01OnlineRoleV3;
  meta: X01OnlineMatchMetaV3;
  seq: number;

  // Local player (index dans config pour l’instant)
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
  const seqRef = React.useRef(0);
  seqRef.current = seq;

  // ====================
  // MOTEUR LOCAL
  // ====================
  const engine = useX01EngineV3({
    config,
  });

  // Joueur local = premier joueur de la config (pour l’instant)
  // Plus tard : on fera le mapping avec l’ID online (userId / profileId)
  const getLocalPlayerId = React.useCallback((): X01PlayerId | null => {
    return config.players[0]?.id ?? null;
  }, [config.players]);

  // ==================================================
  // FONCTIONS LOCALES (THROW, UNDO, NEXT PLAYER)
  // ==================================================

  const localApplyThrow = React.useCallback(
    (dart: X01DartInputV3) => {
      engine.throwDart(dart);
    },
    [engine]
  );

  const localApplyUndo = React.useCallback(() => {
    engine.undoLast();
  }, [engine]);

  const localApplyForceNext = React.useCallback(() => {
    engine.forceNextPlayer();
  }, [engine]);

  // ==================================================
  // EMETTRE une commande LOCALE → réseau
  // ==================================================

  const sendLocalThrow = React.useCallback(
    (input: X01DartInputV3) => {
      const dartScore = scoreDartV3(input);

      setSeq((prev) => {
        const nextSeq = prev + 1;

        // 1) Appliquer en local
        engine.throwDart(input);

        // 2) Envoyer au réseau
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
  }, [role, onSendCommand, localApplyUndo]);

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
  }, [role, onSendCommand, localApplyForceNext]);

  // ==================================================
  // COMMANDES RÉSEAU → appliquer localement
  // ==================================================

  const applyRemoteCommand = React.useCallback(
    (env: X01OnlineCommandEnvelope) => {
      if (!env) return;

      // Sécurité basique : on ignore les commandes trop anciennes
      if (env.seq && env.seq <= seqRef.current) {
        return;
      }

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

      // On se met à jour sur la séquence
      if (typeof env.seq === "number") {
        setSeq(env.seq);
      }
    },
    [localApplyThrow, localApplyUndo, localApplyForceNext]
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
  }, [engine, onSendSnapshot]);

  const applyRemoteSnapshot = React.useCallback(
    (remoteSeq: number, state: X01MatchStateV3) => {
      // Anti "rewind": on ignore les snapshots plus vieux
      if (remoteSeq <= seqRef.current) return;

      console.warn(
        "[useX01OnlineV3] applyRemoteSnapshot — TODO: synchronisation moteur depuis l'état remote",
        { remoteSeq, state }
      );

      // Plus tard :
      // engine.syncFromRemote(state);
      setSeq(remoteSeq);
    },
    []
  );

  // ==================================================
  // Commandes de SALLE : join / leave / ready / start
  // ==================================================

  const sendLifecycle = React.useCallback(
    (cmd: X01OnlineLifecycleCommand) => {
      if (onSendCommand) {
        const nextSeq = seqRef.current + 1;
        onSendCommand({
          seq: nextSeq,
          type: "lifecycle",
          origin: role,
          payload: cmd,
        });
        setSeq(nextSeq);
      }
    },
    [onSendCommand, role]
  );

  const applyLifecycle = React.useCallback(
    (cmd: X01OnlineLifecycleCommand) => {
      console.log("[useX01OnlineV3] Lifecycle remote:", cmd);
      // On préparera ici :
      // - mise à jour salle d'attente
      // - flags "ready"
      // - démarrage partie synchronisé (host → guests)
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
