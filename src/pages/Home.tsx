// ============================================
// src/pages/Home.tsx
// Accueil + Carte profil (stats unifiées)
// - Médaillon avatar centré & ring d’étoiles
// - Lecture instantanée des stats via statsLiteIDB
// - Thème piloté par ThemeContext
// - Textes pilotés par LangContext (t())
// - Si aucun compte actif :
//   * bouton "SE CONNECTER" ouvre un modal flottant
//   * accès aux cartes Jeux/Online/Stats BLOQUÉ
//   * ouverture auto du modal au premier lancement
// - Médaillon : petit drapeau du pays (si renseigné)
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
  update, // gardé pour compat avec App
  go,
  showConnect = true,
  onConnect,
}: {
  store: Store;
  update?: (fn: (s: Store) => Store) => void;
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

  // Y a-t-il au moins un compte créé (email) ?
  const hasAccount = profiles.some(
    (p) => !!((p as any).privateInfo?.email && (p as any).privateInfo?.password)
  );
  const isLocked = !active; // tant qu’il n’y a pas de profil connecté, on verrouille

  // Modal d’auth
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Au premier lancement / si aucun compte & aucun actif -> on ouvre direct le modal
  React.useEffect(() => {
    if (!active && !hasAccount) {
      setShowAuthModal(true);
    }
  }, [active, hasAccount]);

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
          {t("home.greeting", "Bienvenue")}
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
          {t("home.titleApp", "DARTS COUNTER")}
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
            onClick={() => setShowAuthModal(true)}
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
          locked={false} // toujours accessible
        />
        <HomeCard
          title={t("home.card.local.title", "JEU LOCAL")}
          subtitle={
            isLocked
              ? t(
                  "home.card.local.locked",
                  "Connecte-toi pour accéder aux modes de jeu."
                )
              : t(
                  "home.card.local.subtitle",
                  "Accède à tous les modes de jeu"
                )
          }
          icon={<Icon name="target" size={24} />}
          onClick={() => !isLocked && go("games")}
          locked={isLocked}
        />
        <HomeCard
          title={t("home.card.online.title", "JEU ONLINE")}
          subtitle={
            isLocked
              ? t(
                  "home.card.online.locked",
                  "Connecte-toi pour jouer en ligne."
                )
              : t(
                  "home.card.online.subtitle",
                  "Parties à distance (mode à venir)"
                )
          }
          icon={<Icon name="online" size={24} />}
          onClick={() => !isLocked && go("friends")}
          locked={isLocked}
        />
        <HomeCard
          title={t("home.card.stats.title", "STATS")}
          subtitle={
            isLocked
              ? t(
                  "home.card.stats.locked",
                  "Connecte-toi pour voir tes statistiques."
                )
              : t(
                  "home.card.stats.subtitle",
                  "Statistiques et historiques"
                )
          }
          icon={<Icon name="stats" size={24} />}
          onClick={() => !isLocked && go("stats")}
          locked={isLocked}
        />
      </div>

      {/* Espace pour la BottomNav */}
      <div style={{ height: "var(--bottomnav-h)" }} />

      {/* ===== MODAL AUTH ===== */}
      {showAuthModal && (
        <AuthModal
          store={store}
          update={update}
          onClose={() => setShowAuthModal(false)}
          onConnected={() => {
            setShowAuthModal(false);
            onConnect?.();
          }}
        />
      )}
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
    : 0;

  const winRate = isNum(basicStats?.winRate)
    ? basicStats!.winRate
    : games > 0
    ? Math.round((wins / games) * 1000) / 10
    : null;

  const avg3 = (Math.round(avg3n * 10) / 10).toFixed(1);
  const best = String(bestVisit || 0);
  const co = String(bestCheckout || 0);

  const statusConfig: Record<
    "online" | "away" | "offline",
    { label: string; color: string }
  > = {
    online: {
      label: t("status.online", "En ligne"),
      color: "#3DFF9C",
    },
    away: {
      label: t("status.away", "Absent"),
      color: "#F6C256",
    },
    offline: {
      label: t("status.offline", "Hors ligne"),
      color: "#9AA0AA",
    },
  };

  const { label: statusLabel, color: statusColor } = statusConfig[status];

  const AVA = getCssNumber("--avatar-size", 92);
  const PAD = 10;
  const STAR = 14;

  const privateInfo = ((profile as any).privateInfo || {}) as any;
  const countryRaw = privateInfo.country || "";
  const countryFlag = getCountryFlag(countryRaw);

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

        {/* Petit drapeau pays CENTRÉ EN BAS */}
        {countryFlag && (
          <div
            style={{
              position: "absolute",
              bottom: -15,
              left: "50%",
              transform: "translateX(-50%)",
              width: 23,
              height: 23,
              borderRadius: "50%",
              border: "2px solid #000",
              overflow: "hidden",
              boxShadow: `0 0 10px ${theme.primary}66`,
              background: "#111",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              {countryFlag}
            </span>
          </div>
        )}
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
  locked,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick?: () => void;
  locked?: boolean;
}) {
  const { theme } = useTheme();

  const disabled = !!locked;

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
        opacity: disabled ? 0.55 : 1,
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

/* ---------- MODAL AUTH ---------- */

function AuthModal({
  store,
  update,
  onClose,
  onConnected,
}: {
  store: Store;
  update?: (fn: (s: Store) => Store) => void;
  onClose: () => void;
  onConnected?: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();

  // Login existant
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Création de compte
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const [profileName, setProfileName] = React.useState("");
  const [createEmail, setCreateEmail] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("");
  const [createPassword2, setCreatePassword2] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isBusy, setIsBusy] = React.useState(false);

  React.useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    readFileAsDataUrl(avatarFile).then((url) => setAvatarPreview(url));
  }, [avatarFile]);

  const profiles = store?.profiles ?? [];

  function handleLogin() {
    setLoginError(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError(
        t(
          "auth.error.required",
          "Merci de renseigner l’email et le mot de passe."
        )
      );
      return;
    }

    const emailNorm = loginEmail.trim().toLowerCase();
    const found =
      profiles.find((p) => {
        const pi = ((p as any).privateInfo || {}) as any;
        const pe = (pi.email || "").toLowerCase();
        return pe === emailNorm;
      }) || null;

    const passOk =
      found && ((found as any).privateInfo?.password || "") === loginPassword;

    if (!found || !passOk) {
      setLoginError(
        t(
          "auth.error.invalid",
          "Email ou mot de passe incorrect."
        )
      );
      return;
    }

    if (!update) {
      onConnected?.();
      onClose();
      return;
    }

    update((s) => ({
      ...s,
      activeProfileId: found.id,
    }));

    onConnected?.();
    onClose();
  }

  async function handleCreate() {
    setCreateError(null);
    if (
      !profileName.trim() ||
      !createEmail.trim() ||
      !createPassword.trim() ||
      !createPassword2.trim() ||
      !country.trim()
    ) {
      setCreateError(
        t(
          "auth.error.requiredAll",
          "Merci de renseigner tous les champs obligatoires, y compris le pays."
        )
      );
      return;
    }
    if (createPassword !== createPassword2) {
      setCreateError(
        t(
          "auth.error.passwordMismatch",
          "Les mots de passe ne correspondent pas."
        )
      );
      return;
    }

    const emailNorm = createEmail.trim().toLowerCase();
    const exists = profiles.some((p) => {
      const pi = ((p as any).privateInfo || {}) as any;
      return (pi.email || "").toLowerCase() === emailNorm;
    });
    if (exists) {
      setCreateError(
        t(
          "auth.error.emailExists",
          "Un compte existe déjà avec cet email."
        )
      );
      return;
    }

    if (!update) {
      onConnected?.();
      onClose();
      return;
    }

    setIsBusy(true);
    try {
      let avatarDataUrl: string | undefined;
      if (avatarFile) {
        avatarDataUrl = await readFileAsDataUrl(avatarFile);
      }

      const id = crypto.randomUUID();

      update((s) => {
        const baseProfiles = s.profiles ?? [];
        const newProfile: any = {
          id,
          name: profileName.trim(),
          avatarDataUrl,
          privateInfo: {
            email: createEmail.trim(),
            password: createPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            birthDate: birthDate.trim(),
            country: country.trim(),
          },
        };
        return {
          ...s,
          profiles: [...baseProfiles, newProfile as Profile],
          activeProfileId: id,
        };
      });

      onConnected?.();
      onClose();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.70)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 22,
          background: theme.bg,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 24px 64px rgba(0,0,0,.80)",
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="row-between"
          style={{
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: theme.primary,
            }}
          >
            {t("auth.title", "Connexion / Compte")}
          </div>
          <button
            className="btn sm"
            onClick={onClose}
            style={{ borderRadius: 999 }}
          >
            ✕
          </button>
        </div>

        {/* Bloc : Se connecter */}
        <section
          style={{
            borderRadius: 18,
            padding: 14,
            marginBottom: 14,
            background: theme.card,
            border: `1px solid ${theme.borderSoft}`,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: theme.primary,
              marginBottom: 4,
            }}
          >
            {t("auth.login.title", "Se connecter")}
          </h2>
          <p
            className="subtitle"
            style={{ fontSize: 12, color: theme.textSoft, marginBottom: 10 }}
          >
            {t(
              "auth.login.subtitle",
              "Entre l’email et le mot de passe de ton compte existant."
            )}
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            <AuthField
              placeholder={t(
                "auth.login.email",
                "Adresse mail"
              )}
              value={loginEmail}
              onChange={setLoginEmail}
              type="email"
            />
            <AuthField
              placeholder={t(
                "auth.login.password",
                "Mot de passe"
              )}
              value={loginPassword}
              onChange={setLoginPassword}
              type="password"
            />
          </div>

          {loginError && (
            <div
              className="subtitle"
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#ff6b6b",
              }}
            >
              {loginError}
            </div>
          )}

          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button
              className="btn primary sm"
              onClick={handleLogin}
              style={{
                paddingInline: 18,
                borderRadius: 14,
                background: theme.primary,
                color: "#000",
                fontWeight: 700,
              }}
            >
              {t("auth.login.submit", "Connexion")}
            </button>
          </div>
        </section>

        {/* Bloc : Créer un compte */}
        <section
          style={{
            borderRadius: 18,
            padding: 14,
            background: theme.card,
            border: `1px solid ${theme.borderSoft}`,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: theme.primary,
              marginBottom: 4,
            }}
          >
            {t("auth.create.title", "Créer un compte")}
          </h2>
          <p
            className="subtitle"
            style={{ fontSize: 12, color: theme.textSoft, marginBottom: 10 }}
          >
            {t(
              "auth.create.subtitle",
              "Un compte est lié à un profil local et à toutes ses statistiques."
            )}
          </p>

          {/* Ligne avatar + pseudo */}
          <div
            className="row"
            style={{
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                border: `1px solid ${theme.borderSoft}`,
                display: "grid",
                placeItems: "center",
                background: "#080910",
                cursor: "pointer",
                flex: "0 0 auto",
              }}
            >
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) =>
                  setAvatarFile(e.target.files?.[0] ?? null)
                }
              />
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <span
                  className="subtitle"
                  style={{ fontSize: 11, color: theme.textSoft }}
                >
                  {t("auth.create.avatar", "Avatar")}
                </span>
              )}
            </label>

            <div style={{ flex: 1, minWidth: 160 }}>
              <AuthField
                placeholder={t(
                  "auth.create.profileName",
                  "Nom du profil (pseudo affiché)"
                )}
                value={profileName}
                onChange={setProfileName}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
            }}
          >
            <AuthField
              placeholder={t(
                "auth.create.email",
                "Adresse mail"
              )}
              value={createEmail}
              onChange={setCreateEmail}
              type="email"
            />

            <div
              className="row"
              style={{ gap: 8, flexWrap: "wrap" }}
            >
              <AuthField
                placeholder={t(
                  "auth.create.password",
                  "Mot de passe"
                )}
                value={createPassword}
                onChange={setCreatePassword}
                type="password"
              />
              <AuthField
                placeholder={t(
                  "auth.create.passwordConfirm",
                  "Confirmer"
                )}
                value={createPassword2}
                onChange={setCreatePassword2}
                type="password"
              />
            </div>

            {/* Pays obligatoire */}
            <AuthField
              placeholder={t(
                "auth.create.country",
                "Pays (FR, BE, UK, ... ou nom du pays)"
              )}
              value={country}
              onChange={setCountry}
            />

            <div
              className="row"
              style={{ gap: 8, flexWrap: "wrap" }}
            >
              <AuthField
                placeholder={t("auth.create.firstName", "Prénom")}
                value={firstName}
                onChange={setFirstName}
              />
              <AuthField
                placeholder={t("auth.create.lastName", "Nom")}
                value={lastName}
                onChange={setLastName}
              />
            </div>

            <AuthField
              placeholder={t(
                "auth.create.birthDate",
                "Date de naissance"
              )}
              value={birthDate}
              onChange={setBirthDate}
              type="date"
            />
          </div>

          {createError && (
            <div
              className="subtitle"
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#ff6b6b",
              }}
            >
              {createError}
            </div>
          )}

          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button
              className="btn primary sm"
              onClick={handleCreate}
              disabled={isBusy}
              style={{
                paddingInline: 18,
                borderRadius: 14,
                background: theme.primary,
                color: "#000",
                fontWeight: 700,
                opacity: isBusy ? 0.7 : 1,
              }}
            >
              {t("auth.create.submit", "Ajouter")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthField({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      className="input"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        fontSize: 13,
      }}
    />
  );
}

