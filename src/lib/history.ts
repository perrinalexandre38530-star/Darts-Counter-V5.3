console.warn("🔥 HISTORY PATCH LOADED v2");

// ============================================
// src/lib/history.ts — Historique "lourd + compressé"
// API : list(), get(id), upsert(rec), remove(id), clear()
// + History.{list,get,upsert,remove,clear,readAll}
// + History.{getX01, listInProgress, listFinished, listByStatus}
// - Stockage principal : IndexedDB (objectStore "history")
// - Compression : LZString (UTF-16) sur le champ payload → stocké en `payloadCompressed`
// - Fallback : localStorage si IDB indispo (compact, sans payload)
// - Migration auto depuis l’ancien localStorage KEY = "dc-history-v1"
// - Trim auto à MAX_ROWS
// ✅ FIX CRITICAL: legacy LSK peut être JSON OU LZString UTF16 (et parfois base64-ish) -> parse robuste
// ✅ FIX CRITICAL: 1 match MULTI = 1 record (dédoublonnage list + id canonique upsert)
// ============================================

/* =========================
   Types
========================= */
export type PlayerLite = {
  id: string;
  name?: string;
  avatarDataUrl?: string | null;
};

export type SavedMatch = {
  id: string;
  kind?: "x01" | "cricket" | string;
  status?: "in_progress" | "finished";
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;

  // ✅ NEW (light): id stable du match (pour éviter doublons multi)
  matchId?: string;

  // Config légère de la partie (ex: X01 301 / 501...)
  game?: {
    mode?: string;
    startScore?: number;
    [k: string]: any;
  } | null;
  // Résumé léger (pour listes)
  summary?: {
    legs?: number;
    darts?: number; // total darts (compat)
    avg3ByPlayer?: Record<string, number>;
    co?: number;
    [k: string]: any;
  } | null;
  // Payload complet (gros) — compressé en base
  payload?: any;

  // champs libres tolérés (meta, state, etc.)
  [k: string]: any;
};

/* =========================
   Cricket stats (nouveau)
========================= */
import { computeCricketLegStats, type CricketHit } from "./StatsCricket";

/* =========================
   Constantes
========================= */
const LSK = "dc-history-v1"; // ancien storage (migration + fallback)
const DB_NAME = "dc-store-v1";
// ⬇ Bump version pour créer/assurer l’index by_updatedAt
const DB_VER = 2;
const STORE = "history";
const MAX_ROWS = 400;

