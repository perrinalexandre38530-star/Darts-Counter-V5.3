// ============================================
// src/App.tsx — Navigation + wiring propre (v5 sécurisé)
// Fix: "Lancer partie" n'affiche plus la dernière reprise
// + Intégration pages Training (menu / play / stats)
// + X01Play V3 en parallèle du X01 actuel
// + Stats : bouton menu => StatsShell (menu), puis StatsHub (détails)
// + Stats Online : StatsOnline (détails ONLINE)
// + Stats Cricket : StatsCricket (vue dédiée Cricket)
// + SyncCenter : export/import des stats locales
// + Account bridge : au premier lancement sans profil actif,
//   on redirige vers Profils > Mon profil (connexion / création compte).
// ============================================
import React from "react";
import BottomNav from "./components/BottomNav";

// Persistance (IndexedDB via storage.ts)
import { loadStore, saveStore } from "./lib/storage";
// OPFS / StorageManager — demande la persistance une fois au boot
import { ensurePersisted } from "./lib/deviceStore";
// 🔒 Garde-fou localStorage (purge legacy si trop plein)
import { purgeLegacyLocalStorageIfNeeded } from "./lib/storageQuota";

// 🚀 warmUp lite aggregator
import { warmAggOnce } from "./boot/warmAgg";

// Mode Online
import { onlineApi } from "./lib/onlineApi";

// Types
import type { Store, Profile, MatchRecord } from "./lib/types";
import type { X01ConfigV3 as X01ConfigV3Type } from "./types/x01v3";

// Pages
import Home from "./pages/Home";
import Games from "./pages/Games";
import Profiles from "./pages/Profiles";
import FriendsPage from "./pages/FriendsPage";
import Settings from "./pages/Settings";
import X01Setup from "./pages/X01Setup";
import X01Play from "./pages/X01Play";
import X01OnlineSetup from "./pages/X01OnlineSetup";
import CricketPlay from "./pages/CricketPlay";
import KillerPlay from "./pages/KillerPlay";
import ShanghaiPlay from "./pages/ShanghaiPlay";
import LobbyPick from "./pages/LobbyPick";
import X01End from "./pages/X01End";
import AvatarCreator from "./pages/AvatarCreator";
import ProfilesBots from "./pages/ProfilesBots";

import TrainingMenu from "./pages/TrainingMenu";
import TrainingX01Play from "./pages/TrainingX01Play";
import TrainingClock from "./pages/TrainingClock";

// Historique
import { History } from "./lib/history";

// Stats pages
import StatsShell from "./pages/StatsShell";
import StatsHub from "./pages/StatsHub";
import StatsOnline from "./pages/StatsOnline";
import StatsCricket from "./pages/StatsCricket";

// X01 V3
import X01ConfigV3 from "./pages/X01ConfigV3";
import X01PlayV3 from "./pages/X01PlayV3";

// 🌟 Nouveau : SYNC / Partage stats locales
import SyncCenter from "./pages/SyncCenter";

// Contexts
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./contexts/LangContext";
import { AuthOnlineProvider } from "./hooks/useAuthOnline";

// Dev helper
import { installHistoryProbe } from "./dev/devHistoryProbe";
if (import.meta.env.DEV) installHistoryProbe();

/* --- helpers --- */

