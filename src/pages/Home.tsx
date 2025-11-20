// ============================================
// src/pages/Home.tsx
// Accueil + Carte profil (stats unifiées)
// - Médaillon avatar centré & zoom anti-bords (cover + scale)
// - Layout mobile sans scroll + variante ultra-compacte
// - Grille 2 colonnes sur tablette
// - [NEW] Couronne d’étoiles EXTERNE autour du médaillon (ProfileStarRing)
// - [NEW] Lecture instantanée des stats via statsLiteIDB (mini-cache sync)
// - [THEME] Couleurs pilotées par ThemeContext
// ============================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import type { Store, Profile } from "../lib/types";
import {
  getBasicProfileStatsSync,
  type BasicProfileStats,
} from "../lib/statsLiteIDB";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { useTheme } from "../contexts/ThemeContext";

type Tab =
  | "home"
  | "games"
  | "profiles"
  | "friends"
  | "all"
  | "stats"
  | "settings"
  | "x01setup"
  | "x01"
  | "cricket"
  | "killer"
  | "shanghai"
  | "lobby";

export default function Home({
  store,
  go,
  showConnect = true,
  onConnect,
}: {
  store: Store;
  go: (tab: Tab) => void;
  showConnect?: boolean;
  onConnect?: () => void;
}) {
  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active = profiles.find((p) => p.id === activeProfileId) ?? null;

  const basicStats = active?.id ? useBasicStats(active.id) : undefined;

  // 🌐 Auth online (mock ou futur backend)
  const { status: onlineStatus } = useAuthOnline();
  const isSignedIn = onlineStatus === "signed_in";

  // statut local (selfStatus dans le store : "online" | "away" | "offline")
  const localStatus = (store?.selfStatus as any) || "offline";

  // statut combiné (session + selfStatus)
  let mergedStatus: "online" | "away" | "offline" = "offline";
  if (!isSignedIn) {
    mergedStatus = "offline";
  } else if (localStatus === "away") {
    mergedStatus = "away";
  } else {
    mergedStatus = "online";
  }

  // 🎨 Thème global
  const { theme } = useTheme();

  return (
    <div
      className="home-page container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 0,
        gap: 12,
        textAlign: "center",
        overflow: "hidden",
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* ---- Styles responsives & variables ---- */}
      <style>{`
        .home-page {
          --title-min: 28px;
          --title-ideal: 8vw;
          --title-max: 44px;
          --card-pad: 16px;
          --menu-gap: 10px;
          --avatar-size: 92px;
          --avatar-scale: 1.06; /* léger zoom pour manger les bords transparents */
          --avatar-dx: 0px;     /* micro-réglage optionnel horizontal */
          --avatar-dy: 0px;     /* micro-réglage optionnel vertical */
          --bottomnav-h: 70px;
          --menu-title: 16px;
          --menu-sub: 12.5px;
        }
        /* Ultra-compact: petits téléphones / faible hauteur */
        @media (max-height: 680px), (max-width: 360px) {
          .home-page {
            --title-min: 24px;
            --title-ideal: 7vw;
            --title-max: 36px;
            --card-pad: 12px;
            --menu-gap: 8px;
            --avatar-size: 80px;
            --menu-title: 15px;
            --menu-sub: 11.5px;
            --bottomnav-h: 64px;
          }
        }
        /* Tablette: élargir et basculer les cartes en 2 colonnes */
        @media (min-width: 640px) {
          .home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--menu-gap); }
        }

        /* Petit scintillement néon du point de statut */
        @keyframes homeStatusFlicker {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.85;
          }
        }
      `}</style>

      {/* ===== HERO ===== */}
      <div
        className="card"
        style={{
          padding: "var(--card-pad)",
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 18px 36px rgba(0,0,0,.40)",
          gap: 8,
          background: theme.card,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
        }}
      >
        <div
          className="title-accent"
          style={{ marginBottom: 0, color: theme.textSoft }}
        >
          Bienvenue
        </div>

        <h1
          className="title-xl"
          style={{
            fontSize: "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
            lineHeight: 1.05,
            margin: "4px 0 6px",
            color: "var(--gold-2)",
            textShadow: "0 6px 18px rgba(240,177,42,.35)",
            whiteSpace: "normal",
            wordBreak: "break-word",
            paddingInline: 8,
            maxWidth: "100%",
          }}
        >
          DARTS COUNTER
        </h1>

        {!active && showConnect ? (
          <button
            className="btn primary"
            style={{
              fontSize: 15,
              padding: "10px 22px",
              borderRadius: 14,
              boxShadow: "0 0 18px rgba(240,177,42,.22)",
            }}
            onClick={onConnect ?? (() => go("profiles"))}
          >
            SE CONNECTER
          </button>
        ) : active ? (
          <ActiveProfileCard
            profile={active}
            status={mergedStatus}
            onNameClick={() => go("stats")}
            basicStats={basicStats}
          />
        ) : null}
      </div>

      {/* ===== ACCÈS RAPIDES (SANS bloc Réglages) ===== */}
      <div
        className="list home-grid"
        style={{
          width: "100%",
          maxWidth: 520,
          gap: "var(--menu-gap)",
          display: "flex", // remplacé par grid >=640px via .home-grid
          flexDirection: "column",
          paddingInline: 12,
        }}
      >
        <HomeCard
          title="PROFILS"
          subtitle="Création et gestion de profils"
          icon={<Icon name="profiles" size={24} />}
          onClick={() => go("profiles")}
        />
        <HomeCard
          title="JEU LOCAL"
          subtitle="Accède à tous les modes de jeu"
          icon={<Icon name="target" size={24} />}
          onClick={() => go("games")}
        />
        <HomeCard
          title="JEU ONLINE"
          subtitle="Parties à distance (mode à venir)"
          icon={<Icon name="online" size={24} />}
          onClick={() => go("friends")}
        />
        <HomeCard
          title="STATS"
          subtitle="Statistiques et historiques"
          icon={<Icon name="stats" size={24} />}
          onClick={() => go("stats")}
        />
      </div>

      {/* Spacer bas = hauteur BottomNav */}
      <div style={{ height: "var(--bottomnav-h)" }} />
    </div>
  );
}

