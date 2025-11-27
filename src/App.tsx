// ============================================
// src/App.tsx — Navigation + wiring propre (v5 sécurisé)
// Fix: "Lancer partie" n'affiche plus la dernière reprise
// + Intégration pages Training (menu / play / stats)
// + X01Play V3 en parallèle du X01 actuel
// + Stats : bouton menu => StatsShell (menu), puis StatsHub (détails)
// + Stats Online : StatsOnline (détails ONLINE)
// ============================================
import React from "react";
import BottomNav from "./components/BottomNav";

// Persistance (IndexedDB via storage.ts)
import { loadStore, saveStore } from "./lib/storage";
// OPFS / StorageManager — demande la persistance une fois au boot
import { ensurePersisted } from "./lib/deviceStore";

// ✅ Amorçage agrégateur léger (warm-up au démarrage)
import { warmAggOnce } from "./boot/warmAgg";

// ✅ Mode Online — API (mock ou backend réel)
import { onlineApi } from "./lib/onlineApi";

// Types
import type { Store, Profile, MatchRecord } from "./lib/types";
import type { X01ConfigV3 as X01ConfigV3Type } from "./types/x01v3";

// Pages
import Home from "./pages/Home";
import Games from "./pages/Games";
import Profiles from "./pages/Profiles";
import FriendsPage from "./pages/FriendsPage";
// ⛔ Ancienne page réglages supprimée
// import SettingsPage from "./pages/SettingsPage";
import Settings from "./pages/Settings";
import X01Setup from "./pages/X01Setup";
import X01Play from "./pages/X01Play";
// ✅ NOUVELLE PAGE : setup ONLINE
import X01OnlineSetup from "./pages/X01OnlineSetup";
// ❌ X01PlayV2 supprimé
// import X01PlayV2 from "./pages/X01PlayV2";
import CricketPlay from "./pages/CricketPlay";
import KillerPlay from "./pages/KillerPlay";
import ShanghaiPlay from "./pages/ShanghaiPlay";
import LobbyPick from "./pages/LobbyPick";
import X01End from "./pages/X01End";
// ✅ Nouvelle page
import AvatarCreator from "./pages/AvatarCreator";
// ✅ Nouvelle page : gestion des BOTS (CPU)
import ProfilesBots from "./pages/ProfilesBots";

// ✅ Pages Training (menu / solo X01 / stats)
import TrainingMenu from "./pages/TrainingMenu";
import TrainingX01Play from "./pages/TrainingX01Play";
import TrainingClock from "./pages/TrainingClock";

// Historique (pour StatsDetail / upsert / get)
import { History } from "./lib/history";

// ✅ Stats : menu + hub
import StatsShell from "./pages/StatsShell"; // Menu style Home/Games/Profils
import StatsHub from "./pages/StatsHub"; // Vue détaillée (Stats joueurs / Training / Historique)
// ✅ Stats Online : vue détaillée ONLINE
import StatsOnline from "./pages/StatsOnline";

// ✅ Contexte X01 V3 (config + play)
import X01ConfigV3 from "./pages/X01ConfigV3";
import X01PlayV3 from "./pages/X01PlayV3";

// ✅ Contexts Thème + Langue
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./contexts/LangContext";

// DEV uniquement
import { installHistoryProbe } from "./dev/devHistoryProbe";
if (import.meta.env.DEV) installHistoryProbe();

/* -- Helper UI : complète les joueurs d’un record avec l’avatar depuis le store -- */
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

  const players = rec?.players?.length ? rec.players : rec?.payload?.players || [];
  const filled = get(players);

  return {
    ...rec,
    players: filled,
    payload: { ...(rec?.payload || {}), players: filled },
  };
}