function withAvatars(rec: any, profiles: any[]) {
  const get = (arr: any[]) =>
    (arr || []).map((p: any) => {
      const prof = profiles.find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

  const players =
    rec?.players?.length ? rec.players : rec?.payload?.players || [];
  const filled = get(players);

  return {
    ...rec,
    players: filled,
    payload: { ...(rec?.payload || {}), players: filled },
  };
}

/* --------------------------------------------
   ROUTES
-------------------------------------------- */
type Tab =
  | "home"
  | "games"
  | "profiles"
  | "profiles_bots"
  | "friends"
  | "settings"
  | "stats"
  | "statsHub"
  | "stats_online"
  | "cricket_stats"
  | "statsDetail"
  | "x01setup"
  | "x01_online_setup"
  | "x01"
  | "x01_end"
  | "cricket"
  | "killer"
  | "shanghai"
  | "training"
  | "training_x01"
  | "training_stats"
  | "training_clock"
  | "avatar"
  | "x01_config_v3"
  | "x01_play_v3"
  // ⭐ nouveau onglet
  | "sync_center";

/* redirect TrainingStats → StatsHub */
function RedirectToStatsTraining({
  go,
}: {
  go: (tab: Tab, params?: any) => void;
}) {
  React.useEffect(() => {
    go("statsHub", { tab: "training" });
  }, [go]);
  return null;
}

function StatsDetailRoute({ store, go, params }: any) {
  const [rec, setRec] = React.useState<any>(() => {
    if (params?.rec) {
      return withAvatars(params.rec, store.profiles || []);
    }
    const fromMem = (store.history || []).find(
      (r: any) => r.id === params?.matchId
    );
    return fromMem ? withAvatars(fromMem, store.profiles || []) : null;
  });

  const matchId: string | undefined = params?.matchId;

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!matchId) return;
      try {
        const byId = await (History as any)?.get?.(matchId);
        if (alive && byId) {
          setRec(withAvatars(byId, store.profiles || []));
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [matchId, store.profiles]);

  if (params?.showEnd && rec) {
    return (
      <X01End
        go={go}
        params={{
          matchId: rec.id,
          resumeId: rec.resumeId ?? rec.payload?.resumeId,
          showEnd: true,
        }}
      />
    );
  }

  if (rec) {
    const when = Number(rec.updatedAt ?? rec.createdAt ?? Date.now());
    const dateStr = new Date(when).toLocaleString();
    const players = Array.isArray(rec.players) ? rec.players : [];
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => go("statsHub", { tab: "history" })}>
          ← Retour
        </button>
        <h2>
          {(rec.kind || "MATCH").toUpperCase()} — {dateStr}
        </h2>
        <div style={{ opacity: 0.85 }}>
          Joueurs : {players.map((p) => p.name).join(" · ")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => go("statsHub", { tab: "history" })}>
        ← Retour
      </button>
      {matchId ? "Chargement..." : "Aucune donnée"}
    </div>
  );
}

/* --------------------------------------------
   STORE INITIAL
-------------------------------------------- */
const initialStore: Store = {
  profiles: [],
  activeProfileId: null,
  friends: [],
  selfStatus: "online" as any,
  settings: {
    defaultX01: 501,
    doubleOut: true,
    randomOrder: false,
    lang: "fr",
    ttsOnThird: false,
    neonTheme: true,
  } as any,
  history: [],
} as any;

/* --------------------------------------------
   Préférences X01 par profil actif
-------------------------------------------- */
function getX01DefaultStart(store: Store): 301 | 501 | 701 | 901 {
  const profiles = store.profiles ?? [];
  const active =
    profiles.find((p) => p.id === store.activeProfileId) ?? null;

  const settingsDefault =
    (store.settings.defaultX01 as 301 | 501 | 701 | 901) || 501;

  if (!active) {
    return settingsDefault;
  }

  const pi = ((active as any).privateInfo || {}) as {
    prefX01StartScore?: number;
    prefAutoApplyPrefs?: boolean;
  };

  // Si l’auto-apply n’est pas activé → on reste sur le réglage global
  if (!pi.prefAutoApplyPrefs) {
    return settingsDefault;
  }

  const pref = Number(pi.prefX01StartScore ?? 0);
  const allowed: (301 | 501 | 701 | 901)[] = [301, 501, 701, 901];

  if (allowed.includes(pref as any)) {
    return pref as 301 | 501 | 701 | 901;
  }

  return settingsDefault;
}

/* BOTS LS */
const LS_BOTS_KEY = "dc_bots_v1";

/* ONLINE mirror LS (comme FriendsPage / StatsOnline) */
const LS_ONLINE_MATCHES_KEY = "dc_online_matches_v1";

type BotLS = {
  id: string;
  name: string;
  avatarSeed?: string;
  avatarDataUrl?: string | null;
  [k: string]: any;
};

function loadBotsLS(): BotLS[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    return raw ? (JSON.parse(raw) as BotLS[]) : [];
  } catch {
    return [];
  }
}

function saveBotsLS(list: BotLS[]) {
  try {
    localStorage.setItem(LS_BOTS_KEY, JSON.stringify(list));
  } catch {}
}