/* ---------- PATCH: lecture réactive depuis statsLiteIDB ---------- */
function useBasicStats(playerId: string) {
  const getSnap = React.useCallback(
    () => (playerId ? getBasicProfileStatsSync(playerId) : undefined),
    [playerId]
  );

  const [state, setState] = React.useState(getSnap);

  React.useEffect(() => {
    // maj immédiate (ex: après avoir changé de profil actif)
    setState(getSnap());

    // 1) écoute un évent custom (émis par statsLiteIDB lors d’un upsert)
    const onLiteChanged = (e: any) => {
      const pid = e?.detail?.playerId;
      if (!playerId || !pid || pid === playerId || pid === "*") {
        setState(getSnap());
      }
    };
    window.addEventListener("stats-lite:changed", onLiteChanged as any);

    // 2) fallback navigateur (storage event entre onglets / PWA SW)
    const onStorage = (ev: StorageEvent) => {
      if (ev.key && ev.key.startsWith("dc:statslite:")) {
        setState(getSnap());
      }
    };
    window.addEventListener("storage", onStorage);

    // 3) ultime filet de sécu: petit polling court (si aucun event ne part)
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks++;
      setState(getSnap());
      if (ticks > 10) window.clearInterval(id); // ~20s max
    }, 2000);

    return () => {
      window.removeEventListener("stats-lite:changed", onLiteChanged as any);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, [playerId, getSnap]);

  return state; // { games, darts, avg3, bestVisit, bestCheckout, wins, winRate? }
}

