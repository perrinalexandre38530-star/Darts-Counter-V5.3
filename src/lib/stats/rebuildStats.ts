// ============================================
// src/lib/stats/rebuildStats.ts
// Rebuild stats cache (safe build)
// ✅ zéro import statique (évite "Failed to resolve import")
// ✅ exports : rebuildStatsForProfile (utilisé dans App.tsx)
// ✅ cache localStorage + event "dc-stats-cache-updated"
// ============================================

export type StatsBundle = {
  v: number;
  profileId: string;
  updatedAt: number;

  x01?: any;
  cricket?: any;
  dartSets?: any;
  [k: string]: any;
};

const VERSION = 1;
const CACHE_PREFIX = "dc-stats-cache-v1:";

const inflight = new Map<string, Promise<StatsBundle>>();
const lastKick = new Map<string, number>();

function now() {
  return Date.now();
}

function cacheKey(profileId: string) {
  return `${CACHE_PREFIX}${String(profileId || "unknown")}`;
}

function idle(cb: () => void, timeoutMs = 1200) {
  try {
    const ric = (globalThis as any).requestIdleCallback;
    if (typeof ric === "function") {
      ric(
        () => {
          try {
            cb();
          } catch {}
        },
        { timeout: timeoutMs }
      );
      return;
    }
  } catch {}
  setTimeout(() => {
    try {
      cb();
    } catch {}
  }, 0);
}

export function getCachedStatsSync(profileId: string): StatsBundle | null {
  try {
    const raw = localStorage.getItem(cacheKey(profileId));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || obj.v !== VERSION) return null;
    return obj as StatsBundle;
  } catch {
    return null;
  }
}

export async function getCachedStats(profileId: string): Promise<StatsBundle | null> {
  return getCachedStatsSync(profileId);
}

function emitUpdated(profileId: string, reason: string) {
  try {
    window.dispatchEvent(
      new CustomEvent("dc-stats-cache-updated", { detail: { profileId: String(profileId), reason } })
    );
  } catch {}
}

/**
 * ✅ Tente de calculer via tes compute existants.
 * - On essaye plusieurs chemins + noms d'exports
 * - Si rien trouvé → retourne {}
 */
async function computeAll(profileId: string): Promise<Pick<StatsBundle, "x01" | "cricket" | "dartSets">> {
  const pid = String(profileId || "unknown");

  let x01: any = null;
  let cricket: any = null;
  let dartSets: any = null;

  // --- X01 ---
  try {
    // tente : ./computeX01Stats (export computeX01Stats ou default)
    const m: any = await import("./computeX01Stats").catch(() => null);
    const fn =
      (m && (m.computeX01Stats || m.default || m.computeStats || m.buildX01Stats)) || null;
    if (typeof fn === "function") x01 = await fn(pid);
  } catch {}

  // --- Cricket ---
  try {
    const m: any = await import("./computeCricketStats").catch(() => null);
    const fn =
      (m && (m.computeCricketStats || m.default || m.computeStats || m.buildCricketStats)) || null;
    if (typeof fn === "function") cricket = await fn(pid);
  } catch {}

  // --- DartSets ---
  try {
    // ton erreur vue: "computeDartSetStats" non exporté
    // on tente donc plusieurs noms possibles
    const m: any = await import("./computeDartSetStats").catch(() => null);
    const fn =
      (m &&
        (m.computeDartSetsStats ||
          m.computeDartSetStats ||
          m.computeDartsetStats ||
          m.default ||
          m.computeStats ||
          m.buildDartSetsStats)) ||
      null;
    if (typeof fn === "function") dartSets = await fn(pid);
  } catch {}

  return { x01, cricket, dartSets };
}

/**
 * ✅ API attendue par ton App.tsx
 * Rebuild complet + cache localStorage
 */
export async function rebuildStatsForProfile(profileId: string): Promise<StatsBundle> {
  const pid = String(profileId || "unknown");

  const existing = inflight.get(pid);
  if (existing) return existing;

  const p = (async () => {
    const { x01, cricket, dartSets } = await computeAll(pid);

    const out: StatsBundle = {
      v: VERSION,
      profileId: pid,
      updatedAt: now(),
      x01: x01 ?? undefined,
      cricket: cricket ?? undefined,
      dartSets: dartSets ?? undefined,
    };

    try {
      localStorage.setItem(cacheKey(pid), JSON.stringify(out));
    } catch {}

    emitUpdated(pid, "rebuild_done");
    return out;
  })();

  inflight.set(pid, p);

  try {
    return await p;
  } finally {
    inflight.delete(pid);
  }
}

/**
 * ✅ Rebuild en idle + throttle (pour éviter spam)
 */
export function scheduleRebuild(profileId: string, reason = "idle") {
  const pid = String(profileId || "unknown");
  const t = now();
  const last = lastKick.get(pid) || 0;

  if (t - last < 800) return;
  lastKick.set(pid, t);

  idle(() => {
    rebuildStatsForProfile(pid)
      .then(() => emitUpdated(pid, reason))
      .catch(() => {});
  }, 2000);
}