// --------------------------------------------
type Tab =
  | "home"
  | "games"
  | "profiles"
  | "profiles_bots"
  | "friends"
  | "stats" // 👈 StatsShell (menu)
  | "statsHub" // 👈 StatsHub (détails Stats joueurs / Training / Historique)
  | "stats_online" // 👈 StatsOnline (détails ONLINE)
  | "statsDetail"
  | "settings"
  | "x01setup"
  | "x01_online_setup" // 👈 NOUVEL ÉCRAN : setup ONLINE
  | "x01"
  | "x01_end"
  | "cricket"
  | "killer"
  | "shanghai"
  // ✅ nouvelles routes tabs Training
  | "training"
  | "training_x01"
  | "training_stats"
  | "training_clock"
  // ✅ nouvelle route par onglet
  | "avatar"
  // ✅ nouvelles routes X01 V3
  | "x01_config_v3"
  | "x01_play_v3";

// Petit composant pour rediriger "training_stats" vers StatsHub onglet Training
function RedirectToStatsTraining({ go }: { go: (tab: Tab, params?: any) => void }) {
  React.useEffect(() => {
    go("statsHub", { tab: "training" });
  }, [go]);
  return null;
}

// Nouveau wrapper pour l'écran de détail stats (respect des hooks)
function StatsDetailRoute({
  store,
  go,
  params,
}: {
  store: Store;
  go: (tab: Tab, params?: any) => void;
  params: any;
}) {
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
      } catch {
        // ignore
      }
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
    const toArrLoc = (v: any) => (Array.isArray(v) ? v : []);
    const players = toArrLoc(
      rec.players?.length ? rec.players : rec.payload?.players
    );
    const names = players.map((p: any) => p?.name ?? "—").join(" · ");
    const winnerName = rec.winnerId
      ? (players.find((p: any) => p?.id === rec.winnerId)?.name ?? "—")
      : null;

    return (
      <div style={{ padding: 16 }}>
        <button
          onClick={() => go("statsHub", { tab: "history" })}
          style={{ marginBottom: 12 }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0 }}>
          {(rec.kind || "MATCH").toUpperCase()} — {dateStr}
        </h2>
        <div style={{ opacity: 0.85, marginTop: 8 }}>
          Joueurs : {names || "—"}
        </div>
        {winnerName && (
          <div style={{ marginTop: 6 }}>Vainqueur : 🏆 {winnerName}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={() => go("statsHub", { tab: "history" })}
        style={{ marginBottom: 12 }}
      >
        ← Retour
      </button>
      {matchId ? "Chargement..." : "Aucune donnée"}
    </div>
  );
}

// Store initial minimal
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

// ===== Helpers BOTS pour l'éditeur d'avatar =====
const LS_BOTS_KEY = "dc_bots_v1";

// ✅ même clé que FriendsPage / StatsOnline
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
  } catch {
    // ignore
  }
}

// ===== Service Worker update prompt =====
function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);
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
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
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
// ===== fin SW update prompt =====

