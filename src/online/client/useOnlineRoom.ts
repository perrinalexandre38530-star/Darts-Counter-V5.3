// =========================================================
// src/online/client/useOnlineRoom.ts
// Hook client WebSocket pour le mode X01 Online temps réel
// - Se connecte au Worker Cloudflare (/room/:code)
// - Envoie / reçoit les ClientEvent / ServerEvent
// - Expose RoomState + helpers (join, start, visit, undo…)
// =========================================================

import React from "react";
import type {
  ClientEvent,
  ServerEvent,
  RoomState,
  PlayerId,
  RoomId,
} from "../shared/types";

// ---------------------------------------------------------
// Config WS : base URL depuis Vite
// ---------------------------------------------------------
//
// Dans ton .env.local (front) tu dois avoir UNE ligne :
//   VITE_ONLINE_WS_BASE_URL=wss://darts-online.<ton-compte>.workers.dev
//
// En dev local, si tu fais `wrangler dev` sur le worker :
//   VITE_ONLINE_WS_BASE_URL=ws://127.0.0.1:8787
// ---------------------------------------------------------

const WS_BASE =
  import.meta.env.VITE_ONLINE_WS_BASE_URL ||
  (import.meta.env.DEV ? "ws://127.0.0.1:8787" : "");

// ---------------------------------------------------------
// Types internes hook
// ---------------------------------------------------------

type WsStatus = "idle" | "connecting" | "connected" | "disconnected";

type UseOnlineRoomOptions = {
  roomCode: string;      // code salon ex: "4F9Q" (ou lobbyCode)
  playerId: PlayerId;    // id joueur côté app
  playerName: string;    // nom/pseudo
  autoJoin?: boolean;    // join_room auto à la connexion
};

type UseOnlineRoomReturn = {
  roomState: RoomState | null;
  wsStatus: WsStatus;
  lastError: string | null;

  // Actions génériques
  reconnect: () => void;
  close: () => void;

  // Actions X01
  sendPing: () => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  startX01Match: (params: {
    startScore: number;
    order: { id: PlayerId; name: string }[];
  }) => void;
  sendVisit: (darts: { value: number; mult: 1 | 2 | 3 | 25 | 50 }[]) => void;
  undoLast: () => void;
};

// ---------------------------------------------------------
// Helper : construit l’URL WS -> /room/:code
// ---------------------------------------------------------

function buildWsUrl(roomCode: string): string {
  if (!WS_BASE) {
    console.warn(
      "[useOnlineRoom] VITE_ONLINE_WS_BASE_URL non défini. Ajoute-le dans .env.local."
    );
  }
  const base = (WS_BASE || "").replace(/\/+$/, "");
  const code = roomCode.trim().toUpperCase();
  return `${base}/room/${code}`;
}

// ---------------------------------------------------------
// Hook principal
// ---------------------------------------------------------