/* =========================
   Mini LZ-String UTF16
========================= */
/* eslint-disable */
const LZString = (function () {
  const f = String.fromCharCode;
  const baseReverseDic: Record<string, Record<string, number>> = {};
  function getBaseValue(alphabet: string, character: string) {
    if (!baseReverseDic[alphabet]) {
      baseReverseDic[alphabet] = {};
      for (let i = 0; i < alphabet.length; i++) {
        baseReverseDic[alphabet][alphabet.charAt(i)] = i;
      }
    }
    return baseReverseDic[alphabet][character];
  }
  const keyStrUriSafe =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
  const LZ: any = {};
  LZ.compressToUTF16 = function (input: string) {
    if (input == null) return "";
    let output = "",
      current = 0,
      status = 0,
      i: number;
    input = LZ.compress(input);
    for (i = 0; i < input.length; i++) {
      current = (current << 1) + input.charCodeAt(i);
      if (status++ == 14) {
        output += f(current + 32);
        status = 0;
        current = 0;
      }
    }
    return output + f(current + 32 + status);
  };
  LZ.decompressFromUTF16 = function (compressed: string) {
    if (compressed == null) return "";
    let output = "",
      current = 0,
      status = 0,
      i: number,
      c: number;
    for (i = 0; i < compressed.length; i++) {
      c = compressed.charCodeAt(i) - 32;
      if (status === 0) {
        status = c & 15;
        current = c >> 4;
      } else {
        current = (current << 15) + c;
        status += 15;
        while (status >= 8) {
          status -= 8;
          output += f((current >> status) & 255);
        }
      }
    }
    return LZ.decompress(output);
  };

  // ✅ Optionnel "best-effort": si quelqu'un a stocké un truc base64-ish,
  // on peut AU MOINS essayer de le décoder puis decompress() derrière.
  // (Ça ne couvre pas 100% des variantes LZString compressToBase64,
  // mais ça évite de crasher et récupère certains cas.)
  LZ._tryDecodeBase64ToString = function (b64: string) {
    try {
      // atob -> bytes -> string (latin1)
      const bin = atob(b64.replace(/[\r\n\s]/g, ""));
      return bin;
    } catch {
      return "";
    }
  };

  LZ.compress = function (uncompressed: string) {
    if (uncompressed == null) return "";
    let i,
      value,
      context_dictionary: any = {},
      context_dictionaryToCreate: any = {},
      context_c = "",
      context_wc = "",
      context_w = "",
      context_enlargeIn = 2,
      context_dictSize = 3,
      context_numBits = 2,
      context_data: number[] = [],
      context_data_val = 0,
      context_data_position = 0;
    for (let ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }
      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc))
        context_w = context_wc;
      else {
        if (
          Object.prototype.hasOwnProperty.call(
            context_dictionaryToCreate,
            context_w
          )
        ) {
          value = context_w.charCodeAt(0);
          for (i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1;
            if (context_data_position == 15) {
              context_data.push(context_data_val);
              context_data_val = 0;
              context_data_position = 0;
            } else context_data_position++;
          }
          for (i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == 15) {
              context_data.push(context_data_val);
              context_data_val = 0;
              context_data_position = 0;
            } else context_data_position++;
            value >>= 1;
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == 15) {
              context_data.push(context_data_val);
              context_data_val = 0;
              context_data_position = 0;
            } else context_data_position++;
            // @ts-ignore
            value >>= 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }
    if (context_w !== "") {
      if (
        Object.prototype.hasOwnProperty.call(
          context_dictionaryToCreate,
          context_w
        )
      ) {
        value = context_w.charCodeAt(0);
        for (i = 0; i < context_numBits; i++) {
          context_data_val = context_data_val << 1;
          if (context_data_position == 15) {
            context_data.push(context_data_val);
            context_data_val = 0;
            context_data_position = 0;
          } else context_data_position++;
        }
        for (i = 0; i < 8; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position == 15) {
            context_data.push(context_data_val);
            context_data_val = 0;
            context_data_position = 0;
          } else context_data_position++;
          value >>= 1;
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position == 15) {
            context_data.push(context_data_val);
            context_data_val = 0;
            context_data_position = 0;
          } else context_data_position++;
          // @ts-ignore
          value >>= 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }
    for (i = 0; i < context_numBits; i++) {
      context_data_val = context_data_val << 1;
      if (context_data_position == 15) {
        context_data.push(context_data_val);
        context_data_val = 0;
        context_data_position = 0;
      } else context_data_position++;
    }
    return context_data.map((c) => String.fromCharCode(c + 32)).join("");
  };
  LZ.decompress = function (compressed: string) {
    if (compressed == null) return "";
    let dictionary: any[] = [0, 1, 2],
      enlargeIn = 4,
      dictSize = 4,
      numBits = 3,
      entry = "",
      result: string[] = [],
      w: any,
      c: number;
    const data = {
      string: compressed,
      val: compressed.charCodeAt(0) - 32,
      position: 32768,
      index: 1,
    };
    function readBits(n: number) {
      let bits = 0,
        maxpower = Math.pow(2, n),
        power = 1;
      while (power != maxpower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = 32768;
          data.val = data.string.charCodeAt(data.index++) - 32;
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      return bits;
    }
    const next = readBits(2);
    switch (next) {
      case 0:
        c = readBits(8);
        dictionary[3] = String.fromCharCode(c);
        w = dictionary[3];
        break;
      case 1:
        c = readBits(16);
        dictionary[3] = String.fromCharCode(c);
        w = dictionary[3];
        break;
      case 2:
        return "";
    }
    result.push(w as string);
    while (true) {
      if (data.index > data.string.length) return "";
      let cc = readBits(numBits);
      let entry2;
      if (cc === 0) {
        c = readBits(8);
        dictionary[dictSize++] = String.fromCharCode(c);
        cc = dictSize - 1;
        enlargeIn--;
      } else if (cc === 1) {
        c = readBits(16);
        dictionary[dictSize++] = String.fromCharCode(c);
        cc = dictSize - 1;
        enlargeIn--;
      } else if (cc === 2) return result.join("");
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
      if (dictionary[cc]) entry2 = dictionary[cc];
      else if (cc === dictSize)
        entry2 = (w as string) + (w as string).charAt(0);
      else return "";
      result.push(entry2 as string);
      dictionary[dictSize++] = (w as string) + (entry2 as string).charAt(0);
      enlargeIn--;
      w = entry2;
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  };
  return LZ;
})();
/* eslint-enable */