// --------------------------------------------
function App() {
  const [store, setStore] = React.useState<Store>(initialStore);
  const [tab, setTab] = React.useState<Tab>("home");
  const [routeParams, setRouteParams] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // Demander la persistance une fois au boot (silencieux si déjà accordée)
  React.useEffect(() => {
    ensurePersisted().catch(() => {});
  }, []);

  // ✅ Warm-up agrégateur léger au démarrage
  React.useEffect(() => {
    try {
      warmAggOnce();
    } catch {}
  }, []);

  // ✅ Mode Online : tentative de restauration de session au boot
  React.useEffect(() => {
    onlineApi
      .restoreSession()
      .then((session) => {
        console.log("[Online] session restaurée :", session);
        // plus tard : on pourra brancher ça sur un contexte ou sur le store
      })
      .catch((err) => {
        console.warn("[Online] restoreSession failed:", err);
      });
  }, []);

  // ⚠️ Expose le store en global pour les fallbacks (X01End / autres)
  React.useEffect(() => {
    (window as any).__appStore = store;
  }, [store]);

  // Mémo config X01 (v1)
  const [x01Config, setX01Config] = React.useState<{
    start: 301 | 501 | 701 | 1001;
    doubleOut: boolean;
    playerIds: string[];
  } | null>(null);

  // ✅ Mémo config X01 V3
  const [x01ConfigV3, setX01ConfigV3] = React.useState<X01ConfigV3Type | null>(null);

  // -------- Navigation centralisée (avec params) --------
  function go(next: Tab, params?: any) {
    setRouteParams(params ?? null);
    setTab(next);
  }

  /* ----------------------------------------
     Chargement initial depuis IndexedDB
  ---------------------------------------- */
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const saved = await loadStore<Store>();

        // Base = initialStore + données sauvegardées (si présentes)
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

        // 👉 Si aucun profil local, on crée quelques profils de démo
        if (!base.profiles || base.profiles.length === 0) {
          const demoProfiles: Profile[] = [
            {
              id: "demo_ninzalex",
              name: "Ninzalex",
              avatarDataUrl: null,
            } as any,
            {
              id: "demo_neven",
              name: "Neven",
              avatarDataUrl: null,
            } as any,
          ];

          base.profiles = demoProfiles;
          base.activeProfileId = demoProfiles[0].id;
        }

        if (mounted) {
          setStore(base);
        }
      } catch (err) {
        console.warn("[App] erreur loadStore:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sauvegarde à chaque modification
  React.useEffect(() => {
    if (!loading) saveStore(store);
  }, [store, loading]);

  /* ----------------------------------------
     Mutateur centralisé
  ---------------------------------------- */
  function update(mut: (s: Store) => Store) {
    setStore((s) => {
      const next = mut({ ...s });
      queueMicrotask(() => saveStore(next));
      return next;
    });
  }

  // Helpers profils
  function setProfiles(fn: (p: Profile[]) => Profile[]) {
    update((s) => ({ ...s, profiles: fn(s.profiles ?? []) }));
  }

  // Fin de partie → normalise, dédupe, persiste, route vers Historique
  function pushHistory(m: MatchRecord) {
    const now = Date.now();
    const id =
      (m as any)?.id ||
      (m as any)?.matchId ||
      `x01-${now}-${Math.random().toString(36).slice(2, 8)}`;

    // 1) source joueurs
    const rawPlayers = (m as any)?.players ?? (m as any)?.payload?.players ?? [];

    // 2) enrichir avec avatars locaux
    const players = (rawPlayers as any[]).map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? (prof?.avatarDataUrl ?? null),
      };
    });

    const summary = (m as any)?.summary ?? (m as any)?.payload?.summary ?? null;

    const saved: any = {
      id,
      kind: (m as any)?.kind || "x01",
      status: (m as any)?.status || "finished",
      players,
      winnerId: (m as any)?.winnerId || (m as any)?.payload?.winnerId || null,
      createdAt: (m as any)?.createdAt || now,
      updatedAt: now,
      summary,
      payload: { ...(m as any), players },
    };

    // 3) mémoire locale
    update((s) => {
      const list = [...(s.history ?? [])];
      const i = list.findIndex((r: any) => r.id === saved.id);
      if (i >= 0) list[i] = saved;
      else list.unshift(saved);
      return { ...s, history: list };
    });

    // 4) persistant local (historique détaillé)
    try {
      (History as any)?.upsert?.(saved);
    } catch (e) {
      console.warn("[App] History.upsert failed:", e);
    }

    // ✅ 4bis) miroir local pour StatsOnline (LS_ONLINE_MATCHES_KEY)
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(LS_ONLINE_MATCHES_KEY);
        const list = raw ? JSON.parse(raw) : [];

        // On stocke une version light ; StatsOnline est tolérant si stats manquent
        const entry = {
          id: saved.id,
          mode: saved.kind,
          createdAt: saved.createdAt,
          finishedAt: saved.updatedAt,
          players: saved.players,
          winnerId: saved.winnerId,
          summary: saved.summary ?? null,
          stats: (saved.payload as any)?.stats ?? null,
        };

        list.unshift(entry);
        // on limite un peu la taille pour éviter l'infini
        const trimmed = list.slice(0, 200);
        window.localStorage.setItem(LS_ONLINE_MATCHES_KEY, JSON.stringify(trimmed));
      }
    } catch (e) {
      console.warn("[App] miroir LS_ONLINE_MATCHES_KEY failed:", e);
    }

    // 5) upload online (best effort)
    try {
      const kind = saved.kind as string;
      const supported = ["x01", "cricket", "killer", "shanghai"];

      if (supported.includes(kind)) {
        onlineApi
          .uploadMatch({
            mode: kind as any,
            payload: {
              summary: saved.summary ?? null,
              payload: saved.payload ?? null,
            },
            isTraining: false,
            startedAt: saved.createdAt,
            finishedAt: saved.updatedAt,
          })
          .catch(() => {
            /* ignore erreurs online */
          });
      }
    } catch (e) {
      console.warn("[App] onlineApi.uploadMatch failed:", e);
    }

    // 6) route UI → StatsHub onglet Historique (pas le menu)
    go("statsHub", { tab: "history" });
  }

  // Historique enrichi pour l'UI (avatars garantis)
  const historyForUI = React.useMemo(
    () => (store.history || []).map((r: any) => withAvatars(r, store.profiles || [])),
    [store.history, store.profiles]
  );

  // --------------------------------------------
  // Routes
  let page: React.ReactNode = null;

  if (loading) {
    page = (
      <div className="container" style={{ padding: 40, textAlign: "center", color: "#ccc" }}>
        Chargement...
      </div>
    );
  } else {
    switch (tab) {
      case "home": {
        page = (
          <Home
            store={store}
            update={update}
            go={(t: any, p?: any) => go(t, p)}
            onConnect={() => go("profiles")}
          />
        );
        break;
      }

      case "games": {
        page = <Games setTab={(t: any) => go(t)} />;
        break;
      }

      case "profiles": {
        page = (
          <Profiles store={store} update={update} setProfiles={setProfiles} go={go} />
        );
        break;
      }

      // ✅ Nouvelle page : gestion des BOTS (CPU)
      case "profiles_bots": {
        page = <ProfilesBots store={store} go={go} />;
        break;
      }

      case "friends": {
        // 🔗 FriendsPage peut maintenant lancer une partie Online (mock) via go()
        page = <FriendsPage store={store} update={update} go={go} />;
        break;
      }

      case "settings": {
        page = <Settings go={go} />;
        break;
      }

      // ---------- STATS ----------
      case "stats": {
        // 👇 BottomNav "Stats" arrive ici : menu avec les 5 cartes
        page = <StatsShell store={store} go={go} />;
        break;
      }

      case "statsHub": {
        // 👇 Ouvert depuis StatsShell (ou fin de partie / Training)
        //    - si on ne précise rien → onglet "Stats joueurs"
        const initialTab = (routeParams?.tab as any) ?? "stats";

        // 🔥 On récupère tous les paramètres envoyés par StatsShell / App
        const mode = (routeParams?.mode as any) ?? undefined;

        const initialPlayerId =
          (routeParams?.initialPlayerId as string | null | undefined) ??
          (routeParams?.playerId as string | null | undefined) ??
          null;

        const initialStatsSubTab =
          (routeParams?.initialStatsSubTab as any) ?? undefined;

        page = (
          <StatsHub
            go={go}
            tab={initialTab}
            memHistory={historyForUI}
            mode={mode}
            initialPlayerId={initialPlayerId}
            initialStatsSubTab={initialStatsSubTab}
            playerId={routeParams?.playerId ?? null}
          />
        );
        break;
      }

      case "stats_online": {
        // 👈 NOUVELLE ROUTE : carte ONLINE dans StatsShell
        page = <StatsOnline />;
        break;
      }

      case "statsDetail": {
        // 👈 Wrapper dédié pour respecter les Rules of Hooks
        page = (
          <StatsDetailRoute
            store={store}
            go={go}
            params={routeParams}
          />
        );
        break;
      }

      // ---------- X01 v1 ----------
      case "x01setup": {
        page = (
          <X01Setup
            profiles={store.profiles ?? []}
            defaults={{
              start: store.settings.defaultX01,
              doubleOut: store.settings.doubleOut,
            }}
            onStart={(ids, start, doubleOut) => {
              // ⚠️ NOUVELLE PARTIE → purge toute reprise + remount forcé
              const players = store.settings.randomOrder
                ? ids.slice().sort(() => Math.random() - 0.5)
                : ids;
              setX01Config({ playerIds: players, start, doubleOut });
              go("x01", { resumeId: null, fresh: Date.now() });
            }}
            onBack={() => go("games")}
          />
        );
        break;
      }

      // ---------- X01 ONLINE SETUP (mock) ----------
      case "x01_online_setup": {
        const activeProfile =
          (store.profiles || []).find((p) => p.id === store.activeProfileId) || null;
        const lobbyCode: string | null = routeParams?.lobbyCode ?? null;

        page = (
          <X01OnlineSetup
            profile={activeProfile}
            defaults={{
              start: (store.settings.defaultX01 as 301 | 501 | 701 | 1001) ?? 501,
              doubleOut: store.settings.doubleOut,
            }}
            lobbyCode={lobbyCode}
            onBack={() => go("friends")}
            onStart={({ start, doubleOut }) => {
              if (!activeProfile) {
                alert("Aucun profil actif sélectionné.");
                return;
              }

              // 👉 On réutilise le moteur X01 classique (X01Play)
              setX01Config({
                start,
                doubleOut,
                playerIds: [activeProfile.id],
              });

              go("x01", {
                resumeId: null,
                fresh: Date.now(),
                from: "online_mock",
                lobbyCode,
                online: true,
              });
            }}
          />
        );
        break;
      }

      case "x01": {
        const isResume = !!routeParams?.resumeId;
        const isOnline = !!routeParams?.online;

        // ⚙️ On part de la config mémorisée…
        let effectiveConfig = x01Config;

        // …mais si on arrive depuis un bouton ONLINE (FriendsPage) sans passer
        // par X01Setup, on construit une config auto.
        if (!effectiveConfig && isOnline && !isResume) {
          const activeProfile =
            (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
            (store.profiles || [])[0] ||
            null;

          const startDefault = (store.settings.defaultX01 as 301 | 501 | 701 | 1001) || 501;
          const start: 301 | 501 | 701 | 1001 =
            startDefault === 301 ||
            startDefault === 501 ||
            startDefault === 701 ||
            startDefault === 1001
              ? startDefault
              : 501;

          const doubleOut = !!store.settings.doubleOut;
          const playerIds = activeProfile ? [activeProfile.id] : [];

          effectiveConfig = {
            start,
            doubleOut,
            playerIds,
          };

          // on mémorise pour la suite de la session
          setX01Config(effectiveConfig);
        }

        if (!effectiveConfig && !isResume) {
          // Aucun setup disponible (ni local, ni online) → message d’erreur
          page = (
            <div className="container" style={{ padding: 16 }}>
              <button onClick={() => go("x01setup")}>← Retour</button>
              <p>Configuration X01 manquante.</p>
            </div>
          );
        } else {
          // ✅ Compat X01Play: mappe doubleOut -> outMode, borne start si 1001
          const rawStart =
            effectiveConfig?.start ?? (store.settings.defaultX01 as 301 | 501 | 701 | 1001);
          const startClamped: 301 | 501 | 701 | 901 =
            rawStart >= 901 ? 901 : (rawStart as 301 | 501 | 701 | 901);
          const outMode = (effectiveConfig?.doubleOut ?? store.settings.doubleOut)
            ? "double"
            : "simple";

          const playerIds = effectiveConfig?.playerIds ?? [];

          // 🔑 Remount garanti:
          // - reprise: key = resume-<id>
          // - nouvelle partie: key = fresh-<timestamp>
          const freshToken = routeParams?.fresh ?? Date.now();
          const key = isResume ? `resume-${routeParams.resumeId}` : `fresh-${freshToken}`;

          page = (
            <X01Play
              key={key}
              profiles={store.profiles ?? []}
              playerIds={playerIds}
              start={startClamped}
              outMode={outMode}
              inMode="simple"
              // ⬇️ on ne transmet params QUE pour une reprise
              params={isResume ? ({ resumeId: routeParams.resumeId } as any) : (undefined as any)}
              onFinish={(m) => pushHistory(m)}
              onExit={() => (isOnline ? go("friends") : go("x01setup"))}
            />
          );
        }
        break;
      }

      // ---------- X01 V3 ----------
      case "x01_config_v3": {
        page = (
          <X01ConfigV3
            profiles={store.profiles ?? []}
            onBack={() => go("games")}
            onStart={(cfg) => {
              setX01ConfigV3(cfg);
              go("x01_play_v3", { fresh: Date.now() });
            }}
            // 🔗 IMPORTANT : on passe go pour "CRÉER BOT"
            go={go}
          />
        );
        break;
      }

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
        page = <X01PlayV3 config={x01ConfigV3} />;
        break;
      }

      case "x01_end": {
        page = <X01End go={go} params={routeParams} />;
        break;
      }

      // ---------- Autres jeux ----------
      case "cricket": {
        page = <CricketPlay profiles={store.profiles ?? []} />;
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

      // ---------- Training ----------
      case "training": {
        // Menu Training (choix mode, bouton "X01 solo", bouton "Voir évolution")
        page = <TrainingMenu go={go} />;
        break;
      }

      case "training_x01": {
        // Partie Training X01 solo (même keypad que X01 mais sans liste joueurs)
        page = <TrainingX01Play go={go} />;
        break;
      }

      case "training_stats": {
        // Redirection vers StatsHub onglet "Training"
        page = <RedirectToStatsTraining go={go} />;
        break;
      }

      case "training_clock": {
        // Tour de l'horloge (training — solo + multi)
        page = (
          <TrainingClock
            profiles={store.profiles ?? []}
            activeProfileId={store.activeProfileId}
          />
        );
        break;
      }

      // ✅ Nouvelle page : Créateur d'avatar
      case "avatar": {
        const botId: string | undefined = routeParams?.botId;
        const profileIdFromParams: string | undefined = routeParams?.profileId;
        const backTo: Tab = (routeParams?.from as Tab) || "profiles";
        const isBotMode = !!routeParams?.isBot;

        // --- Cas 1 : on édite l'avatar d'un BOT ---
        if (botId) {
          const bots = loadBotsLS();
          const targetBot = bots.find((b) => b.id === botId) || null;

          function handleSaveAvatarBot({
            pngDataUrl,
            name,
          }: {
            pngDataUrl: string;
            name: string;
          }) {
            if (!targetBot) {
              console.warn("[AvatarCreator] BOT introuvable pour id", botId);
              go(backTo);
              return;
            }
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
                // 👇 médaillon bleu pour les BOTS
                isBotMode={true}
              />
            </div>
          );
          break;
        }

        // --- Cas 2 : avatar pour un profil (profilId explicite ou actif) ---
        const targetProfile =
          (store.profiles || []).find(
            (p) => p.id === (profileIdFromParams || store.activeProfileId)
          ) || null;

        function handleSaveAvatarProfile({
          pngDataUrl,
          name,
        }: {
          pngDataUrl: string;
          name: string;
        }) {
          if (!targetProfile) {
            console.warn("[AvatarCreator] Aucun profil cible");
            return;
          }

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
              // 👇 médaillon doré (humain)
              isBotMode={false}
            />
          </div>
        );
        break;
      }

      default: {
        page = (
          <Home
            store={store}
            update={update}
            go={(t: any, p?: any) => go(t, p)}
            onConnect={() => go("profiles")}
          />
        );
      }
    }
  }

  // --------------------------------------------
  return (
    <>
      <div className="container" style={{ paddingBottom: 88 }}>
        {page}
      </div>
      {/* BottomNav : "Stats" ouvre StatsShell (menu) */}
      <BottomNav value={tab as any} onChange={(k: any) => go(k)} />
      {/* Bannière de mise à jour PWA */}
      <SWUpdateBanner />
    </>
  );
}

// ✅ Wrapper global avec Thème + Langue
export default function AppRoot() {
  return (
    <ThemeProvider>
      <LangProvider>
        <App />
      </LangProvider>
    </ThemeProvider>
  );
}
