// =======================================================
// src/online/server/RoomDO.ts
// Durable Object pour un salon ONLINE
// - Gère les connexions WebSocket d’un "room" (par code)
// - Broadcast des messages JSON à tous les clients
// - Garde une liste minimale des joueurs connectés
// =======================================================

export interface Env {
    ROOMS: DurableObjectNamespace;
    AVATAR_CACHE: KVNamespace;
    ALLOW_ORIGINS: string;
  }
  
  type ClientId = string;
  
  type ClientMeta = {
    ws: WebSocket;
    userId?: string;
    nickname?: string;
    isHost?: boolean;
    lastSeen: number;
  };
  
  type RoomPlayer = {
    userId: string;
    nickname: string;
    isHost: boolean;
    lastSeen: number;
  };
  
  type ClientMessage =
    | {
        type: "join";
        userId: string;
        nickname: string;
        isHost?: boolean;
        lobbyCode?: string;
      }
    | { type: "leave" }
    | { type: "ping" }
    | {
        type: "x01_cmd";
        payload: any;
      }
    | {
        type: "custom";
        kind: string;
        payload: any;
      };
  
  type ServerMessage =
    | {
        type: "welcome";
        roomCode: string;
      }
    | {
        type: "room_state";
        roomCode: string;
        players: RoomPlayer[];
      }
    | {
        type: "player_joined";
        player: RoomPlayer;
      }
    | {
        type: "player_left";
        userId: string;
      }
    | {
        type: "pong";
        ts: number;
      }
    | {
        type: "x01_cmd";
        from: { userId?: string; nickname?: string };
        payload: any;
      }
    | {
        type: "custom";
        kind: string;
        from: { userId?: string; nickname?: string };
        payload: any;
      };
  
  export class RoomDO {
    private state: DurableObjectState;
    private env: Env;
  
    // Clients connectés
    private clients: Map<ClientId, ClientMeta>;
    // Code du salon (on le déduit du name utilisé : env.ROOMS.idFromName(code))
    private roomCode: string;
  
    constructor(state: DurableObjectState, env: Env) {
      this.state = state;
      this.env = env;
      this.clients = new Map();
      this.roomCode = state.id.toString(); // sera remplacé à la première "join" avec lobbyCode si fourni
  
      // Optionnel : recharger des infos persistées plus tard
    }
  
    // Utilitaire : broadcast à tous les clients (ou à tous sauf un)
    private broadcast(msg: ServerMessage, exceptId?: ClientId) {
      const data = JSON.stringify(msg);
      for (const [id, meta] of this.clients.entries()) {
        if (exceptId && id === exceptId) continue;
        try {
          meta.ws.send(data);
        } catch (e) {
          // En cas d’erreur envoi → on ferme la socket
          try {
            meta.ws.close();
          } catch {}
          this.clients.delete(id);
        }
      }
    }
  
    private getPlayers(): RoomPlayer[] {
      const players: RoomPlayer[] = [];
      for (const [, meta] of this.clients.entries()) {
        if (!meta.userId || !meta.nickname) continue;
        players.push({
          userId: meta.userId,
          nickname: meta.nickname,
          isHost: !!meta.isHost,
          lastSeen: meta.lastSeen,
        });
      }
      return players;
    }
  
    private handleClientMessage(clientId: ClientId, raw: string) {
      let msg: ClientMessage | null = null;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (!msg) return;
  
      const meta = this.clients.get(clientId);
      if (!meta) return;
  
      const nowTs = Date.now();
      meta.lastSeen = nowTs;
  
      if (msg.type === "join") {
        meta.userId = msg.userId;
        meta.nickname = msg.nickname;
        meta.isHost = !!msg.isHost;
  
        if (msg.lobbyCode && !this.roomCode) {
          this.roomCode = msg.lobbyCode;
        }
  
        // Envoie l’état complet au nouveau client
        const players = this.getPlayers();
        this.sendTo(clientId, {
          type: "welcome",
          roomCode: this.roomCode,
        });
        this.sendTo(clientId, {
          type: "room_state",
          roomCode: this.roomCode,
          players,
        });
  
        // Broadcast aux autres
        if (meta.userId && meta.nickname) {
          this.broadcast(
            {
              type: "player_joined",
              player: {
                userId: meta.userId,
                nickname: meta.nickname,
                isHost: !!meta.isHost,
                lastSeen: meta.lastSeen,
              },
            },
            clientId
          );
        }
        return;
      }
  
      if (msg.type === "leave") {
        this.handleClientClose(clientId);
        return;
      }
  
      if (msg.type === "ping") {
        this.sendTo(clientId, { type: "pong", ts: nowTs });
        return;
      }
  
      if (msg.type === "x01_cmd") {
        this.broadcast(
          {
            type: "x01_cmd",
            from: {
              userId: meta.userId,
              nickname: meta.nickname,
            },
            payload: msg.payload,
          },
          clientId
        );
        return;
      }
  
      if (msg.type === "custom") {
        this.broadcast(
          {
            type: "custom",
            kind: msg.kind,
            from: {
              userId: meta.userId,
              nickname: meta.nickname,
            },
            payload: msg.payload,
          },
          clientId
        );
        return;
      }
    }
  
    private sendTo(id: ClientId, msg: ServerMessage) {
      const meta = this.clients.get(id);
      if (!meta) return;
      try {
        meta.ws.send(JSON.stringify(msg));
      } catch {
        try {
          meta.ws.close();
        } catch {}
        this.clients.delete(id);
      }
    }
  
    private handleClientClose(clientId: ClientId) {
      const meta = this.clients.get(clientId);
      if (!meta) return;
  
      const userId = meta.userId;
      this.clients.delete(clientId);
  
      if (userId) {
        this.broadcast({
          type: "player_left",
          userId,
        });
      }
    }
  
    async fetch(request: Request): Promise<Response> {
      const upgradeHeader = request.headers.get("Upgrade") || request.headers.get("upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Durable Object endpoint expects WebSocket", {
          status: 400,
        });
      }
  
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
  
      const clientId = crypto.randomUUID();
      const meta: ClientMeta = {
        ws: server as unknown as WebSocket,
        lastSeen: Date.now(),
      };
      this.clients.set(clientId, meta);
  
      (server as unknown as WebSocket).accept();
  
      (server as unknown as WebSocket).addEventListener("message", (evt: any) => {
        if (typeof evt.data === "string") {
          this.handleClientMessage(clientId, evt.data);
        }
      });
  
      (server as unknown as WebSocket).addEventListener("close", () => {
        this.handleClientClose(clientId);
      });
  
      (server as unknown as WebSocket).addEventListener("error", () => {
        this.handleClientClose(clientId);
      });
  
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
  }
  