// =======================================================
// src/online/client/useOnlineRoom.ts
// Hook React pour gérer la connexion WebSocket Online
// - Connexion / déconnexion propre
// - join_room automatique
// - expose send(), state, connected, lastEvent
// =======================================================

import * as React from "react";
import { connectRoomSocket } from "./wsClient";
import type { ClientEvent, ServerEvent } from "../shared/types";

export interface UseOnlineRoomOptions {
  roomId: string;          // code salon (ex: GFBB)
  playerId: string;        // id du joueur online (Supabase user.id)
  nickname: string;        // displayName du joueur
}

export interface UseOnlineRoomValue {
  connected: boolean;
  state: any | null;
  lastEvent: ServerEvent | null;
  send: (ev: ClientEvent) => void;
  close: () => void;
}

export function useOnlineRoom({
  roomId,
  playerId,
  nickname,
}: UseOnlineRoomOptions): UseOnlineRoomValue {
  const [connected, setConnected] = React.useState(false);
  const [state, setState] = React.useState<any | null>(null);
  const [lastEvent, setLastEvent] = React.useState<ServerEvent | null>(null);

  const socketRef = React.useRef<ReturnType<typeof connectRoomSocket> | null>(
    null
  );

  // ---- Connexion et join_room ----
  React.useEffect(() => {
    if (!roomId) return;

    console.log("[useOnlineRoom] connecting to room:", roomId);

    const sock = connectRoomSocket(roomId, {
      onOpen() {
        console.log("[online] socket opened");
        setConnected(true);

        // JOIN AUTOMATIQUE
        sock.send({
          t: "join_room",
          playerId,
          name: nickname,
        });
      },

      onClose() {
        console.log("[online] socket closed");
        setConnected(false);
      },

      onError(ev) {
        console.warn("[online] socket error", ev);
      },

      onMessage(ev) {
        // Chaque message serveur
        setLastEvent(ev);

        if (ev.t === "server_update" && ev.state) {
          setState(ev.state);
        }
      },
    });

    socketRef.current = sock;

    return () => {
      console.log("[useOnlineRoom] cleanup: closing socket");
      sock.close();
    };
  }, [roomId, playerId, nickname]);

  // ---- Wrapper send ----
  function send(ev: ClientEvent) {
    socketRef.current?.send(ev);
  }

  function close() {
    socketRef.current?.close();
  }

  return {
    connected,
    state,
    lastEvent,
    send,
    close,
  };
}