/* =========================
   ✅ FIX: lecture robuste localStorage (JSON OU LZString)
   - évite: "Unexpected token '�' is not valid JSON"
   - supporte: JSON direct, compressToUTF16
   - best-effort: base64-ish (decode -> JSON direct ou decompress)
========================= */
function parseHistoryLocalStorage(raw: string | null): any[] {
  if (!raw) return [];
  const s = String(raw);

  // 1) JSON direct
  const trimmed = s.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const v = JSON.parse(trimmed);
      return Array.isArray(v) ? v : [];
    } catch {
      // on tente les décompressions ci-dessous
    }
  }

  // 2) LZString UTF16
  try {
    const dec = (LZString as any).decompressFromUTF16?.(s);
    if (typeof dec === "string" && dec.trim().length) {
      const v = JSON.parse(dec);
      return Array.isArray(v) ? v : [];
    }
  } catch {}

  // 3) Base64-ish (best effort)
  // - certains legacy ont du base64 (pas forcément lz-string officiel)
  // - on tente: atob -> JSON, puis atob -> decompress -> JSON
  try {
    const isB64 = /^[A-Za-z0-9+/=\r\n\s-]+$/.test(s) && s.length > 16;
    if (isB64) {
      const bin = (LZString as any)._tryDecodeBase64ToString?.(s) || "";
      if (bin) {
        // 3a) bin est déjà du JSON
        try {
          const v = JSON.parse(bin);
          return Array.isArray(v) ? v : [];
        } catch {}
        // 3b) bin est une string compressée version "compress" -> decompress
        try {
          const dec = (LZString as any).decompress?.(bin);
          if (typeof dec === "string" && dec.trim().length) {
            const v = JSON.parse(dec);
            return Array.isArray(v) ? v : [];
          }
        } catch {}
      }
    }
  } catch {}

  // 4) decompress direct (rare)
  try {
    const dec = (LZString as any).decompress?.(s);
    if (typeof dec === "string" && dec.trim().length) {
      const v = JSON.parse(dec);
      return Array.isArray(v) ? v : [];
    }
  } catch {}

  return [];
}

/* =========================
   ✅ Legacy localStorage safe read (rows)
========================= */
function readLegacyRowsSafe(): SavedMatch[] {
  const raw = localStorage.getItem(LSK);
  const rows = parseHistoryLocalStorage(raw);
  return Array.isArray(rows) ? (rows as SavedMatch[]) : [];
}

/* =========================
   ✅ DEDUPE KEY — 1 match réel = 1 id canonique
   - utilisé par list() (dédoublonne les anciennes données “1 record par joueur”)
   - utilisé par upsert() (écrit propre : même match => même id)
========================= */
function getCanonicalMatchId(rec: any): string | null {
  if (!rec) return null;

  const direct =
    rec?.matchId ??
    rec?.sessionId ??
    rec?.resumeId ??
    rec?.summary?.matchId ??
    rec?.summary?.sessionId ??
    rec?.summary?.resumeId ??
    null;

  const payload =
    rec?.payload ??
    rec?.payloadRaw ??
    rec?.engineState?.payload ??
    rec?.payload?.payload ??
    null;

  const fromPayload =
    payload?.matchId ??
    payload?.sessionId ??
    payload?.resumeId ??
    payload?.summary?.matchId ??
    payload?.summary?.sessionId ??
    payload?.engineState?.matchId ??
    payload?.engineState?.sessionId ??
    null;

  const fromEngine =
    rec?.engineState?.matchId ??
    rec?.engineState?.sessionId ??
    rec?.payload?.engineState?.matchId ??
    rec?.payload?.engineState?.sessionId ??
    null;

  const v = direct ?? fromPayload ?? fromEngine ?? null;
  if (!v) return null;

  const s = String(v);
  return s.length ? s : null;
}

