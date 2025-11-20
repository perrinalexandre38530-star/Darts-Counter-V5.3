// ============================================
// src/App.tsx — Navigation + wiring propre (v5 sécurisé)
// Fix: "Lancer partie" n'affiche plus la dernière reprise
// + Intégration pages Training (menu / play / stats)
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
import CricketPlay from "./pages/CricketPlay";
import KillerPlay from "./pages/KillerPlay";
import ShanghaiPlay from "./pages/ShanghaiPlay";
import LobbyPick from "./pages/LobbyPick";
import StatsHub from "./pages/StatsHub";
import X01End from "./pages/X01End";
// ✅ Nouvelle page
import AvatarCreator from "./pages/AvatarCreator";

// ✅ Pages Training (menu / solo X01 / stats)
import TrainingMenu from "./pages/TrainingMenu";
import TrainingX01Play from "./pages/TrainingX01Play";
import TrainingClock from "./pages/TrainingClock";

// Historique (pour StatsDetail / upsert / get)
import { History } from "./lib/history";

// ✅ Contexts Thème + Langue
import { ThemeProvider } from "./contexts/ThemeContext";
import { LangProvider } from "./contexts/LangContext";

// ✅ ErrorBoundary global (crashs React / JS)
import AppErrorBoundary from "./components/AppErrorBoundary";

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
  | "friends"
  | "stats"
  | "statsDetail"
  | "settings"
  | "x01setup"
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
  | "avatar";

