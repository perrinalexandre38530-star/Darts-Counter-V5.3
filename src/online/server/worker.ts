// =======================================================
// src/online/server/worker.ts
// Cloudflare Worker + Durable Object "RoomDO"
// - Route /ws?roomId=CODE  → WebSocket vers RoomDO
// - CORS via ALLOW_ORIGINS
// - RoomDO = moteur X01 temps réel (ta version existante)
// =======================================================

import { createX01, applyVisit, undoLast } from "./x01";
import type {
  ClientEvent,
  ServerEvent,
  RoomState,
  X01Match,
  PlayerId,
  RoomId,
} from "../shared/types";

export type Env = {
  ROOMS: DurableObjectNamespace;
  ALLOW_ORIGINS: string;
};

// ----- Helpers CORS -----

function isOriginAllowed(env: Env, origin: string | null): boolean {
  if (!origin) return false;
  const raw = env.ALLOW_ORIGINS || "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.length) return true; // si vide → tout autoriser
  return allowed.includes(origin);
}

function json(body: any, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...extraHeaders,
    },
  });
}

// ----- Worker principal -----

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");

    // Préflight CORS
    if (req.method === "OPTIONS") {
      const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      };
      if (origin && isOriginAllowed(env, origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Vary"] = "Origin";
      }
      return new Response(null, { status: 204, headers });
    }

    // Healthcheck simple
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, msg: "darts-online worker up" });
    }

    // WebSocket: /ws?roomId=ABC
    if (url.pathname === "/ws" && req.headers.get("Upgrade") === "websocket") {
      const roomId = (url.searchParams.get("roomId") || "default").toUpperCase();
      const id = env.ROOMS.idFromName(roomId);
      const stub = env.ROOMS.get(id);
      return stub.fetch(req);
    }

    return json({ error: "Not found" }, 404);
  },
};

// ----- Durable Object RoomDO -----

export class RoomDO {
  state: DurableObjectState;
  env: Env;
  roomId: RoomId;
  sockets: Map<string, WebSocket> = new Map();
  v = 0;
  data: RoomState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.roomId = ((state.id as any).name as RoomId) || "default";
    this.data = {
      roomId: this.roomId,
      clients: [],
      match: null,
    };
  }

  async fetch(req: Request): Promise<Response> {
    const upgrade = req.headers.get("Upgrade");
    const origin = req.headers.get("Origin");

    if (!isOriginAllowed(this.env, origin)) {
      return new Response("Forbidden origin", { status: 403 });
    }
    if (upgrade !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    await this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------- Hooks WebSocket DO ----------

  async webSocketMessage(ws: WebSocket, raw: ArrayBuffer | string) {
    try {
      const msg: ClientEvent = JSON.parse(
        typeof raw === "string" ? raw : new TextDecoder().decode(raw)
      );
      await this.handleEvent(ws, msg);
    } catch (e: any) {
      this.send(ws, {
        t: "error",
        code: "bad_json",
        msg: e?.message || String(e),
      });
    }
  }

  async webSocketClose(ws: WebSocket) {
    for (const [pid, sock] of this.sockets) {
      if (sock === ws) this.sockets.delete(pid);
    }
  }

  async webSocketError(ws: WebSocket) {
    // noop
  }

  // ---------- Helpers envoi ----------

  private send(ws: WebSocket, ev: ServerEvent) {
    try {
      ws.send(JSON.stringify(ev));
    } catch {}
  }

  private broadcast(ev: ServerEvent) {
    const payload = JSON.stringify(ev);
    for (const [, sock] of this.sockets) {
      try {
        sock.send(payload);
      } catch {}
    }
  }

  private bumpAndBroadcast() {
    this.v++;
    this.broadcast({ t: "server_update", v: this.v, state: this.data });
  }

  private getPlayer(pid: PlayerId) {
    return this.data.clients.find((c) => c.id === pid) || null;
  }

  private ensureSocketBound(ws: WebSocket, pid: PlayerId) {
    const existing = this.sockets.get(pid);
    if (existing && existing !== ws) {
      try {
        existing.close();
      } catch {}
    }
    this.sockets.set(pid, ws);
  }

  private ensureMatchExists() {
    if (!this.data.match) throw new Error("no_match");
  }

  private assertTurn(pid: PlayerId) {
    this.ensureMatchExists();
    if (this.data.match!.turn !== pid) throw new Error("not_your_turn");
  }

  private startX01(
    startScore: number,
    order: { id: PlayerId; name: string }[]
  ) {
    this.data.match = createX01(startScore, order);
  }

  // ---------- Logique temps réel ----------

  private async handleEvent(ws: WebSocket, ev: ClientEvent) {
    switch (ev.t) {
      case "ping":
        return this.send(ws, { t: "pong" });

      case "join_room": {
        this.ensureSocketBound(ws, ev.playerId);
        if (!this.getPlayer(ev.playerId)) {
          this.data.clients.push({ id: ev.playerId, name: ev.name });
        } else {
          this.data.clients = this.data.clients.map((c) =>
            c.id === ev.playerId ? { ...c, name: ev.name } : c
          );
        }
        this.bumpAndBroadcast();
        return;
      }

      case "start_match": {
        if (ev.start.game !== "x01") {
          this.send(ws, {
            t: "error",
            code: "unsupported_game",
            msg: "Only x01 in v1",
          });
          return;
        }
        const players = ev.start.order.map((pid) => {
          const c = this.getPlayer(pid);
          if (!c) throw new Error("unknown_player:" + pid);
          return c;
        });
        this.startX01(ev.start.startScore, players);
        this.bumpAndBroadcast();
        return;
      }

      case "throw_visit": {
        this.ensureMatchExists();
        const pid =
          [...this.sockets.entries()].find(([, s]) => s === ws)?.[0] || null;
        if (!pid) throw new Error("no_player_bound");
        this.assertTurn(pid);
        const m = this.data.match as X01Match;
        applyVisit(m, pid, ev.darts);
        this.bumpAndBroadcast();
        return;
      }

      case "undo_last": {
        this.ensureMatchExists();
        const m = this.data.match as X01Match;
        undoLast(m);
        this.bumpAndBroadcast();
        return;
      }

      case "leave_room": {
        const pid =
          [...this.sockets.entries()].find(([, s]) => s === ws)?.[0] || null;
        if (pid) this.sockets.delete(pid);
        this.bumpAndBroadcast();
        return;
      }
    }
  }
}