export function useOnlineRoom(
  opts: UseOnlineRoomOptions
): UseOnlineRoomReturn {
  const { roomCode, playerId, playerName, autoJoin = true } = opts;

  const [roomState, setRoomState] = React.useState<RoomState | null>(null);
  const [wsStatus, setWsStatus] = React.useState<WsStatus>("idle");
  const [lastError, setLastError] = React.useState<string | null>(null);

  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTokenRef = React.useRef(0);

  // --------- Fonctions internes ---------

  const safeSend = React.useCallback((ev: ClientEvent) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[useOnlineRoom] WS non connecté, impossible d’envoyer", ev);
      return;
    }
    try {
      ws.send(JSON.stringify(ev));
    } catch (e) {
      console.warn("[useOnlineRoom] ws.send error", e);
    }
  }, []);

  const handleServerEvent = React.useCallback((ev: ServerEvent) => {
    switch (ev.t) {
      case "pong": {
        // juste pour debug si tu veux
        return;
      }

      case "error": {
        console.warn("[Room] server error", ev.code, ev.msg);
        setLastError(ev.msg || ev.code || "Erreur serveur");
        return;
      }

      case "server_update": {
        setRoomState(ev.state);
        return;
      }

      default: {
        // Exhaustivité TS si tu veux
        return;
      }
    }
  }, []);

  // --------- Connexion WS + gestion auto-reconnect ---------

  const connect = React.useCallback(() => {
    const token = ++reconnectTokenRef.current; // annule les anciennes connexions
    setLastError(null);

    if (!roomCode) {
      setLastError("Code de salon manquant.");
      return;
    }

    const url = buildWsUrl(roomCode);
    if (!url) {
      setLastError(
        "URL WebSocket invalide. Vérifie VITE_ONLINE_WS_BASE_URL dans .env.local."
      );
      return;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setWsStatus("connecting");

      ws.onopen = () => {
        if (reconnectTokenRef.current !== token) {
          ws.close();
          return;
        }
        setWsStatus("connected");
        // Auto-join une fois ouvert
        if (autoJoin) {
          safeSend({
            t: "join_room",
            playerId,
            name: playerName || "Joueur",
          });
        }
      };

      ws.onerror = (ev) => {
        console.warn("[useOnlineRoom] ws.onerror", ev);
        setLastError("Erreur WebSocket (voir console).");
      };

      ws.onclose = () => {
        if (reconnectTokenRef.current !== token) {
          return;
        }
        setWsStatus("disconnected");
        // Option : auto-reconnect doux
        setTimeout(() => {
          if (reconnectTokenRef.current === token) {
            connect();
          }
        }, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const data =
            typeof event.data === "string"
              ? event.data
              : new TextDecoder().decode(event.data as ArrayBuffer);
          const msg: ServerEvent = JSON.parse(data);
          handleServerEvent(msg);
        } catch (e) {
          console.warn("[useOnlineRoom] message parse error", e);
        }
      };
    } catch (e: any) {
      console.error("[useOnlineRoom] WebSocket init error", e);
      setLastError(e?.message || "Impossible d’ouvrir la connexion WebSocket.");
      setWsStatus("disconnected");
    }
  }, [roomCode, playerId, playerName, autoJoin, handleServerEvent, safeSend]);

  // Connexion au montage / changement de roomCode
  React.useEffect(() => {
    connect();
    return () => {
      reconnectTokenRef.current++;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  // --------- API publique (actions) ---------

  const reconnect = React.useCallback(() => {
    reconnectTokenRef.current++;
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setRoomState(null);
    setWsStatus("idle");
    connect();
  }, [connect]);

  const close = React.useCallback(() => {
    reconnectTokenRef.current++;
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setWsStatus("disconnected");
  }, []);

  const sendPing = React.useCallback(() => {
    safeSend({ t: "ping" });
  }, [safeSend]);

  const joinRoom = React.useCallback(() => {
    safeSend({
      t: "join_room",
      playerId,
      name: playerName || "Joueur",
    });
  }, [safeSend, playerId, playerName]);

  const leaveRoom = React.useCallback(() => {
    safeSend({ t: "leave_room" });
  }, [safeSend]);

  const startX01Match = React.useCallback(
    (params: { startScore: number; order: { id: PlayerId; name: string }[] }) => {
      safeSend({
        t: "start_match",
        start: {
          game: "x01",
          startScore: params.startScore,
          order: params.order.map((p) => p.id),
        },
      } as ClientEvent);
    },
    [safeSend]
  );

  const sendVisit = React.useCallback(
    (darts: { value: number; mult: 1 | 2 | 3 | 25 | 50 }[]) => {
      safeSend({
        t: "throw_visit",
        darts,
      } as ClientEvent);
    },
    [safeSend]
  );

  const undoLast = React.useCallback(() => {
    safeSend({ t: "undo_last" } as ClientEvent);
  }, [safeSend]);

  return {
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
  };
}
