// =============================================================
// src/lib/tournaments/storeLocal.ts
// Stockage TOURNOIS LOCAL -> IndexedDB (anti QuotaExceededError)
// - API sync côté UI via cache mémoire (chargement async au boot)
// - Migration automatique depuis localStorage:
//   - dc_tournaments_v1
//   - dc_tournament_matches_v1:<id>  / dc_tournament_matches_<id> (best effort)
// =============================================================

type AnyObj = any;

const LS_TOURNAMENTS = "dc_tournaments_v1";

// Matches (legacy keys possibles)
const lsMatchesKeyCandidates = (id: string) => [
  `dc_tournament_matches_v1:${id}`,
  `dc_tournament_matches_${id}`,
  `dc_tournament_${id}_matches`,
];

const DB_NAME = "dc_tournaments_db_v1";
const DB_VER = 1;
const STORE_T = "tournaments";
const STORE_M = "matchesByTournament";

// ---------------------- IDB tiny wrapper ----------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_T)) db.createObjectStore(STORE_T, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_M)) db.createObjectStore(STORE_M, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(storeName: string): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const st = tx.objectStore(storeName);
    const req = st.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbGet(storeName: string, key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const st = tx.objectStore(storeName);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut(storeName: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const st = tx.objectStore(storeName);
    const req = st.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const st = tx.objectStore(storeName);
    const req = st.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ---------------------- Cache mémoire (API sync) ----------------------

let loaded = false;
let loadingPromise: Promise<void> | null = null;

let cacheTournaments: AnyObj[] = [];
let cacheMatchesByTid: Record<string, AnyObj[]> = {};

function safeParseJSON(raw: string | null): any {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function migrateFromLocalStorageIfNeeded() {
  // Tournois
  const rawTours = localStorage.getItem(LS_TOURNAMENTS);
  const tours = safeParseJSON(rawTours);
  if (Array.isArray(tours) && tours.length) {
    // push en IDB
    await Promise.all(tours.map((t: any) => idbPut(STORE_T, t)));

    // matches best effort
    for (const t of tours) {
      const tid = String(t?.id || "");
      if (!tid) continue;

      let matches: any[] | null = null;
      for (const k of lsMatchesKeyCandidates(tid)) {
        const m = safeParseJSON(localStorage.getItem(k));
        if (Array.isArray(m)) {
          matches = m;
          break;
        }
      }
      if (matches) {
        await idbPut(STORE_M, { id: tid, matches });
      }
    }

    // cleanup localStorage (libère quota)
    try {
      localStorage.removeItem(LS_TOURNAMENTS);
      for (const t of tours) {
        const tid = String(t?.id || "");
        for (const k of lsMatchesKeyCandidates(tid)) localStorage.removeItem(k);
      }
    } catch {}
  }
}

async function ensureLoaded() {
  if (loaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await migrateFromLocalStorageIfNeeded();

      const tours = await idbGetAll(STORE_T);
      cacheTournaments = Array.isArray(tours) ? tours : [];

      // matches: on ne charge pas tout d’un coup, lazy par tournoi
      cacheMatchesByTid = {};
    } catch (e) {
      console.error("[tournaments/storeLocal] load failed:", e);
      cacheTournaments = [];
      cacheMatchesByTid = {};
    } finally {
      loaded = true;
    }
  })();

  return loadingPromise;
}

// Lance le chargement ASAP (sans bloquer)
void ensureLoaded();

// ---------------------- Public API (sync-friendly) ----------------------

export function listTournamentsLocal(): AnyObj[] {
  // déclenche le load si pas prêt
  void ensureLoaded();
  return cacheTournaments.slice().sort((a, b) => Number(b?.updatedAt || b?.createdAt || 0) - Number(a?.updatedAt || a?.createdAt || 0));
}

export function upsertTournamentLocal(tour: AnyObj) {
  void ensureLoaded();

  const t = { ...(tour || {}) };
  const now = Date.now();
  if (!t.id) t.id = `tour-${now}-${Math.random().toString(36).slice(2, 8)}`;
  if (!t.createdAt) t.createdAt = now;
  t.updatedAt = now;

  const idx = cacheTournaments.findIndex((x) => String(x?.id) === String(t.id));
  if (idx >= 0) cacheTournaments[idx] = t;
  else cacheTournaments.unshift(t);

  // persist async
  void idbPut(STORE_T, t).catch((e) => console.error("[tournaments] idbPut tournament failed:", e));

  return t;
}

export function deleteTournamentLocal(tournamentId: string) {
  void ensureLoaded();

  const tid = String(tournamentId || "");
  cacheTournaments = cacheTournaments.filter((t) => String(t?.id) !== tid);
  delete cacheMatchesByTid[tid];

  void idbDelete(STORE_T, tid).catch((e) => console.error("[tournaments] idbDelete tournament failed:", e));
  void idbDelete(STORE_M, tid).catch((e) => console.error("[tournaments] idbDelete matches failed:", e));
}

export function listMatchesForTournamentLocal(tournamentId: string): AnyObj[] {
  void ensureLoaded();

  const tid = String(tournamentId || "");
  if (!tid) return [];

  // cache déjà chargé
  if (Array.isArray(cacheMatchesByTid[tid])) return cacheMatchesByTid[tid].slice();

  // lazy load async (UI verra la liste vide au premier rendu, puis refresh() la fera ré-apparaitre)
  void (async () => {
    try {
      const rec = await idbGet(STORE_M, tid);
      const matches = Array.isArray(rec?.matches) ? rec.matches : [];
      cacheMatchesByTid[tid] = matches;
    } catch (e) {
      console.error("[tournaments] load matches failed:", e);
      cacheMatchesByTid[tid] = [];
    }
  })();

  return [];
}

export function saveMatchesForTournamentLocal(tournamentId: string, matches: AnyObj[]) {
  void ensureLoaded();

  const tid = String(tournamentId || "");
  if (!tid) return;

  const list = Array.isArray(matches) ? matches : [];
  cacheMatchesByTid[tid] = list;

  void idbPut(STORE_M, { id: tid, matches: list }).catch((e) =>
    console.error("[tournaments] idbPut matches failed:", e)
  );
}