// Petit composant pour rediriger "training_stats" vers StatsHub onglet Training
function RedirectToStatsTraining({ go }: { go: (tab: Tab, params?: any) => void }) {
  React.useEffect(() => {
    go("stats", { tab: "training" });
  }, [go]);
  return null;
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

  // Mémo config X01
  const [x01Config, setX01Config] = React.useState<{
    start: 301 | 501 | 701 | 1001;
    doubleOut: boolean;
    playerIds: string[];
  } | null>(null);

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
        if (mounted && saved) {
          setStore({
            ...initialStore,
            ...saved,
            profiles: saved.profiles ?? [],
            friends: saved.friends ?? [],
            history: saved.history ?? [],
          });
        }
      } catch (err) {
        console.warn("[App] erreur loadStore:", err);
      } finally {
        setLoading(false);
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
    const rawPlayers =
      (m as any)?.players ??
      (m as any)?.payload?.players ??
      [];

    // 2) enrichir avec avatars locaux
    const players = (rawPlayers as any[]).map((p: any) => {
      const prof = (store.profiles || []).find((pr) => pr.id === p?.id);
      return {
        id: p?.id,
        name: p?.name ?? prof?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? (prof?.avatarDataUrl ?? null),
      };
    });

    const summary =
      (m as any)?.summary ??
      (m as any)?.payload?.summary ??
      null;

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

    // 4) persistant local
    try {
      (History as any)?.upsert?.(saved);
    } catch (e) {
      console.warn("[App] History.upsert failed:", e);
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

    // 6) route UI
    go("stats", { tab: "history" });
  }

  // Historique enrichi pour l'UI (avatars garantis même pour autosave)
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
        page = <Profiles store={store} update={update} setProfiles={setProfiles} />;
        break;
      }

      case "friends": {
        page = <FriendsPage store={store} update={update} />;
        break;
      }

      case "settings": {
        // ✅ Nouvelle page Settings (thème + langue)
        page = <Settings go={go} />;
        break;
      }

      case "stats": {
        page = (
          <StatsHub
            go={go}
            tab={(routeParams?.tab as any) ?? "history"}
            memHistory={historyForUI} // <-- avatars toujours présents
          />
        );
        break;
      }

      case "statsDetail": {
        // Charge proprement le record demandé
        const [rec, setRec] = React.useState<any>(() => {
          if (routeParams?.rec) return withAvatars(routeParams.rec, store.profiles || []);
          const fromMem = (store.history || []).find((r: any) => r.id === routeParams?.matchId);
          return fromMem ? withAvatars(fromMem, store.profiles || []) : null;
        });
        const matchId: string | undefined = routeParams?.matchId;

        React.useEffect(() => {
          let alive = true;
          (async () => {
            if (!matchId) return;
            try {
              const byId = await (History as any)?.get?.(matchId);
              if (alive && byId) setRec(withAvatars(byId, store.profiles || []));
            } catch {}
          })();
          return () => {
            alive = false;
          };
        }, [matchId, store.profiles]);

        if (routeParams?.showEnd && rec) {
          page = (
            <X01End
              go={go}
              params={{
                matchId: rec.id,
                resumeId: rec.resumeId ?? rec.payload?.resumeId,
                showEnd: true,
              }}
            />
          );
          break;
        }

        if (rec) {
          const when = Number(rec.updatedAt ?? rec.createdAt ?? Date.now());
          const dateStr = new Date(when).toLocaleString();
          const toArrLoc = (v: any) => (Array.isArray(v) ? v : []);
          const players = toArrLoc(rec.players?.length ? rec.players : rec.payload?.players);
          const names = players.map((p: any) => p?.name ?? "—").join(" · ");
          const winnerName = rec.winnerId
            ? (players.find((p: any) => p?.id === rec.winnerId)?.name ?? "—")
            : null;

          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("stats", { tab: "history" })} style={{ marginBottom: 12 }}>
                ← Retour
              </button>
              <h2 style={{ margin: 0 }}>
                {(rec.kind || "MATCH").toUpperCase()} — {dateStr}
              </h2>
              <div style={{ opacity: 0.85, marginTop: 8 }}>Joueurs : {names || "—"}</div>
              {winnerName && <div style={{ marginTop: 6 }}>Vainqueur : 🏆 {winnerName}</div>}
            </div>
          );
        } else {
          page = (
            <div style={{ padding: 16 }}>
              <button onClick={() => go("stats", { tab: "history" })} style={{ marginBottom: 12 }}>
                ← Retour
              </button>
              {matchId ? "Chargement..." : "Aucune donnée"}
            </div>
          );
        }
        break;
      }

      // ---------- X01 ----------
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

      case "x01": {
        const isResume = !!routeParams?.resumeId;

        if (!x01Config && !isResume) {
          page = (
            <div className="container" style={{ padding: 16 }}>
              <button onClick={() => go("x01setup")}>← Retour</button>
              <p>Configuration X01 manquante.</p>
            </div>
          );
        } else {
          // ✅ Compat X01Play: mappe doubleOut -> outMode, borne start si 1001
          const rawStart = x01Config?.start ?? store.settings.defaultX01;
          const startClamped: 301 | 501 | 701 | 901 =
            rawStart >= 901 ? 901 : (rawStart as 301 | 501 | 701 | 901);
          const outMode = (x01Config?.doubleOut ?? store.settings.doubleOut) ? "double" : "simple";

          // 🔑 Remount garanti:
          // - reprise: key = resume-<id>
          // - nouvelle partie: key = fresh-<timestamp>
          const key = isResume
            ? `resume-${routeParams.resumeId}`
            : `fresh-${routeParams?.fresh ?? (x01Config?.playerIds || []).join("-")}`;

          page = (
            <X01Play
              key={key}
              profiles={store.profiles ?? []}
              playerIds={x01Config?.playerIds ?? []}
              start={startClamped}
              outMode={outMode}
              inMode="simple"
              // ⬇️ on ne transmet params QUE pour une reprise
              params={isResume ? ({ resumeId: routeParams.resumeId } as any) : (undefined as any)}
              onFinish={(m) => pushHistory(m)}
              onExit={() => go("x01setup")}
            />
          );
        }
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
        page = (
          <div style={{ padding: 16 }}>
            <button onClick={() => go("profiles")} style={{ marginBottom: 12 }}>
              ← Retour
            </button>
            <AvatarCreator size={512} overlaySrc="/assets/medallion.svg" />
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
      <BottomNav value={tab as any} onChange={(k: any) => go(k)} />
      {/* Bannière de mise à jour PWA */}
      <SWUpdateBanner />
    </>
  );
}

// ✅ Wrapper global avec Thème + Langue + ErrorBoundary
export default function AppRoot() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </LangProvider>
    </ThemeProvider>
  );
}