/* Service Worker banner */
function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] =
    React.useState<ServiceWorker | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);

  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(newWorker);
            setShowPrompt(true);
          }
        });
      });
    });
  }, []);

  function updateNow() {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    setShowPrompt(false);
  }

  return { showPrompt, updateNow, dismiss: () => setShowPrompt(false) };
}

function SWUpdateBanner() {
  const { showPrompt, updateNow, dismiss } = useServiceWorkerUpdate();
  if (!showPrompt) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(20,20,20,.9)",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 12,
        boxShadow: "0 0 15px rgba(0,0,0,.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span>🔄 Nouvelle version disponible</span>
      <button
        onClick={updateNow}
        style={{
          background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
          color: "#000",
          border: "none",
          borderRadius: 8,
          padding: "6px 10px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Recharger
      </button>
      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          color: "#aaa",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
        title="Ignorer"
      >
        ✕
      </button>
    </div>
  );
}

/* --------------------------------------------
                APP
-------------------------------------------- */
function App() {
  const [store, setStore] = React.useState<Store>(initialStore);
  const [tab, setTab] = React.useState<Tab>("home");
  const [routeParams, setRouteParams] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  /* Boot: persistance + nettoyage localStorage + warm-up */
  React.useEffect(() => {
    // Demande de persistance (IndexedDB / OPFS si possible)
    ensurePersisted().catch(() => {});

    // 🔒 Nettoyage localStorage si trop plein / legacy
    purgeLegacyLocalStorageIfNeeded();

    // Warm-up agrégateur (stats lite)
    try {
      warmAggOnce();
    } catch {}
  }, []);

  /* Restore online session (pour Supabase côté SDK) */
  React.useEffect(() => {
    onlineApi.restoreSession().catch(() => {});
  }, []);

  /* expose store globally for debug */
  React.useEffect(() => {
    (window as any).__appStore = store;
  }, [store]);

  /* X01 v1 config */
  const [x01Config, setX01Config] = React.useState<any>(null);

  /* X01 v3 config */
  const [x01ConfigV3, setX01ConfigV3] =
    React.useState<X01ConfigV3Type | null>(null);

  /* Navigation */
  function go(next: Tab, params?: any) {
    setRouteParams(params ?? null);
    setTab(next);
  }

  /* Load store from IDB at boot + gate "Se connecter / Créer un compte" */
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadStore<Store>();

        let base: Store;
        if (saved) {
          base = {
            ...initialStore,
            ...saved,
            profiles: saved.profiles ?? [],
            friends: saved.friends ?? [],
            history: saved.history ?? [],
          };
        } else {
          base = { ...initialStore };
        }

        if (mounted) {
          setStore(base);

          const hasProfiles = (base.profiles ?? []).length > 0;
          const hasActive = !!base.activeProfileId;

          // 🔐 Si aucun profil actif (et généralement aucun profil),
          // on force le passage par Profils > "Mon profil"
          // avec le bloc UnifiedAuthBlock (connexion / création).
          if (!hasProfiles || !hasActive) {
            setRouteParams({ view: "me", autoCreate: true });
            setTab("profiles");
          } else {
            setTab("home");
          }
        }
      } catch {
        if (mounted) {
          setStore(initialStore);
          setTab("profiles");
          setRouteParams({ view: "me", autoCreate: true });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* Save store each time it changes */
  React.useEffect(() => {
    if (!loading) saveStore(store);
  }, [store, loading]);

  /* centralized update */
  function update(mut: (s: Store) => Store) {
    setStore((s) => {
      const next = mut({ ...s });
      queueMicrotask(() => saveStore(next));
      return next;
    });
  }

  /* Profiles mutator */
  function setProfiles(fn: (p: Profile[]) => Profile[]) {
    update((s) => ({ ...s, profiles: fn(s.profiles ?? []) }));
  }

  /* --------------------------------------------
      pushHistory (FIN DE PARTIE)
  -------------------------------------------- */
  function pushHistory(m: MatchRecord) {
    const now = Date.now();
    const id =
      (m as any)?.id ||
      (m as any)?.matchId ||
      `x01-${now}-${Math.random().toString(36).slice(2, 8)}`;

    const rawPlayers =
      (m as any)?.players ?? (m as any)?.payload?.players ?? [];
    const players = rawPlayers.map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? prof?.avatarDataUrl ?? null,
      };
    });

    const summary =
      (m as any)?.summary ?? (m as any)?.payload?.summary ?? null;

    const saved: any = {
      id,
      kind: (m as any)?.kind || "x01",
      status: "finished",
      players,
      winnerId:
        (m as any)?.winnerId || (m as any)?.payload?.winnerId || null,
      createdAt: (m as any)?.createdAt || now,
      updatedAt: now,
      summary,
      payload: { ...(m as any), players },
    };

    /* mémoire locale */
    update((s) => {
      const list = [...(s.history ?? [])];
      const i = list.findIndex((r: any) => r.id === saved.id);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      return { ...s, history: list };
    });

    /* Historique détaillé IDB */
    try {
      (History as any)?.upsert?.(saved);
    } catch {}

    /* miroir LocalStorage pour StatsOnline */
    try {
      const raw = localStorage.getItem(LS_ONLINE_MATCHES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: saved.id,
        mode: saved.kind,
        createdAt: saved.createdAt,
        finishedAt: saved.updatedAt,
        players: saved.players,
        winnerId: saved.winnerId,
        summary: saved.summary ?? null,
        stats: (saved.payload as any)?.stats ?? null,
      });
      localStorage.setItem(
        LS_ONLINE_MATCHES_KEY,
        JSON.stringify(list.slice(0, 200))
      );
    } catch {}

    /* upload online (best effort) */
    try {
      const supported = ["x01", "cricket", "killer", "shanghai"];
      if (supported.includes(saved.kind)) {
        onlineApi
          .uploadMatch({
            mode: saved.kind as any,
            payload: {
              summary: saved.summary ?? null,
              payload: saved.payload ?? null,
            },
            isTraining: false,
            startedAt: saved.createdAt,
            finishedAt: saved.updatedAt,
          })
          .catch(() => {});
      }
    } catch {}

    go("statsHub", { tab: "history" });
  }

  /* history formatted */
  const historyForUI = React.useMemo(
    () =>
      (store.history || []).map((r: any) =>
        withAvatars(r, store.profiles || [])
      ),
    [store.history, store.profiles]
  );

  /* --------------------------------------------
        ROUTING SWITCH
  -------------------------------------------- */

  let page: React.ReactNode = null;

  if (loading) {
    page = (
      <div className="container" style={{ padding: 40, textAlign: "center" }}>
        Chargement...
      </div>
    );
  } else {
    switch (tab) {
      case "home":
        page = (
          <Home
            store={store}
            update={update}
            go={go}
            onConnect={() =>
              go("profiles", { view: "me", autoCreate: true })
            }
          />
        );
        break;

      case "games":
        page = <Games setTab={(t: any) => go(t)} />;
        break;

      case "profiles":
        page = (
          <Profiles
            store={store}
            update={update}
            setProfiles={setProfiles}
            go={go}
            params={routeParams}
          />
        );
        break;

      case "profiles_bots":
        page = <ProfilesBots store={store} go={go} />;
        break;

      case "friends":
        page = <FriendsPage store={store} update={update} go={go} />;
        break;

      case "settings":
        page = <Settings go={go} />;
        break;

      /* ---------- STATS ---------- */
      case "stats":
        page = <StatsShell store={store} go={go} />;
        break;

      case "statsHub":
        page = (
          <StatsHub
            go={go}
            tab={(routeParams?.tab as any) ?? "stats"}
            memHistory={historyForUI}
            mode={routeParams?.mode}
            initialPlayerId={routeParams?.initialPlayerId ?? null}
            initialStatsSubTab={routeParams?.initialStatsSubTab}
            playerId={routeParams?.playerId ?? null}
          />
        );
        break;

      case "stats_online":
        page = <StatsOnline />;
        break;

      case "cricket_stats":
        page = (
          <StatsCricket
            profiles={store.profiles}
            activeProfileId={
              routeParams?.profileId ?? store.activeProfileId ?? null
            }
          />
        );
        break;

      case "statsDetail":
        page = (
          <StatsDetailRoute
            store={store}
            go={go}
            params={routeParams}
          />
        );
        break;

      /* ---------- SYNC / PARTAGE ---------- */
      case "sync_center":
        page = (
          <SyncCenter
            store={store}
            go={go}
            // profileId optionnel pour cibler un joueur précis
            profileId={routeParams?.profileId ?? null}
          />
        );
        break;

      /* ---------- X01 SETUP (v1) ---------- */
      case "x01setup":
        page = (
          <X01Setup
            profiles={store.profiles}
            defaults={{
              start: getX01DefaultStart(store),
              doubleOut: store.settings.doubleOut,
            }}
            onCancel={() => go("games")}
            onStart={(opts) => {
              const players = store.settings.randomOrder
                ? opts.playerIds.slice().sort(() => Math.random() - 0.5)
                : opts.playerIds;

              setX01Config({
                playerIds: players,
                start: opts.start,
                doubleOut: opts.doubleOut,
              });
              go("x01", { resumeId: null, fresh: Date.now() });
            }}
          />
        );
        break;

      /* ---------- X01 ONLINE SETUP (FULLWEB / Worker DO) ---------- */
      case "x01_online_setup":
        page = (
          <X01OnlineSetup
            store={store}
            go={go}
            params={routeParams}
          />
        );
        break;

      /* ---------- X01 PLAY (v1) ---------- */
      case "x01": {
        const isResume = !!routeParams?.resumeId;
        const isOnline = !!routeParams?.online;

        let effectiveConfig = x01Config;

        // Cas ONLINE lancé sans passer par X01Setup
        if (!effectiveConfig && isOnline && !isResume) {
          const activeProfile =
            store.profiles.find((p) => p.id === store.activeProfileId) ??
            store.profiles[0] ??
            null;

          const startDefault = getX01DefaultStart(store);

          const start =
            startDefault === 301 ||
            startDefault === 501 ||
            startDefault === 701 ||
            startDefault === 901
              ? startDefault
              : 501;

          effectiveConfig = {
            start,
            doubleOut: store.settings.doubleOut,
            playerIds: activeProfile ? [activeProfile.id] : [],
          };

          setX01Config(effectiveConfig);
        }

        if (!effectiveConfig && !isResume) {
          page = (
            <div className="container" style={{ padding: 16 }}>
              <button onClick={() => go("x01setup")}>← Retour</button>
              <p>Configuration X01 manquante.</p>
            </div>
          );
          break;
        }

        const rawStart =
          effectiveConfig?.start ?? getX01DefaultStart(store);

        const startClamped: 301 | 501 | 701 | 901 =
          rawStart >= 901 ? 901 : (rawStart as 301 | 501 | 701 | 901);

        const outMode = effectiveConfig?.doubleOut ? "double" : "simple";

        const playerIds = effectiveConfig?.playerIds ?? [];

        const freshToken = routeParams?.fresh ?? Date.now();
        const key = isResume
          ? `resume-${routeParams.resumeId}`
          : `fresh-${freshToken}`;

        page = (
          <X01Play
            key={key}
            profiles={store.profiles}
            playerIds={playerIds}
            start={startClamped}
            outMode={outMode}
            inMode="simple"
            params={isResume ? { resumeId: routeParams.resumeId } : undefined}
            onFinish={(m) => pushHistory(m)}
            onExit={() => (isOnline ? go("friends") : go("x01setup"))}
          />
        );
        break;
      }

      /* ---------- X01 V3 CONFIG ---------- */
      case "x01_config_v3":
        page = (
          <X01ConfigV3
            profiles={store.profiles}
            onBack={() => go("games")}
            onStart={(cfg) => {
              setX01ConfigV3(cfg);
              go("x01_play_v3", { fresh: Date.now() });
            }}
            go={go} // pour "Créer BOT"
          />
        );
        break;

      /* ---------- X01 V3 PLAY ---------- */
      case "x01_play_v3": {
        if (!x01ConfigV3) {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("x01_config_v3")}>← Retour</button>
              <p>Configuration X01 V3 manquante.</p>
            </div>
          );
          break;
        }

        const freshToken = routeParams?.fresh ?? Date.now();
        const key = `x01v3-${freshToken}`;

        page = (
          <X01PlayV3
            key={key}
            config={x01ConfigV3}
            onExit={() => go("x01_config_v3")}
            onReplayNewConfig={() => go("x01_config_v3")}
            onShowSummary={(matchId: string) =>
              go("statsDetail", { matchId, showEnd: true })
            }
          />
        );
        break;
      }

      /* ---------- X01 END ---------- */
      case "x01_end": {
        page = <X01End go={go} params={routeParams} />;
        break;
      }

      /* ---------- AUTRES JEUX ---------- */
      case "cricket": {
        page = (
          <CricketPlay
            profiles={store.profiles ?? []}
            // 🔗 enregistre la manche dans History + Stats
            onFinish={(m: any) => pushHistory(m)}
          />
        );
        break;
      }

      case "killer": {
        page = <KillerPlay playerIds={[]} onFinish={pushHistory} />;
        break;
      }

      case "shanghai": {
        page = <ShanghaiPlay playerIds={[]} onFinish={pushHistory} />;
        break;
      }

      /* ---------- TRAINING ---------- */
      case "training": {
        page = <TrainingMenu go={go} />;
        break;
      }

      case "training_x01": {
        page = <TrainingX01Play go={go} />;
        break;
      }

      case "training_stats": {
        page = <RedirectToStatsTraining go={go} />;
        break;
      }

      case "training_clock": {
        page = (
          <TrainingClock
            profiles={store.profiles ?? []}
            activeProfileId={store.activeProfileId}
          />
        );
        break;
      }

      /* ---------- AVATAR CREATOR ---------- */
      case "avatar": {
        const botId: string | undefined = routeParams?.botId;
        const profileIdFromParams: string | undefined = routeParams?.profileId;
        const backTo: Tab = (routeParams?.from as Tab) || "profiles";
        const isBotMode = !!routeParams?.isBot;

        if (botId) {
          const bots = loadBotsLS();
          const targetBot = bots.find((b) => b.id === botId) ?? null;

          function handleSaveAvatarBot({
            pngDataUrl,
            name,
          }: {
            pngDataUrl: string;
            name: string;
          }) {
            if (!targetBot) return go(backTo);

            const next = bots.slice();
            const idx = next.findIndex((b) => b.id === targetBot.id);

            const updated: BotLS = {
              ...targetBot,
              name: name?.trim() || targetBot.name,
              avatarDataUrl: pngDataUrl,
            };

            if (idx >= 0) next[idx] = updated;
            else next.push(updated);

            saveBotsLS(next);
            go(backTo);
          }

          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go(backTo)} style={{ marginBottom: 12 }}>
                ← Retour
              </button>
              <AvatarCreator
                size={512}
                defaultName={targetBot?.name || ""}
                onSave={handleSaveAvatarBot}
                isBotMode={true}
              />
            </div>
          );
          break;
        }

        const targetProfile =
          store.profiles.find(
            (p) => p.id === (profileIdFromParams || store.activeProfileId)
          ) ?? null;

        function handleSaveAvatarProfile({
          pngDataUrl,
          name,
        }: {
          pngDataUrl: string;
          name: string;
        }) {
          if (!targetProfile) return;

          setProfiles((list) =>
            list.map((p) =>
              p.id === targetProfile.id
                ? {
                    ...p,
                    name: name?.trim() || p.name,
                    avatarDataUrl: pngDataUrl,
                  }
                : p
            )
          );

          go(backTo);
        }

        page = (
          <div style={{ padding: 16 }}>
            <button onClick={() => go(backTo)} style={{ marginBottom: 12 }}>
              ← Retour
            </button>
            <AvatarCreator
              size={512}
              defaultName={targetProfile?.name || ""}
              onSave={handleSaveAvatarProfile}
              isBotMode={isBotMode}
            />
          </div>
        );
        break;
      }

      /* ---------- FALLBACK ---------- */
      default:
        page = (
          <Home
            store={store}
            update={update}
            go={go}
            onConnect={() =>
              go("profiles", { view: "me", autoCreate: true })
            }
          />
        );
    }
  }

  /* ---------- RENDER ---------- */
  return (
    <>
      <div className="container" style={{ paddingBottom: 88 }}>
        {page}
      </div>

      <BottomNav value={tab as any} onChange={(k: any) => go(k)} />

      <SWUpdateBanner />
    </>
  );
}

/* ---------- ROOT PROVIDERS ---------- */
export default function AppRoot() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthOnlineProvider>
          <App />
        </AuthOnlineProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