/* ---------- Utils ---------- */
function isNum(v: any): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function getCssNumber(varName: string, fallback = 0): number {
  try {
    const v = getComputedStyle(
      document.documentElement
    )
      .getPropertyValue(varName)
      .trim();
    const n = parseFloat(v.replace("px", ""));
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });
}

/** Conversion "FR" -> 🇫🇷, "France" -> 🇫🇷, etc. */
function getCountryFlag(country: string): string {
  if (!country) return "";
  const trimmed = country.trim();

  // Si l'utilisateur met déjà un drapeau, on le garde tel quel (sans regex exotique)
  const hasFlagEmoji = Array.from(trimmed).some((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    // Plage des "Regional Indicator Symbols"
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  });
  if (hasFlagEmoji) return trimmed;

  // correspondances texte -> code pays à 2 lettres
  const names: Record<string, string> = {
    france: "FR",
    fr: "FR",

    belgique: "BE",
    belgium: "BE",
    be: "BE",

    suisse: "CH",
    switzerland: "CH",
    ch: "CH",

    espagne: "ES",
    spain: "ES",
    es: "ES",

    italie: "IT",
    italy: "IT",
    it: "IT",

    allemagne: "DE",
    germany: "DE",
    de: "DE",

    royaumeuni: "GB",
    "royaume-uni": "GB",
    uk: "GB",
    angleterre: "GB",
    gb: "GB",

    paysbas: "NL",
    "pays-bas": "NL",
    netherlands: "NL",
    nl: "NL",

    usa: "US",
    etatsunis: "US",
    "etats-unis": "US",
    unitedstates: "US",
    us: "US",

    portugal: "PT",
    pt: "PT",
  };

  let code: string | undefined;

  // Si l'utilisateur tape déjà un code ISO2 (FR, BE, ...)
  if (trimmed.length === 2 && /^[a-zA-Z]{2}$/.test(trimmed)) {
    code = trimmed.toUpperCase();
  } else {
    // clé normalisée : minuscules, sans espaces ni tirets/apostrophes
    const key = trimmed
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[-']/g, "");
    code = names[key];
  }

  if (!code || code.length !== 2) return "";

  const base = 0x1f1e6; // 'A'
  const first = code.toUpperCase().charCodeAt(0) - 65;
  const second = code.toUpperCase().charCodeAt(1) - 65;
  return String.fromCodePoint(base + first, base + second);
}
