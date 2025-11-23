// =======================================================
// src/hooks/useX01OnlineV3.ts
// Couche ONLINE autour du moteur X01 V3
// - Utilise useX01EngineV3 en local
// - Envoie des commandes "throw" au réseau
// - Applique des commandes reçues
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
} from "../lib/x01v3/x01OnlineProtocolV3";

export interface UseX01OnlineV3Args {
  role: X01OnlineRoleV3;           // "host" ou "guest"
  meta: X01OnlineMatchMetaV3;      // lobbyId, matchId...
  config: X01ConfigV3;

  // callbacks réseau (implémentés plus tard dans FriendsPage / onlineApi)
  onSendCommand?: (cmd: X01CommandV3, seq: number) => void;
  onSendSnapshot?: (state: X01MatchStateV3, seq: number) => void;
}

export interface UseX01OnlineV3Value {
  engine: ReturnType<typeof useX01EngineV3>;
  role: X01OnlineRoleV3;
  meta: X01OnlineMatchMetaV3;
  seq: number;

  // Local player id (pour info, à mapper plus tard avec ton profil online)
  // Pour l'instant, on ne distingue pas host/guest côté moteur.
  getLocalPlayerId: () => X01PlayerId | null;

  // Actions "locales" qui émettent aussi au réseau
  sendLocalThrow: (input: X01DartInputV3) => void;
  sendSnapshot: () => void;

  // Actions pour appliquer ce qui vient du réseau
  applyRemoteCommand: (cmd: X01CommandV3) => void;
  applyRemoteSnapshot: (state: X01MatchStateV3) => void;
}

export function useX01OnlineV3({
  role,
  meta,
  config,
  onSendCommand,
  onSendSnapshot,
}: UseX01OnlineV3Args): UseX01OnlineV3Value {
  const [seq, setSeq] = React.useState(0);

  // Moteur local
  const engine = useX01EngineV3({
    config,
  });

  // Id local "par défaut" : premier joueur de la config
  const getLocalPlayerId = React.useCallback((): X01PlayerId | null => {
    return config.players[0]?.id ?? null;
  }, [config.players]);

  // --------- Host/Guest : appliquer une commande localement ----------
  function localApplyCommand(cmd: X01CommandV3) {
    if (cmd.type === "throw" && cmd.dart) {
      const { segment, multiplier } = cmd.dart;
      const input: X01DartInputV3 = { segment, multiplier };
      engine.throwDart(input);
    }
    // TODO: plus tard supporter undo/next/force_next_player
  }

  // --------- Local : lancer une fléchette + envoyer commande ----------
  const sendLocalThrow = React.useCallback(
    (input: X01DartInputV3) => {
      setSeq(prev => {
        const nextSeq = prev + 1;

        // Appliquer en local via le moteur
        engine.throwDart(input);

        // Construire la commande pour le réseau
        const dartScore = scoreDartV3(input);
        const cmd: X01CommandV3 = {
          type: "throw",
          dart: {
            segment: input.segment,
            multiplier: input.multiplier,
            score: dartScore,
          },
        };

        if (onSendCommand) {
          onSendCommand(cmd, nextSeq);
        }

        return nextSeq;
      });
    },
    [engine, onSendCommand]
  );

  // --------- Appliquer une commande reçue du réseau ----------
  const applyRemoteCommand = React.useCallback(
    (cmd: X01CommandV3) => {
      localApplyCommand(cmd);
    },
    [] // localApplyCommand ne dépend que de engine, mais engine vient du hook
  );

  // --------- Snapshot complet (host → réseau) ----------
  const sendSnapshot = React.useCallback(() => {
    if (!onSendSnapshot) return;
    setSeq(prev => {
      const nextSeq = prev + 1;
      onSendSnapshot(engine.state, nextSeq);
      return nextSeq;
    });
  }, [engine.state, onSendSnapshot]);

  // --------- Appliquer un snapshot reçu du réseau ----------
  const applyRemoteSnapshot = React.useCallback(
    (_state: X01MatchStateV3) => {
      // ⚠️ Pour l'instant, on n'applique pas réellement le snapshot.
      // Quand on câblera vraiment l'online, on pourra :
      // - recréer un moteur avec ce state comme base
      // - ou ajouter une API de "sync" dans useX01EngineV3.
      // Ici on pose juste la signature.
      console.warn("[useX01OnlineV3] applyRemoteSnapshot non implémenté pour l'instant.");
    },
    []
  );

  return {
    engine,
    role,
    meta,
    seq,
    getLocalPlayerId,
    sendLocalThrow,
    sendSnapshot,
    applyRemoteCommand,
    applyRemoteSnapshot,
  };
}
