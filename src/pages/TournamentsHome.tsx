// ============================================
// src/pages/TournamentsHome.tsx
// TOURNOIS — HOME (LOCAL) UI clean (v1)
// - Visuel similaire à tes pages config (cards)
// - Titre "TOURNOIS" + description
// - Supprime infos inutiles
// - Bouton "CREER TOURNOI" en 1 seule ligne, centré
// - Barre filtre style pills (Tous / Brouillons / En cours / Terminés)
// - Ticker défilant (cartes) style Home (fond image/gradient)
// ✅ FIX NAV: clic carte => go("tournament_view", { id: t.id }) (id fiable)
// ✅ FIX REFRESH: reload au mount + focus/visibility + event dc_tournaments_updated
// ✅ NEW TICKER: cartes UTILES + cliquables (Reprendre / AUTO / Brouillons / BRACKET / AUTO create / Roadmap)
// ============================================

import React from "react";
import type { Store } from "../lib/types";

// ✅ NEW: source de vérité local (IDB cache + event refresh)
import {
  listTournamentsLocal,
  listMatchesForTournamentLocal,
  TOURNAMENTS_UPDATED_EVENT,
} from "../lib/tournaments/storeLocal";

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  go: (tab: any, params?: any) => void;
  source?: "local" | "online";
};

type FilterKey = "all" | "draft" | "running" | "done";

function pillStyle(active: boolean, tint: string) {
  return {
    padding: "7px 10px",
    borderRadius: 999,
    border: active ? `1px solid ${tint}` : "1px solid rgba(255,255,255,.10)",
    background: active
      ? `linear-gradient(180deg, ${tint}, rgba(0,0,0,.35))`
      : "rgba(255,255,255,.04)",
    color: active ? "#08130c" : "rgba(255,255,255,.86)",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    boxShadow: active ? `0 10px 18px rgba(0,0,0,.45)` : "none",
    userSelect: "none" as const,
    whiteSpace: "nowrap" as const,
  };
}

function Card({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "gold" | "blue" | "pink" | "green";
}) {
  const bg =
    tone === "gold"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.14), transparent 55%), linear-gradient(180deg, rgba(22,22,26,.96), rgba(10,10,12,.98))"
      : tone === "blue"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(79,180,255,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : tone === "pink"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,79,216,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : tone === "green"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(127,226,169,.12), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))"
      : "linear-gradient(180deg, rgba(24,24,30,.96), rgba(10,10,12,.98))";

  const border =
    tone === "gold"
      ? "1px solid rgba(255,195,26,.22)"
      : "1px solid rgba(255,255,255,.10)";

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: bg,
        border,
        boxShadow: "0 18px 45px rgba(0,0,0,.60)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/* =============================================================
 * ✅ Ticker ACTIONS (cartes défilantes + cliquables)
 * Objectif: pas du décor -> chaque carte amène vers une action.
 * - Reprendre: ouvre le tournoi le plus pertinent
 * - AUTO: ouvre le tournoi (et l’utilisateur lance depuis le bouton Résumé)
 * - Brouillons: filtre Brouillons
 * - BRACKET: ouvre création preset bracket
 * - Créer AUTO: ouvre création preset auto
 * - Roadmap: ouvre roadmap
 * ============================================================= */