/* ---------- Carte dorée du profil connecté + RING ÉTOILES ---------- */
function ActiveProfileCard({
  profile,
  status,
  onNameClick,
  basicStats,
}: {
  profile: Profile;
  status: "online" | "away" | "offline";
  onNameClick: () => void;
  basicStats?: BasicProfileStats;
}) {
  // Fallback legacy si jamais des anciennes cartes poussent encore des valeurs
  const legacy = (profile as any).stats || {};
  const avg3n = isNum(basicStats?.avg3)
    ? basicStats!.avg3
    : isNum(legacy.avg3)
    ? legacy.avg3
    : 0;
  const bestVisit = isNum(basicStats?.bestVisit)
    ? basicStats!.bestVisit
    : isNum(legacy.bestVisit)
    ? legacy.bestVisit
    : 0;
  const bestCheckout = isNum(basicStats?.bestCheckout)
    ? basicStats!.bestCheckout
    : isNum(legacy.bestCheckout)
    ? legacy.bestCheckout
    : 0;

  const wins = isNum(basicStats?.wins)
    ? basicStats!.wins
    : isNum(legacy.wins)
    ? legacy.wins
    : 0;
  const games = isNum(basicStats?.games)
    ? basicStats!.games
    : isNum(legacy.games)
    ? legacy.games
    : 0;
  const winRate = isNum(basicStats?.winRate)
    ? basicStats!.winRate
    : games > 0
    ? Math.round((wins / games) * 1000) / 10
    : null;

  const avg3 = (Math.round(avg3n * 10) / 10).toFixed(1);
  const best = String(bestVisit || 0);
  const co = String(bestCheckout || 0);

  const statusLabel =
    status === "away"
      ? "Absent"
      : status === "offline"
      ? "Hors ligne"
      : "En ligne";

  const statusColor =
    status === "away"
      ? "var(--gold-2)"
      : status === "offline"
      ? "#9aa"
      : "var(--ok)";

  // === Paramètres ring externe (alignés avec Profiles.tsx) ===
  const AVA = getCssNumber("--avatar-size", 92); // diamètre avatar réel en px
  const PAD = 10; // marge externe pour laisser respirer les étoiles
  const STAR = 14; // taille d’une étoile

  return (
    <div
      className="card"
      style={{
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        background:
          "linear-gradient(180deg, rgba(240,177,42,.25), rgba(240,177,42,.10))",
        borderColor: "rgba(240,177,42,.45)",
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 18,
        padding: 16,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 25px rgba(240,177,42,.15)",
        gap: 6,
      }}
    >
      {/* ===== Médaillon + RING EXTERNE (non-clippé) ===== */}
      <div
        style={{
          position: "relative",
          width: "var(--avatar-size)",
          height: "var(--avatar-size)",
          marginBottom: 6,
        }}
      >
        {/* RING d’étoiles placé DANS le wrapper (pas clipé par overflow) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -(PAD + STAR / 2),
            top: -(PAD + STAR / 2),
            width: AVA + (PAD + STAR / 2) * 2,
            height: AVA + (PAD + STAR / 2) * 2,
            pointerEvents: "none",
          }}
        >
          <ProfileStarRing
            anchorSize={AVA}
            gapPx={-2} // proche du bord du médaillon
            starSize={STAR}
            stepDeg={10}
            rotationDeg={0}
            avg3d={avg3n}
          />
        </div>

        {/* CERCLE AVATAR — c’est lui qui clippe l’image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid rgba(240,177,42,.5)",
            boxShadow: "0 0 20px rgba(240,177,42,.25)",
            overflow: "hidden",
            background: "#000",
          }}
          aria-label="avatar-medallion"
        >
          {(profile as any).avatarDataUrl ? (
            <img
              src={(profile as any).avatarDataUrl}
              alt={profile.name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "50% 50%",
                transform: `translate(var(--avatar-dx), var(--avatar-dy)) scale(var(--avatar-scale))`,
                transformOrigin: "50% 50%",
                display: "block",
                background: "transparent",
              }}
              draggable={false}
            />
          ) : (
            <ProfileAvatar
              size={AVA}
              dataUrl={undefined}
              label={profile.name[0]?.toUpperCase()}
              showStars={false}
            />
          )}

          {/* anneau décoratif interne */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: "inset 0 0 0 3px rgba(240,177,42,.25)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Nom cliquable */}
      <button
        className="btn ghost"
        onClick={onNameClick}
        style={{
          padding: 0,
          margin: 0,
          color: "var(--gold-2)",
          fontWeight: 900,
          fontSize: 20,
          textShadow: "0 0 12px rgba(240,177,42,.35)",
        }}
        title="Voir mes statistiques"
      >
        {profile.name}
      </button>

      {/* Statut avec point néon */}
      <div
        className="subtitle"
        style={{
          marginTop: 0,
          fontSize: 13,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "center",
          color: statusColor,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}, 0 0 14px ${statusColor}`,
            animation: "homeStatusFlicker 1.8s ease-in-out infinite",
          }}
        />
        <span
          style={{
            textShadow: `0 0 6px ${statusColor}, 0 0 12px ${statusColor}`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          marginTop: 6,
          fontSize: 12,
          color: "rgba(255,255,255,.9)",
          flexWrap: "wrap",
        }}
      >
        <StatMini label="Moy/3" value={avg3} />
        <StatMini label="Best" value={best} />
        <StatMini label="CO" value={co} />
        <StatMini
          label="Win%"
          value={winRate !== null ? `${Math.round(Number(winRate))}%` : "—"}
        />
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        className="subtitle"
        style={{ fontSize: 10.5, opacity: 0.8, lineHeight: 1.1 }}
      >
        {label}
      </div>
      <div
        style={{
          fontWeight: 800,
          color: "var(--gold-2)",
          textShadow: "0 0 8px rgba(240,177,42,.3)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function HomeCard({
  title,
  subtitle,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <button
      className="item"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        paddingTop: 14,
        paddingBottom: 14,
        paddingInline: 10,
        background: theme.card,
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.75 : 1,
        textAlign: "center",
        transition: "all .2s ease",
      }}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.boxShadow =
          "0 0 18px rgba(240,177,42,.18), 0 8px 18px rgba(0,0,0,.38)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        className="badge"
        aria-hidden
        style={{
          width: 50,
          height: 50,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,.05)",
          color: theme.text,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: "var(--gold-2)",
          fontWeight: 900,
          letterSpacing: 0.6,
          fontSize: "var(--menu-title)",
          textShadow: "0 0 12px rgba(240,177,42,.4)",
        }}
      >
        {title}
      </div>

      <div
        className="subtitle"
        style={{
          marginTop: 0,
          maxWidth: 420,
          fontSize: "var(--menu-sub)",
          lineHeight: 1.3,
          color: theme.textSoft,
        }}
      >
        {subtitle}
      </div>
    </button>
  );
}

/* ---------- Icônes ---------- */
function Icon({
  name,
  size = 22,
}: {
  name: "profiles" | "target" | "online" | "stats";
  size?: number;
}) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (name) {
    case "profiles":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 20a6.5 6.5 0 0 1 16 0" />
          <circle {...p} cx="12" cy="8" r="3.6" />
        </svg>
      );
    case "target":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="12" r="9" />
          <circle {...p} cx="12" cy="12" r="5.5" />
          <circle {...p} cx="12" cy="12" r="2" fill="currentColor" />
          <path {...p} d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      );
    case "online":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle {...p} cx="12" cy="12" r="8" />
          <path {...p} d="M2 12h20" />
          <path {...p} d="M12 2a15 15 0 0 1 0 20" />
          <path {...p} d="M12 2a15 15 0 0 0 0 20" />
        </svg>
      );
    case "stats":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path {...p} d="M4 20V7" />
          <path {...p} d="M10 20V4" />
          <path {...p} d="M16 20v-6" />
          <path {...p} d="M22 20V9" />
        </svg>
      );
  }
  return null;
}

/* ---------- Utils ---------- */
function isNum(v: any): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}
function getCssNumber(varName: string, fallback = 0): number {
  try {
    const v = getComputedStyle(
      document.documentElement
    ).getPropertyValue(varName).trim();
    const n = parseFloat(v.replace("px", ""));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}