/* =========================
   IndexedDB helpers
========================= */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      // créer le store si besoin
      let os: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE)) {
        os = db.createObjectStore(STORE, { keyPath: "id" });
      } else {
        os = req.transaction!.objectStore(STORE);
      }
      // créer l’index by_updatedAt si manquant
      try {
        // @ts-ignore
        if (!os.indexNames || !os.indexNames.contains("by_updatedAt")) {
          os.createIndex("by_updatedAt", "updatedAt", { unique: false });
        }
      } catch {
        try {
          os.createIndex("by_updatedAt", "updatedAt", { unique: false });
        } catch {}
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const st = tx.objectStore(STORE);
    Promise.resolve(fn(st))
      .then((v) => {
        tx.oncomplete = () => resolve(v as T);
        tx.onerror = () => reject(tx.error);
      })
      .catch(reject);
  });
}

/* =========================
   Migration depuis localStorage (une seule fois)
========================= */
let migrDone = false;
async function migrateFromLocalStorageOnce() {
  if (migrDone) return;
  migrDone = true;
  try {
    const raw = localStorage.getItem(LSK);
    if (!raw) return;

    // ✅ FIX: legacy peut être JSON OU compressé (parse robuste)
    const rows: SavedMatch[] = readLegacyRowsSafe();
    if (!rows.length) {
      // rien de lisible => on ne migre pas, mais on évite de casser l’app
      return;
    }

    await withStore("readwrite", async (st) => {
      for (const r of rows) {
        const rec: any = { ...r };
        const payloadStr = rec.payload ? JSON.stringify(rec.payload) : "";
        const payloadCompressed = payloadStr
          ? LZString.compressToUTF16(payloadStr)
          : "";
        delete rec.payload;
        rec.payloadCompressed = payloadCompressed;
        await new Promise<void>((res, rej) => {
          const req = st.put(rec);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        });
      }
    });

    localStorage.removeItem(LSK);
    console.info("[history] migration depuis localStorage effectuée");
  } catch (e) {
    console.warn("[history] migration impossible:", e);
  }
}

/* =========================
   Lectures
========================= */
export async function list(): Promise<SavedMatch[]> {
  await migrateFromLocalStorageOnce();
  try {
    const rows: any[] = await withStore("readonly", async (st) => {
      // Essai via l’index (ordre décroissant)
      const readWithIndex = async () =>
        await new Promise<any[]>((resolve, reject) => {
          try {
            // @ts-ignore
            const hasIndex =
              st.indexNames && st.indexNames.contains("by_updatedAt");
            if (!hasIndex) throw new Error("no_index");
            const ix = st.index("by_updatedAt");
            const req = ix.openCursor(undefined, "prev");
            const out: any[] = [];
            req.onsuccess = () => {
              const cur = req.result as IDBCursorWithValue | null;
              if (cur) {
                const val = { ...cur.value };
                // ⚠️ on garde payloadCompressed en mémoire uniquement pour permettre la dédup si besoin,
                // mais on le supprime ensuite lors de la sortie finale.
                out.push(val);
                cur.continue();
              } else resolve(out);
            };
            req.onerror = () => reject(req.error);
          } catch (e) {
            reject(e);
          }
        });

      // Fallback : lecture du store brut + tri mémoire
      const readWithoutIndex = async () =>
        await new Promise<any[]>((resolve, reject) => {
          const req = st.openCursor();
          const out: any[] = [];
          req.onsuccess = () => {
            const cur = req.result as IDBCursorWithValue | null;
            if (cur) {
              const val = { ...cur.value };
              out.push(val);
              cur.continue();
            } else {
              out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
              resolve(out);
            }
          };
          req.onerror = () => reject(req.error);
        });

      try {
        return await readWithIndex();
      } catch {
        return await readWithoutIndex();
      }
    });

    // ✅ NEW: dédoublonnage "1 match = 1 entrée"
    // (corrige les anciens historiques qui ont 1 record par joueur en MULTI)
    const byMatch = new Map<string, any>();

    for (const r0 of rows || []) {
      const r: any = r0;
      if (!r) continue;

      // 1) clé directe si déjà stockée
      let key = getCanonicalMatchId(r) ?? String(r?.matchId ?? "");

      // 2) si pas trouvé et que payloadCompressed existe, on tente un peek "best effort"
      // (on évite de parser tout le payload lourd en temps normal; ici c’est rare mais ça sauve des vieux matchs)
      if (!key && r?.payloadCompressed && typeof r.payloadCompressed === "string") {
        try {
          const dec = LZString.decompressFromUTF16(r.payloadCompressed);
          if (dec && typeof dec === "string" && dec.length) {
            const payload = JSON.parse(dec);
            key =
              getCanonicalMatchId({ ...r, payload }) ??
              payload?.matchId ??
              payload?.sessionId ??
              null;
          }
        } catch {}
      }

      // 3) fallback ultime
      if (!key) key = String(r?.id ?? "");
      if (!key) continue;

      const existing = byMatch.get(key);
      if (!existing) {
        const lite = { ...r, id: key, matchId: key };
        delete (lite as any).payloadCompressed;
        byMatch.set(key, lite);
      } else {
        const tNew = (r as any)?.updatedAt ?? (r as any)?.createdAt ?? 0;
        const tOld =
          (existing as any)?.updatedAt ?? (existing as any)?.createdAt ?? 0;
        if (tNew >= tOld) {
          const lite = { ...r, id: key, matchId: key };
          delete (lite as any).payloadCompressed;
          byMatch.set(key, lite);
        }
      }
    }

    return Array.from(byMatch.values()) as SavedMatch[];
  } catch {
    // ✅ FIX: fallback legacy robuste (JSON / UTF16 / base64-ish)
    return readLegacyRowsSafe();
  }
}