function fmtDate(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

function isPlayableReal(m: any) {
  // IMPORTANT: on ne compte pas BYE/TBD comme jouable
  const st = String(m?.status || "");
  if (st !== "pending") return false;
  const a = String(m?.aPlayerId || "");
  const b = String(m?.bPlayerId || "");
  if (!a || !b) return false;
  if (a === "__BYE__" || b === "__BYE__") return false;
  if (a === "__TBD__" || b === "__TBD__") return false;
  if (a === "__BYE__" && b === "__BYE__") return false;
  return true;
}

function computeCountsForTournament(tid: string) {
  const ms = listMatchesForTournamentLocal(tid) || [];
  const visible = (Array.isArray(ms) ? ms : []).filter(
    (m: any) => !(String(m?.aPlayerId) === "__BYE__" && String(m?.bPlayerId) === "__BYE__")
  );

  const pending = visible.filter((m: any) => String(m?.status || "") === "pending").length;
  const running = visible.filter((m: any) => {
    const s = String(m?.status || "");
    return s === "running" || s === "playing";
  }).length;
  const done = visible.filter((m: any) => String(m?.status || "") === "done").length;
  const playable = visible.filter((m: any) => isPlayableReal(m)).length;

  return { pending, running, done, playable, total: visible.length };
}

function TickerCard({
  tag,
  title,
  sub,
  tone,
  cta,
  kpi,
  onClick,
  disabled,
}: {
  tag: string;
  title: string;
  sub?: string;
  tone: "gold" | "pink" | "green" | "blue" | "dark" | "violet" | "white";
  cta: string;
  kpi?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const accent =
    tone === "gold"
      ? "#ffd56a"
      : tone === "pink"
      ? "#ff7fe2"
      : tone === "green"
      ? "#7fe2a9"
      : tone === "blue"
      ? "#4fb4ff"
      : tone === "violet"
      ? "#9b7bff"
      : tone === "white"
      ? "#ffffff"
      : "rgba(255,255,255,0.92)";

  const bg =
    tone === "gold"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.20), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "pink"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(255,79,216,.18), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "green"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(127,226,169,.16), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "blue"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(79,180,255,.16), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : tone === "violet"
      ? "radial-gradient(120% 140% at 0% 0%, rgba(155,123,255,.16), transparent 55%), linear-gradient(180deg, rgba(20,20,24,.92), rgba(10,10,12,.98))"
      : "linear-gradient(180deg, rgba(22,22,26,.92), rgba(10,10,12,.98))";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        minWidth: 240,
        maxWidth: 280,
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background: bg,
        boxShadow: "0 14px 30px rgba(0,0,0,.55)",
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        opacity: disabled ? 0.55 : 1,
      }}
      title={cta}
      role="button"
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 950,
            border: `1px solid ${accent}55`,
            color: accent,
            background: "rgba(0,0,0,.35)",
            letterSpacing: 0.4,
            whiteSpace: "nowrap",
          }}
        >
          {tag}
        </span>

        {kpi ? (
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 950,
              border: `1px solid ${accent}44`,
              color: "rgba(255,255,255,.92)",
              background: `linear-gradient(180deg, ${accent}22, rgba(0,0,0,.30))`,
              whiteSpace: "nowrap",
            }}
          >
            {kpi}
          </span>
        ) : null}
      </div>

      <div style={{ fontWeight: 950, fontSize: 13 }}>{title}</div>
      {sub ? <div style={{ opacity: 0.82, fontSize: 11.5, marginTop: 2 }}>{sub}</div> : null}

      <div style={{ marginTop: 10 }}>
        <span
          style={{
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 950,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(0,0,0,.30)",
            color: "rgba(255,255,255,.92)",
          }}
        >
          {cta} →
        </span>
      </div>
    </div>
  );
}

/** --- Ticker actions --- */
function TickerRow({
  go,
  setFilter,
}: {
  go: (tab: any, params?: any) => void;
  setFilter: (k: FilterKey) => void;
}) {
  const tours = listTournamentsLocal() || [];
  const draft = tours.filter((t: any) => String(t?.status || "").toLowerCase().includes("draft"));

  const running = tours.filter((t: any) => {
    const s = String(t?.status || "").toLowerCase();
    return (
      s.includes("running") ||
      s.includes("playing") ||
      s.includes("in_progress") ||
      s.includes("en_cours") ||
      s.includes("active")
    );
  });

  // tournoi “à reprendre” : le plus récent en cours sinon le plus récent tout court
  const resumeTour: any = (running[0] || tours[0] || null);
  const resumeTid = resumeTour?.id ? String(resumeTour.id) : "";
  const resumeCounts = resumeTid ? computeCountsForTournament(resumeTid) : null;

  const canAuto = !!resumeCounts && (resumeCounts.playable ?? 0) > 0;

  const items = [
    {
      tag: "REPRENDRE",
      title: resumeTour ? (resumeTour?.name || "Tournoi") : "Aucun tournoi",
      sub: resumeTour
        ? `${String(resumeTour?.game?.mode || "mode").toUpperCase()} • ${fmtDate(resumeTour?.updatedAt || resumeTour?.createdAt)}`
        : "Crée un tournoi pour démarrer.",
      tone: "blue" as const,
      cta: "Ouvrir",
      kpi: resumeTour ? `${resumeCounts?.playable ?? 0} à jouer` : "—",
      onClick: resumeTour?.id ? () => go("tournament_view", { id: String(resumeTour.id) }) : undefined,
      disabled: !resumeTour?.id,
    },
    {
      tag: "AUTO",
      title: "Prochain match",
      sub: resumeTour
        ? canAuto
          ? "Ouvre le tournoi, puis ‘LANCER LE PROCHAIN MATCH’ (Résumé)."
          : "Aucun match jouable (attente vainqueur / BYE)."
        : "Crée un tournoi pour utiliser l’AUTO.",
      tone: "green" as const,
      cta: "Ouvrir",
      kpi: canAuto ? "Prêt" : "—",
      onClick: resumeTour?.id ? () => go("tournament_view", { id: String(resumeTour.id) }) : undefined,
      disabled: !resumeTour?.id,
    },
    {
      tag: "BROUILLONS",
      title: "Tournois en brouillon",
      sub: "Filtrer la liste sur les brouillons.",
      tone: "gold" as const,
      cta: "Afficher",
      kpi: `${draft.length}`,
      onClick: () => setFilter("draft"),
      disabled: false,
    },
    {
      tag: "BRACKET",
      title: "Bracket KO + poules",
      sub: "Vue claire + progression guidée.",
      tone: "pink" as const,
      cta: "Créer BRACKET",
      kpi: "KO+Poules",
      onClick: () => go("tournament_create", { preset: "bracket", mode: "bracket_ko_pools" }),
      disabled: false,
    },
    {
      tag: "CRÉER",
      title: "Génération AUTO des matchs",
      sub: "Tu choisis, l’app enchaîne.",
      tone: "violet" as const,
      cta: "Créer AUTO",
      kpi: "Auto",
      onClick: () => go("tournament_create", { preset: "auto", mode: "auto" }),
      disabled: false,
    },
    {
      tag: "ROADMAP",
      title: "Bye intelligent, Swiss…",
      sub: "Export / partage, double élimination, stats.",
      tone: "white" as const,
      cta: "Voir",
      kpi: "À venir",
      onClick: () => go("tournament_roadmap"),
      disabled: false,
    },
  ];

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.03)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 10,
          width: "max-content",
          animation: "dcTicker 22s linear infinite",
        }}
      >
        {items.concat(items).map((it, idx) => (
          <TickerCard
            key={idx}
            tag={it.tag}
            title={it.title}
            sub={it.sub}
            tone={it.tone as any}
            cta={it.cta}
            kpi={it.kpi}
            onClick={it.onClick}
            disabled={it.disabled || !it.onClick}
          />
        ))}
      </div>

      <style>
        {`
          @keyframes dcTicker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @media (prefers-reduced-motion: reduce) {
            div[style*="animation: dcTicker"] { animation: none !important; }
          }
        `}
      </style>
    </div>
  );
}

