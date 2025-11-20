// ============================================
// src/pages/Home.tsx
// Accueil + Carte profil (stats unifiées)
// - Médaillon avatar centré & ring d’étoiles
// - Lecture instantanée des stats via statsLiteIDB
// - Thème piloté par ThemeContext
// - Textes pilotés par LangContext (t())
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
import { useLang } from "../contexts/LangContext";

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
  update, // gardé pour compat avec App, même si pas utilisé ici
  go,
  showConnect = true,
  onConnect,
}: {
  store: Store;
  update?: (fn: any) => void;
  go: (tab: Tab, params?: any) => void;
  showConnect?: boolean;
  onConnect?: () => void;
}) {
  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active = profiles.find((p) => p.id === activeProfileId) ?? null;

  const basicStats = active?.id ? useBasicStats(active.id) : undefined;

  // 🌐 Auth online
  const { status: onlineStatus } = useAuthOnline();
  const isSignedIn = onlineStatus === "signed_in";
  const localStatus = (store?.selfStatus as any) || "offline";

  let mergedStatus: "online" | "away" | "offline" = "offline";
  if (!isSignedIn) mergedStatus = "offline";
  else if (localStatus === "away") mergedStatus = "away";
  else mergedStatus = "online";

  const { theme } = useTheme();
  const { t } = useLang();

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
      {/* Styles responsives & petites variables */}
      <style>{`
        .home-page {
          --title-min: 28px;
          --title-ideal: 8vw;
          --title-max: 44px;
          --card-pad: 16px;
          --menu-gap: 10px;
          --avatar-size: 92px;
          --avatar-scale: 1.06;
          --avatar-dx: 0px;
          --avatar-dy: 0px;
          --bottomnav-h: 70px;
          --menu-title: 16px;
          --menu-sub: 12.5px;
        }
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
        @media (min-width: 640px) {
          .home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--menu-gap); }
        }
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

      {/* ===== HERO / CARTE PROFIL ===== */}
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
          {t("home.welcome", "Bienvenue")}
        </div>

        <h1
          className="title-xl"
          style={{
            fontSize: "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
            lineHeight: 1.05,
            margin: "4px 0 6px",
            color: theme.primary,
            textShadow: `0 6px 18px ${theme.primary}55`,
            whiteSpace: "normal",
            wordBreak: "break-word",
            paddingInline: 8,
            maxWidth: "100%",
          }}
        >
          {t("home.title", "DARTS COUNTER")}
        </h1>

        {!active && showConnect ? (
          <button
            className="btn primary"
            style={{
              fontSize: 15,
              padding: "10px 22px",
              borderRadius: 14,
              boxShadow: `0 0 18px ${theme.primary}55`,
              border: "none",
              background: theme.primary,
              color: "#000",
              fontWeight: 700,
            }}
            onClick={onConnect ?? (() => go("profiles"))}
          >
            {t("home.connect", "SE CONNECTER")}
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

      {/* ===== ACCÈS RAPIDES (4 cartes) ===== */}
      <div
        className="list home-grid"
        style={{
          width: "100%",
          maxWidth: 520,
          gap: "var(--menu-gap)",
          display: "flex",
          flexDirection: "column",
          paddingInline: 12,
        }}
      >
        <HomeCard
          title={t("home.card.profiles.title", "PROFILS")}
          subtitle={t(
            "home.card.profiles.subtitle",
            "Création et gestion de profils"
          )}
          icon={<Icon name="profiles" size={24} />}
          onClick={() => go("profiles")}
        />
        <HomeCard
          title={t("home.card.local.title", "JEU LOCAL")}
          subtitle={t(
            "home.card.local.subtitle",
            "Accède à tous les modes de jeu"
          )}
          icon={<Icon name="target" size={24} />}
          onClick={() => go("games")}
        />
        <HomeCard
          title={t("home.card.online.title", "JEU ONLINE")}
          subtitle={t(
            "home.card.online.subtitle",
            "Parties à distance (mode à venir)"
          )}
          icon={<Icon name="online" size={24} />}
          onClick={() => go("friends")}
        />
        <HomeCard
          title={t("home.card.stats.title", "STATS")}
          subtitle={t(
            "home.card.stats.subtitle",
            "Statistiques et historiques"
          )}
          icon={<Icon name="stats" size={24} />}
          onClick={() => go("stats")}
        />
      </div>

      {/* Espace pour la BottomNav */}
      <div style={{ height: "var(--bottomnav-h)" }} />
    </div>
  );
}

/* ---------- Stats lite ---------- */
function useBasicStats(playerId: string) {
  const getSnap = React.useCallback(
    () => (playerId ? getBasicProfileStatsSync(playerId) : undefined),
    [playerId]
  );

  const [state, setState] = React.useState(getSnap);

  React.useEffect(() => {
    setState(getSnap());

    const onLiteChanged = (e: any) => {
      const pid = e?.detail?.playerId;
      if (!playerId || !pid || pid === playerId || pid === "*") {
        setState(getSnap());
      }
    };
    window.addEventListener("stats-lite:changed", onLiteChanged as any);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key && ev.key.startsWith("dc:statslite:")) {
        setState(getSnap());
      }
    };
    window.addEventListener("storage", onStorage);

    let ticks = 0;
    const id = window.setInterval(() => {
      ticks++;
      setState(getSnap());
      if (ticks > 10) window.clearInterval(id);
    }, 2000);

    return () => {
      window.removeEventListener("stats-lite:changed", onLiteChanged as any);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, [playerId, getSnap]);

  return state;
}

/* ---------- Carte profil + ring étoiles ---------- */
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
  const { theme } = useTheme();
  const { t } = useLang();

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
    : 0; // ✅ ternary corrigé

  const winRate = isNum(basicStats?.winRate)
    ? basicStats!.winRate
    : games > 0
    ? Math.round((wins / games) * 1000) / 10
    : null;

  const avg3 = (Math.round(avg3n * 10) / 10).toFixed(1);
  const best = String(bestVisit || 0);
  const co = String(bestCheckout || 0);

  // mapping statut -> label + couleur FIXE (indépendante du thème)
  const statusConfig: Record<
    "online" | "away" | "offline",
    { label: string; color: string }
  > = {
    online: {
      label: t("status.online", "En ligne"),
      color: "#3DFF9C", // vert néon
    },
    away: {
      label: t("status.away", "Absent"),
      color: "#F6C256", // jaune / orangé
    },
    offline: {
      label: t("status.offline", "Hors ligne"),
      color: "#9AA0AA", // gris
    },
  };

  const { label: statusLabel, color: statusColor } = statusConfig[status];

  const AVA = getCssNumber("--avatar-size", 92);
  const PAD = 10;
  const STAR = 14;

  return (
    <div
      className="card"
      style={{
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        background: `linear-gradient(180deg, ${theme.primary}40, ${theme.primary}20)`,
        borderColor: theme.primary,
        borderWidth: 1,
        borderStyle: "solid",
        borderRadius: 18,
        padding: 16,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 8px 25px ${theme.primary}33`,
        gap: 6,
      }}
    >
      {/* Médaillon avatar + ring étoiles */}
      <div
        style={{
          position: "relative",
          width: "var(--avatar-size)",
          height: "var(--avatar-size)",
          marginBottom: 6,
        }}
      >
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
            gapPx={-2}
            starSize={STAR}
            stepDeg={10}
            rotationDeg={0}
            avg3d={avg3n}
          />
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${theme.primary}88`,
            boxShadow: `0 0 20px ${theme.primary}55`,
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

          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: `inset 0 0 0 3px ${theme.primary}40`,
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
          color: theme.primary,
          fontWeight: 900,
          fontSize: 20,
          textShadow: `0 0 12px ${theme.primary}55`,
        }}
        title={t("home.seeStats", "Voir mes statistiques")}
      >
        {profile.name}
      </button>

      {/* Statut */}
      <div
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

      {/* Stats du joueur */}
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
        <StatMini label={t("home.stats.avg3", "Moy/3")} value={avg3} />
        <StatMini label={t("home.stats.best", "Best")} value={best} />
        <StatMini label={t("home.stats.co", "CO")} value={co} />
        <StatMini
          label={t("home.stats.winPct", "Win%")}
          value={winRate !== null ? `${Math.round(Number(winRate))}%` : "—"}
        />
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
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
          color: theme.primary,
          textShadow: `0 0 8px ${theme.primary}55`,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- Carte menu ---------- */
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
          color: theme.primary,
          fontWeight: 900,
          letterSpacing: 0.6,
          fontSize: "var(--menu-title)",
          textShadow: `0 0 12px ${theme.primary}55`,
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