export async function get(id: string): Promise<SavedMatch | null> {
  await migrateFromLocalStorageOnce();
  try {
    const rec: any = await withStore("readonly", async (st) => {
      return await new Promise<any>((resolve, reject) => {
        const req = st.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });

    if (!rec) {
      // ✅ FIX: fallback legacy robuste
      const rows = readLegacyRowsSafe();
      return (rows.find((r) => r.id === id) || null) as SavedMatch | null;
    }

    const payload =
      rec.payloadCompressed && typeof rec.payloadCompressed === "string"
        ? JSON.parse(
            LZString.decompressFromUTF16(rec.payloadCompressed) || "null"
          )
        : null;
    delete rec.payloadCompressed;

    // ✅ si on a un matchId dans payload, on le remonte en light
    const mid = getCanonicalMatchId({ ...rec, payload }) ?? null;
    if (mid) {
      rec.matchId = String(mid);
      rec.id = String(mid); // on autorise get() sur id canonique si stocké ainsi
    }

    return { ...(rec as any), payload } as SavedMatch;
  } catch (e) {
    console.warn("[history.get] fallback localStorage:", e);
    const rows = readLegacyRowsSafe();
    return (rows.find((r) => r.id === id) || null) as SavedMatch | null;
  }
}

/* =========================
   Écritures
========================= */
export async function upsert(rec: SavedMatch): Promise<void> {
  await migrateFromLocalStorageOnce();
  const now = Date.now();

  // ✅ FIX: id canonique (1 match MULTI = 1 record)
  const canonicalId =
    getCanonicalMatchId(rec) ?? rec.id ?? (crypto.randomUUID?.() ?? String(now));

  const safe: any = {
    id: String(canonicalId),
    matchId: String(canonicalId),
    kind: rec.kind || "x01",
    status: rec.status || "finished",
    players: rec.players || [],
    winnerId: rec.winnerId ?? null,
    createdAt: rec.createdAt ?? now,
    updatedAt: now,
    summary: rec.summary || null,
    // payload compressé séparé (IDB)
  };

  // ---------------------------------------------
  // 🎯 Intégration Cricket : calcul auto legStats
  // ---------------------------------------------
  let payloadEffective = rec.payload;

  try {
    if (
      rec.kind === "cricket" &&
      rec.payload &&
      typeof rec.payload === "object"
    ) {
      const base = rec.payload as any;
      const players = Array.isArray(base.players) ? base.players : [];

      const playersWithStats = players.map((p: any) => {
        const hits: CricketHit[] = Array.isArray(p.hits) ? p.hits : [];
        // si legStats déjà fourni, on le garde, sinon on calcule
        const legStats =
          p.legStats && typeof p.legStats === "object"
            ? p.legStats
            : computeCricketLegStats(hits);
        return { ...p, hits, legStats };
      });

      payloadEffective = {
        ...base,
        mode: base.mode ?? "cricket",
        players: playersWithStats,
      };
    }
  } catch (e) {
    console.warn("[history.upsert] cricket enrichment error:", e);
  }

  // ---------------------------------------------
  // 🎯 Intégration X01 : expose startScore pour l'UI
  // ---------------------------------------------
  try {
    if (
      rec.kind === "x01" &&
      payloadEffective &&
      typeof payloadEffective === "object"
    ) {
      const base = payloadEffective as any;

      // tentative multi-chemins pour trouver la config X01
      const cfg =
        base.config ||
        base.game?.config ||
        base.x01?.config ||
        base.match?.config ||
        base.x01Config;

      if (cfg) {
        const sc =
          cfg.startScore ??
          cfg.start ??
          cfg.x01StartScore ??
          cfg.x01Start ??
          cfg.startingScore;

        if (typeof sc === "number" && sc > 0) {
          // game.* pour les listes (HistoryPage)
          safe.game = {
            ...(safe.game || {}),
            mode: safe.kind || rec.kind || "x01",
            startScore: sc,
          };

          const prevSummary: any = safe.summary || {};
          safe.summary = {
            ...prevSummary,
            game: {
              ...(prevSummary.game || {}),
              startScore: sc,
            },
          };
        }
      }

      // si le payload contient déjà un summary / result, on le propage
      if (base.summary && typeof base.summary === "object") {
        const prevSummary: any = safe.summary || {};
        safe.summary = {
          ...base.summary,
          ...prevSummary,
        };
      } else if (base.result && typeof base.result === "object") {
        const prevSummary: any = safe.summary || {};
        safe.summary = {
          ...prevSummary,
          result: {
            ...(prevSummary.result || {}),
            ...base.result,
          },
        };
      }

      // ✅ essaye d’y stocker un matchId/sessionId léger pour la dédup future
      const mid =
        getCanonicalMatchId({ ...rec, payload: payloadEffective }) ??
        base?.matchId ??
        base?.sessionId ??
        base?.engineState?.sessionId ??
        base?.engineState?.matchId ??
        null;
      if (mid) safe.matchId = String(mid);
    }
  } catch (e) {
    console.warn("[history.upsert] x01 enrichment error:", e);
  }

  try {
    const payloadStr = payloadEffective ? JSON.stringify(payloadEffective) : "";
    const payloadCompressed = payloadStr
      ? LZString.compressToUTF16(payloadStr)
      : "";

    await withStore("readwrite", async (st) => {
      // Limiter à MAX_ROWS (par ordre décroissant de updatedAt)
      await new Promise<void>((resolve, reject) => {
        const doTrim = (keys: string[]) => {
          if (keys.length > MAX_ROWS) {
            const toDelete = keys.slice(MAX_ROWS);
            let pending = toDelete.length;
            if (!pending) return resolve();
            toDelete.forEach((k) => {
              const del = st.delete(k);
              del.onsuccess = () => {
                if (--pending === 0) resolve();
              };
              del.onerror = () => {
                if (--pending === 0) resolve();
              };
            });
          } else resolve();
        };

        try {
          // @ts-ignore
          const hasIndex =
            st.indexNames && st.indexNames.contains("by_updatedAt");
          if (hasIndex) {
            const ix = st.index("by_updatedAt");
            const req = ix.openCursor(undefined, "prev");
            const keys: string[] = [];
            req.onsuccess = () => {
              const cur = req.result as IDBCursorWithValue | null;
              if (cur) {
                keys.push(cur.primaryKey as string);
                cur.continue();
              } else doTrim(keys);
            };
            req.onerror = () => reject(req.error);
          } else {
            const req = st.openCursor();
            const rows: any[] = [];
            req.onsuccess = () => {
              const cur = req.result as IDBCursorWithValue | null;
              if (cur) {
                rows.push(cur.value);
                cur.continue();
              } else {
                rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                doTrim(rows.map((r) => r.id));
              }
            };
            req.onerror = () => reject(req.error);
          }
        } catch {
          resolve(); // en cas de doute, on ne coupe rien
        }
      });

      const putReq = st.put({ ...safe, payloadCompressed });
      await new Promise<void>((resolve, reject) => {
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    });
  } catch (e) {
    // Fallback compact si IDB indispo
    console.warn("[history.upsert] fallback localStorage (IDB indispo?):", e);
    try {
      // ✅ FIX: parse robuste (évite crash si LSK est compressé/illisible)
      const rows: any[] = readLegacyRowsSafe();
      const idx = rows.findIndex((r) => r.id === safe.id);
      const trimmed = { ...safe, payload: null }; // compact
      if (idx >= 0) rows.splice(idx, 1);
      rows.unshift(trimmed);
      while (rows.length > 120) rows.pop();
      localStorage.setItem(LSK, JSON.stringify(rows));
    } catch {}
  }
}

export async function remove(id: string): Promise<void> {
  await migrateFromLocalStorageOnce();
  try {
    await withStore("readwrite", (st) => {
      return new Promise<void>((resolve, reject) => {
        const req = st.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    // fallback
    try {
      const rows = readLegacyRowsSafe() as any[];
      const out = rows.filter((r) => r.id !== id);
      localStorage.setItem(LSK, JSON.stringify(out));
    } catch {}
  }
}

export async function clear(): Promise<void> {
  await migrateFromLocalStorageOnce();
  try {
    await withStore("readwrite", (st) => {
      return new Promise<void>((resolve, reject) => {
        const req = st.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    try {
      localStorage.removeItem(LSK);
    } catch {}
  }
}

/* =========================
   Cache léger synchrone (pour UI legacy)
========================= */
type _LightRow = Omit<SavedMatch, "payload">;

const LSK_CACHE = "dc-history-cache-v1";
let __cache: _LightRow[] = (() => {
  try {
    const txt = localStorage.getItem(LSK_CACHE);
    return txt ? (JSON.parse(txt) as _LightRow[]) : [];
  } catch {
    return [];
  }
})();
function _saveCache() {
  try {
    localStorage.setItem(LSK_CACHE, JSON.stringify(__cache));
  } catch {}
}

async function _hydrateCacheFromList() {
  try {
    const rows = await list();
    __cache = rows.map((r: any) => {
      const { payload, ...lite } = r || {};
      return lite;
    });
    _saveCache();
  } catch {}
}

function _applyUpsertToCache(rec: SavedMatch) {
  const cid = getCanonicalMatchId(rec) ?? (rec as any)?.matchId ?? rec.id;
  const { payload, ...lite0 } = (rec as any) || {};
  const lite = { ...lite0, id: String(cid), matchId: String(cid) } as _LightRow;

  __cache = [lite, ...__cache.filter((r) => r.id !== lite.id)];
  if (__cache.length > MAX_ROWS) __cache.length = MAX_ROWS;
  _saveCache();
}

function _applyRemoveToCache(id: string) {
  __cache = __cache.filter((r) => r.id !== id);
  _saveCache();
}
function _clearCache() {
  __cache = [];
  _saveCache();
}

function readAllSync(): _LightRow[] {
  return __cache.slice();
}

/* =========================
   Sélecteurs utilitaires
========================= */
async function listByStatus(
  status: "in_progress" | "finished"
): Promise<SavedMatch[]> {
  const rows = await list();
  return rows.filter((r) => r.status === status);
}
async function listInProgress(): Promise<SavedMatch[]> {
  return listByStatus("in_progress");
}
async function listFinished(): Promise<SavedMatch[]> {
  return listByStatus("finished");
}
async function getX01(id: string): Promise<SavedMatch | null> {
  const r = await get(id);
  return r && r.kind === "x01" ? r : null;
}

/* =========================
   Export objet unique History
========================= */
export const History = {
  // asynchrone
  async list() {
    const rows = await list();
    __cache = rows.map((r: any) => {
      const { payload, ...lite } = r || {};
      return lite;
    });
    _saveCache();
    return rows;
  },
  get,
  async upsert(rec: SavedMatch) {
    await upsert(rec);
    _applyUpsertToCache(rec); // cache en id canonique
  },
  async remove(id: string) {
    await remove(id);
    _applyRemoveToCache(id);
  },
  async clear() {
    await clear();
    _clearCache();
  },

  // sélecteurs utilitaires
  listByStatus,
  listInProgress,
  listFinished,
  getX01,

  // synchrone (legacy UI)
  readAll: readAllSync,
};

// Première hydration du cache
if (!__cache.length) {
  _hydrateCacheFromList();
}