export default function TournamentsHome({ store, go, source = "local" }: Props) {
  const [filter, setFilter] = React.useState<FilterKey>("all");

  // ✅ NEW: liste “source de vérité” (IDB cache)
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const reload = React.useCallback(() => {
    setLoading(true);
    try {
      // listTournamentsLocal est sync (cache mémoire), mais on le traite comme un reload
      const list = listTournamentsLocal() || [];
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ FIX: reload au mount + event + focus + visibility
  React.useEffect(() => {
    reload();

    const onUpdated = () => reload();
    const onFocus = () => reload();
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };

    window.addEventListener(TOURNAMENTS_UPDATED_EVENT, onUpdated as any);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener(TOURNAMENTS_UPDATED_EVENT, onUpdated as any);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload]);

  // compat: si un autre endroit continue à pousser store.tournaments, on merge sans casser
  React.useEffect(() => {
    // (Optionnel) si ton store contient déjà des tournois, on s’aligne
    const anyStore: any = store as any;
    const legacy =
      anyStore?.tournaments ||
      anyStore?.tournamentsLocal ||
      anyStore?.tournamentsList ||
      null;

    if (Array.isArray(legacy) && legacy.length && (!items || items.length === 0)) {
      setItems(legacy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const tournaments = React.useMemo(() => items || [], [items]);

  const filtered = React.useMemo(() => {
    const list = Array.isArray(tournaments) ? tournaments : [];
    if (filter === "all") return list;

    const norm = (t: any): FilterKey => {
      const st = String(t?.status || "").toLowerCase();
      if (st.includes("draft") || st.includes("brouillon") || st.includes("new") || st.includes("config"))
        return "draft";
      if (
        st.includes("run") ||
        st.includes("progress") ||
        st.includes("en_cours") ||
        st.includes("ongoing") ||
        st.includes("active") ||
        st.includes("playing")
      )
        return "running";
      if (st.includes("done") || st.includes("finish") || st.includes("term") || st.includes("end"))
        return "done";
      return "draft";
    };

    return list.filter((t) => norm(t) === filter);
  }, [tournaments, filter]);

  const hasAny = (filtered?.length || 0) > 0;

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      {/* HEADER CARD */}
      <Card tone="gold">
        <div style={{ fontWeight: 950, fontSize: 20, letterSpacing: 0.5 }}>TOURNOIS</div>
        <div style={{ opacity: 0.82, fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>
          Crée des tournois en local (poules, élimination…), et reprends-les facilement avec une vue claire.
        </div>

        {/* Mini info “aucun tournoi” */}
        <div
          style={{
            marginTop: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.10)",
            background: "rgba(0,0,0,.25)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12.5, opacity: 0.9 }}>
            {loading ? (
              <>Chargement…</>
            ) : tournaments?.length ? (
              <>
                <b>{tournaments.length}</b> tournoi{tournaments.length > 1 ? "s" : ""} enregistré
                {tournaments.length > 1 ? "s" : ""}.
              </>
            ) : (
              <>
                Aucun tournoi pour <b>l’instant</b>
              </>
            )}
          </div>

          {/* bouton créer tournoi : 1 ligne, centré */}
          <button
            type="button"
            onClick={() => go("tournament_create")}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "12px 14px",
              border: "none",
              fontWeight: 950,
              letterSpacing: 1,
              fontSize: 13,
              textTransform: "uppercase",
              background: "linear-gradient(90deg, #ff4fd8, #ffd56a)",
              color: "#1b1508",
              boxShadow: "0 16px 30px rgba(0,0,0,.55)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            CREER TOURNOI
          </button>
        </div>

        {/* ✅ ticker UTILE + cliquable */}
        <TickerRow go={go} setFilter={setFilter} />
      </Card>

      {/* FILTER BAR (style pills) */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9, marginBottom: 8 }}>Filtrer</div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            borderRadius: 16,
            padding: 10,
            background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))",
            border: "1px solid rgba(255,255,255,.10)",
            boxShadow: "0 10px 26px rgba(0,0,0,.45)",
          }}
        >
          <button onClick={() => setFilter("all")} style={pillStyle(filter === "all", "#ffd56a")}>
            Tous
          </button>
          <button onClick={() => setFilter("draft")} style={pillStyle(filter === "draft", "#b0b0b0")}>
            Brouillons
          </button>
          <button onClick={() => setFilter("running")} style={pillStyle(filter === "running", "#ff4fd8")}>
            En cours
          </button>
          <button onClick={() => setFilter("done")} style={pillStyle(filter === "done", "#7fe2a9")}>
            Terminés
          </button>

          <div style={{ marginLeft: "auto", fontSize: 11.5, opacity: 0.75 }}>
            {loading ? "Chargement…" : "Tri : activité récente"}
          </div>
        </div>
      </div>

      {/* LIST */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9, marginBottom: 8 }}>Liste</div>

        {!hasAny ? (
          <Card tone="blue">
            <div style={{ fontWeight: 950, fontSize: 16, color: "#4fb4ff" }}>Aucun tournoi</div>
            <div style={{ opacity: 0.85, fontSize: 12.5, marginTop: 6, lineHeight: 1.35 }}>
              Crée ton premier tournoi : poules, matchs et progression seront rangés automatiquement.
              <br />
              Utilise le bouton <b>CREER TOURNOI</b> en haut.
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered
              .slice()
              .sort(
                (a: any, b: any) =>
                  Number(b?.updatedAt || b?.createdAt || 0) -
                  Number(a?.updatedAt || a?.createdAt || 0)
              )
              .map((t: any) => {
                const id = String(t?.id || t?.tournamentId || t?.tid || t?.code || "");
                const name = t?.name || "Tournoi";
                const mode = String(t?.game?.mode || t?.mode || t?.gameMode || "x01").toUpperCase();
                const status = String(t?.status || "draft");
                const updatedAt = Number(t?.updatedAt || t?.createdAt || Date.now());

                return (
                  <div
                    key={id || name + String(updatedAt)}
                    onClick={() => {
                      // ✅ FIX NAV: toujours passer l'id sous la clé "id"
                      if (id) go("tournament_view", { id });
                    }}
                    style={{
                      borderRadius: 18,
                      padding: 14,
                      background:
                        "radial-gradient(120% 160% at 0% 0%, rgba(255,79,216,.10), transparent 55%), linear-gradient(180deg, rgba(18,18,26,.96), rgba(10,10,12,.98))",
                      border: "1px solid rgba(255,255,255,.10)",
                      boxShadow: "0 16px 40px rgba(0,0,0,.60)",
                      cursor: id ? "pointer" : "default",
                      opacity: id ? 1 : 0.65,
                    }}
                    title={id ? "Ouvrir" : "ID manquant"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 950,
                            fontSize: 14,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </div>
                        <div style={{ opacity: 0.78, fontSize: 11.5, marginTop: 2 }}>
                          {mode} · {new Date(updatedAt).toLocaleString()}
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 950,
                          border: "1px solid rgba(255,255,255,.12)",
                          background: "rgba(0,0,0,.35)",
                          color: "#ffd56a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* note : source online (plus tard) */}
      {source === "online" ? (
        <div style={{ marginTop: 12, opacity: 0.7, fontSize: 11.5 }}>
          (Online) Rejoindre via code arrivera ici plus tard.
        </div>
      ) : null}
    </div>
  );
}
