// ============================================
// src/pages/Profiles.tsx
// Espace Profils avec menu interne
// - Vue MENU : "Créer avatar" / "Mon Profil" / "Amis" / "Profils locaux" / "BOAT"
// - Vue "Mon Profil" : profil connecté + mini-stats + infos personnelles
// - Vue "Profils locaux" : formulaire + liste des profils locaux
// - Thème via ThemeContext + textes via LangContext
// ============================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import type { Store, Profile } from "../lib/types";
import {
  getBasicProfileStats,
  type BasicProfileStats,
} from "../lib/statsBridge";
import { getBasicProfileStatsSync } from "../lib/statsLiteIDB";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type View = "menu" | "me" | "locals";

/* ===== Helper lecture instantanée (mini-cache IDB) ===== */
function useBasicStats(playerId: string | undefined | null) {
  const empty = React.useMemo(
    () => ({
      avg3: 0,
      bestVisit: 0,
      bestCheckout: 0,
      wins: 0,
      games: 0,
      winRate: 0,
      darts: 0,
    }),
    []
  );
  if (!playerId) return empty;
  const s = getBasicProfileStatsSync(playerId);
  return {
    avg3: Number(s?.avg3 ?? 0),
    bestVisit: Number(s?.bestVisit ?? 0),
    bestCheckout: Number(s?.bestCheckout ?? 0),
    wins: Number(s?.wins ?? 0),
    games: Number(s?.games ?? 0),
    winRate: Number(s?.winRate ?? 0),
    darts: Number(s?.darts ?? 0),
  };
}

/* ================================
   Page — Profils (router interne)
================================ */
export default function Profiles({
  store,
  update,
  setProfiles,
  autoCreate = false,
  go,
}: {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  setProfiles: (fn: (p: Profile[]) => Profile[]) => void;
  autoCreate?: boolean;
  go?: (tab: any, params?: any) => void;
}) {
  const {
    profiles = [],
    activeProfileId = null,
    selfStatus = "online",
  } = store;

  const { theme } = useTheme();
  const { t } = useLang();

  const [view, setView] = React.useState<View>("menu");

  const [statsMap, setStatsMap] = React.useState<
    Record<string, BasicProfileStats | undefined>
  >({});

  function setActiveProfile(id: string | null) {
    update((s) => ({ ...s, activeProfileId: id }));
  }

  function renameProfile(id: string, name: string) {
    setProfiles((arr) => arr.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  async function changeAvatar(id: string, file: File) {
    const url = await read(file);
    setProfiles((arr) =>
      arr.map((p) => (p.id === id ? { ...p, avatarDataUrl: url } : p))
    );
  }

  function delProfile(id: string) {
    setProfiles((arr) => arr.filter((p) => p.id !== id));
    if (store.activeProfileId === id) setActiveProfile(null);
    setStatsMap((m) => {
      const c = { ...m };
      delete c[id];
      return c;
    });
  }

  async function addProfile(name: string, file?: File | null) {
    if (!name.trim()) return;
    const url = file ? await read(file) : undefined;
    const p: Profile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      avatarDataUrl: url,
    };
    setProfiles((arr) => [...arr, p]);
    update((s) => ({ ...s, activeProfileId: s.activeProfileId ?? p.id }));
  }

  const active = profiles.find((p) => p.id === activeProfileId) || null;

  // Précharge stats du profil actif
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const pid = active?.id;
      if (!pid || statsMap[pid]) return;
      try {
        const s = await getBasicProfileStats(pid);
        if (!cancelled) setStatsMap((m) => ({ ...m, [pid]: s }));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Pré-chauffage pour tous les profils locaux visibles
  React.useEffect(() => {
    let stopped = false;
    (async () => {
      const ids = profiles.map((p) => p.id).slice(0, 48);
      for (const id of ids) {
        if (stopped) break;
        if (statsMap[id]) continue;
        try {
          const s = await getBasicProfileStats(id);
          if (!stopped) setStatsMap((m) => (m[id] ? m : { ...m, [id]: s }));
        } catch {}
      }
    })();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  // Moyenne 3-darts du profil actif (priorité au cache sync)
  const activeAvg3D = React.useMemo<number | null>(() => {
    if (!active?.id) return null;
    const bs = getBasicProfileStatsSync(active.id);
    if (Number.isFinite(bs?.avg3)) return Number(bs.avg3);
    const inMap = statsMap[active.id];
    if (Number.isFinite((inMap as any)?.avg3d)) return Number((inMap as any).avg3d);
    if (Number.isFinite((inMap as any)?.avg3)) return Number((inMap as any).avg3);
    return null;
  }, [active?.id, statsMap]);

  // Navigation vers Avatar Creator
  const openAvatarCreator = React.useCallback(() => {
    go?.("avatar");
  }, [go]);

  // Patch infos privées du profil actif
  function patchActivePrivateInfo(patch: Record<string, any>) {
    if (!active) return;
    const id = active.id;
    setProfiles((arr) =>
      arr.map((p) =>
        p.id === id
          ? {
              ...(p as any),
              privateInfo: {
                ...(p as any).privateInfo,
                ...patch,
              },
            }
          : p
      )
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .apb { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
          .apb__info { display:flex; flex-direction:column; align-items:flex-start; text-align:left; flex:1; min-width:220px; }
          .apb__actions { justify-content:center; }
          @media (max-width: 600px){
            .apb { flex-direction:column; align-items:center; }
            .apb__info { align-items:center !important; text-align:center !important; }
            .apb__actions { justify-content:center !important; }
          }
        `,
        }}
      />

      <div
        className="container"
        style={{ maxWidth: 760, background: theme.bg, color: theme.text }}
      >
        {view === "menu" ? (
          <ProfilesMenuView
            go={go}
            onSelectMe={() => setView("me")}
            onSelectLocals={() => setView("locals")}
          />
        ) : (
          <>
            {/* Bouton retour menu */}
            <button
              className="btn sm"
              onClick={() => setView("menu")}
              style={{
                marginBottom: 10,
                borderRadius: 999,
                paddingInline: 14,
                background: "transparent",
                border: `1px solid ${theme.borderSoft}`,
                fontSize: 12,
              }}
            >
              ←{" "}
              {t(
                "profiles.menu.back",
                "Retour au menu Profils"
              )}
            </button>

            {view === "me" && (
              <>
                <Card
                  title={t("profiles.connected.title", "Profil connecté")}
                >
                  {active ? (
                    <ActiveProfileBlock
                      selfStatus={selfStatus as any}
                      active={active}
                      activeAvg3D={activeAvg3D}
                      onToggleAway={() =>
                        update((s) => ({
                          ...s,
                          selfStatus:
                            s.selfStatus === "away"
                              ? ("online" as const)
                              : ("away" as const),
                        }))
                      }
                      onQuit={() => setActiveProfile(null)}
                      onEdit={(n, f) => {
                        if (n && n !== active.name)
                          renameProfile(active.id, n);
                        if (f) changeAvatar(active.id, f);
                      }}
                    />
                  ) : (
                    <UnifiedAuthBlock
                      profiles={profiles}
                      onConnect={(id) => setActiveProfile(id)}
                      onCreate={addProfile}
                      autoFocusCreate={autoCreate}
                    />
                  )}
                </Card>

                <Card
                  title={t(
                    "profiles.private.title",
                    "Informations personnelles"
                  )}
                >
                  <PrivateInfoBlock
                    active={active}
                    onPatch={patchActivePrivateInfo}
                  />
                </Card>
              </>
            )}

            {view === "locals" && (
              <Card
                title={`${t(
                  "profiles.locals.title",
                  "Profils locaux"
                )} (${profiles.length})`}
              >
                <AddLocalProfile onCreate={addProfile} />
                <div
                  style={{
                    maxHeight: "min(44vh, 420px)",
                    minHeight: 260,
                    overflowY: "auto",
                    paddingRight: 6,
                    marginTop: 6,
                    borderRadius: 12,
                    border: `1px solid ${theme.borderSoft}`,
                    background: theme.card,
                  }}
                >
                  <LocalProfiles
                    profiles={profiles}
                    onRename={renameProfile}
                    onAvatar={changeAvatar}
                    onDelete={delProfile}
                    statsMap={statsMap}
                    warmup={(id) => warmProfileStats(id, setStatsMap)}
                    onOpenAvatarCreator={openAvatarCreator}
                  />
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ================================
   Vue MENU PROFILS
================================ */

function ProfilesMenuView({
  go,
  onSelectMe,
  onSelectLocals,
}: {
  go?: (tab: any, params?: any) => void;
  onSelectMe: () => void;
  onSelectLocals: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  const CardBtn: React.FC<{
    title: string;
    subtitle: string;
    onClick?: () => void;
    badge?: string;
    disabled?: boolean;
  }> = ({ title, subtitle, onClick, badge, disabled }) => (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        border: `1px solid ${theme.borderSoft}`,
        background: theme.card,
        boxShadow: "0 16px 32px rgba(0,0,0,.40)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            letterSpacing: 0.6,
            fontSize: 14,
            color: primary,
          }}
        >
          {title}
        </div>
        <div
          className="subtitle"
          style={{
            fontSize: 12,
            marginTop: 4,
            color: theme.textSoft,
          }}
        >
          {subtitle}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
          marginLeft: 12,
        }}
      >
        {badge && (
          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 999,
              background: `${primary}22`,
              border: `1px solid ${primary}88`,
              color: primary,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
        <span
          aria-hidden
          style={{
            fontSize: 18,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          ▸
        </span>
      </div>
    </button>
  );

  return (
    <div style={{ paddingTop: 8, paddingBottom: 8 }}>
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: primary,
          }}
        >
          {t("profiles.menu.title", "PROFILS")}
        </div>
        <div
          className="subtitle"
          style={{ fontSize: 12, marginTop: 4, color: theme.textSoft }}
        >
          {t(
            "profiles.menu.subtitle",
            "Gère ton avatar, ton profil connecté, tes amis et les profils locaux."
          )}
        </div>
      </div>

      <CardBtn
        title={t("profiles.menu.avatar.title", "Créer son avatar")}
        subtitle={t(
          "profiles.menu.avatar.subtitle",
          "Personnalise ton médaillon avec le créateur d’avatar."
        )}
        onClick={() => go?.("avatar")}
      />

      <CardBtn
        title={t("profiles.menu.me.title", "Mon profil")}
        subtitle={t(
          "profiles.menu.me.subtitle",
          "Profil connecté, statut, mini-stats et informations personnelles."
        )}
        onClick={onSelectMe}
      />

      <CardBtn
        title={t("profiles.menu.friends.title", "Amis")}
        subtitle={t(
          "profiles.menu.friends.subtitle",
          "Gère tes amis et tes profils en ligne."
        )}
        onClick={() => go?.("friends")}
      />

      <CardBtn
        title={t("profiles.menu.locals.title", "Profils locaux")}
        subtitle={t(
          "profiles.menu.locals.subtitle",
          "Profils enregistrés sur cet appareil avec leurs statistiques."
        )}
        onClick={onSelectLocals}
      />

      <CardBtn
        title={t("profiles.menu.boat.title", "BOAT")}
        subtitle={t(
          "profiles.menu.boat.subtitle",
          "Profils ordinateurs gérés par l’IA (bientôt)."
        )}
        badge={t("profiles.menu.boat.badge", "À venir")}
        disabled
      />
    </div>
  );
}

/* ================================
   Sous-composants communs
================================ */

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <section
      className="card"
      style={{
        padding: 16,
        marginBottom: 14,
        borderRadius: 18,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: "0 18px 36px rgba(0,0,0,.35)",
      }}
    >
      <div className="row-between" style={{ marginBottom: 10 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: theme.primary,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/* ------ Profil actif + ring externe ------ */
function ActiveProfileBlock({
  active,
  activeAvg3D,
  selfStatus,
  onToggleAway,
  onQuit,
  onEdit,
}: {
  active: Profile;
  activeAvg3D: number | null;
  selfStatus: "online" | "away" | "offline";
  onToggleAway: () => void;
  onQuit: () => void;
  onEdit: (name: string, avatar?: File | null) => void;
}) {
  const AVATAR = 96;
  const BORDER = 8;
  const MEDALLION = AVATAR + BORDER;
  const STAR = 14;

  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme.primary;

  const statusLabelKey =
    selfStatus === "away"
      ? "profiles.status.away"
      : selfStatus === "offline"
      ? "profiles.status.offline"
      : "profiles.status.online";

  const statusLabel = t(
    statusLabelKey,
    selfStatus === "away"
      ? "Absent"
      : selfStatus === "offline"
      ? "Hors ligne"
      : "En ligne"
  );

  const statusColor =
    selfStatus === "away"
      ? "#F6C256"
      : selfStatus === "offline"
      ? "#9AA0AA"
      : "#1FB46A";

  return (
    <div className="apb">
      {/* Médaillon */}
      <div
        style={{
          width: MEDALLION,
          height: MEDALLION,
          borderRadius: "50%",
          padding: BORDER / 2,
          background: `linear-gradient(135deg, ${primary}, ${primary}55)`,
          boxShadow: `0 0 26px ${primary}55, inset 0 0 12px rgba(0,0,0,.55)`,
          position: "relative",
          flex: "0 0 auto",
        }}
      >
        {/* Anneau d’étoiles */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: -(STAR / 2),
            top: -(STAR / 2),
            width: MEDALLION + STAR,
            height: MEDALLION + STAR,
            pointerEvents: "none",
          }}
        >
          <ProfileStarRing
            anchorSize={MEDALLION}
            gapPx={-2}
            starSize={STAR}
            stepDeg={10}
            avg3d={activeAvg3D ?? 0}
          />
        </div>

        {/* Avatar */}
        <ProfileAvatar
          size={AVATAR}
          dataUrl={active?.avatarDataUrl}
          label={active?.name?.[0]?.toUpperCase() || "?"}
          showStars={false}
        />
      </div>

      {/* Infos + actions */}
      <div className="apb__info">
        {/* Nom + lien stats */}
        <div
          style={{
            fontWeight: 800,
            fontSize: 20,
            whiteSpace: "nowrap",
          }}
        >
          <a
            href={`#/stats?pid=${active?.id}`}
            onClick={(e) => {
              e.preventDefault();
              if (active?.id) location.hash = `#/stats?pid=${active.id}`;
            }}
            style={{ color: primary, textDecoration: "none" }}
            title={t(
              "profiles.connected.seeStats",
              "Voir les statistiques"
            )}
          >
            {active?.name || "—"}
          </a>
        </div>

        {/* Statut */}
        <div
          className="row"
          style={{ gap: 8, alignItems: "center", marginTop: 4 }}
        >
          <StatusDot
            kind={
              selfStatus === "away"
                ? "away"
                : selfStatus === "offline"
                ? "offline"
                : "online"
            }
          />
          <span
            style={{
              fontWeight: 700,
              color: statusColor,
              textShadow: `0 0 6px ${statusColor}, 0 0 12px ${statusColor}`,
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Mini stats */}
        {active?.id && (
          <div style={{ marginTop: 8, width: "100%" }}>
            <GoldMiniStats profileId={active.id} />
          </div>
        )}

        {/* Boutons sous la mini-card : Modifier / Absent / Quitter */}
        <div
          className="row apb__actions"
          style={{
            gap: 8,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          <EditInline
            initialName={active?.name || ""}
            onSave={onEdit}
            compact
          />

          <button
            className="btn sm"
            onClick={onToggleAway}
            title={t(
              "profiles.connected.btn.away.tooltip",
              "Basculer le statut en absent / en ligne"
            )}
          >
            {selfStatus === "away"
              ? t("profiles.connected.btn.online", "EN LIGNE")
              : t("profiles.connected.btn.away", "ABSENT")}
          </button>

          <button
            className="btn danger sm"
            onClick={onQuit}
            title={t(
              "profiles.connected.btn.quit.tooltip",
              "Quitter la session"
            )}
          >
            {t("profiles.connected.btn.quit", "QUITTER")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------ Bloc INFOS PERSONNELLES ------ */

type PrivateInfo = {
  nickname?: string;
  lastName?: string;
  firstName?: string;
  birthDate?: string;
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
};

function PrivateInfoBlock({
  active,
  onPatch,
}: {
  active: Profile | null;
  onPatch: (patch: Partial<PrivateInfo>) => void;
}) {
  const { theme } = useTheme();
  const { t } = useLang();

  const initial: PrivateInfo = React.useMemo(() => {
    if (!active) return {};
    const pi = ((active as any).privateInfo || {}) as PrivateInfo;
    return {
      nickname: pi.nickname || "",
      lastName: pi.lastName || "",
      firstName: pi.firstName || "",
      birthDate: pi.birthDate || "",
      country: pi.country || "",
      city: pi.city || "",
      email: pi.email || "",
      phone: pi.phone || "",
    };
  }, [active]);

  const [fields, setFields] = React.useState<PrivateInfo>(initial);

  React.useEffect(() => {
    setFields(initial);
  }, [initial]);

  function handleChange<K extends keyof PrivateInfo>(
    key: K,
    value: string
  ) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function handleBlur<K extends keyof PrivateInfo>(key: K) {
    onPatch({ [key]: fields[key] } as Partial<PrivateInfo>);
  }

  if (!active) {
    return (
      <div className="subtitle">
        {t(
          "profiles.private.noActive",
          "Aucun profil n’est actuellement sélectionné."
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        className="subtitle"
        style={{ fontSize: 12, color: theme.textSoft }}
      >
        {t(
          "profiles.private.hint",
          "Ces informations restent privées et sont liées à ton profil. Elles ne sont pas partagées en ligne."
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          gap: 10,
        }}
      >
        <PrivateField
          label={t("profiles.private.nickname", "Surnom")}
          value={fields.nickname || ""}
          onChange={(v) => handleChange("nickname", v)}
          onBlur={() => handleBlur("nickname")}
        />
        <PrivateField
          label={t("profiles.private.lastName", "Nom")}
          value={fields.lastName || ""}
          onChange={(v) => handleChange("lastName", v)}
          onBlur={() => handleBlur("lastName")}
        />
        <PrivateField
          label={t("profiles.private.firstName", "Prénom")}
          value={fields.firstName || ""}
          onChange={(v) => handleChange("firstName", v)}
          onBlur={() => handleBlur("firstName")}
        />
        <PrivateField
          label={t("profiles.private.birthDate", "Date de naissance")}
          value={fields.birthDate || ""}
          onChange={(v) => handleChange("birthDate", v)}
          onBlur={() => handleBlur("birthDate")}
          type="date"
        />
        <PrivateField
          label={t("profiles.private.country", "Pays")}
          value={fields.country || ""}
          onChange={(v) => handleChange("country", v)}
          onBlur={() => handleBlur("country")}
        />
        <PrivateField
          label={t("profiles.private.city", "Ville")}
          value={fields.city || ""}
          onChange={(v) => handleChange("city", v)}
          onBlur={() => handleBlur("city")}
        />
        <PrivateField
          label={t("profiles.private.email", "Adresse mail")}
          value={fields.email || ""}
          onChange={(v) => handleChange("email", v)}
          onBlur={() => handleBlur("email")}
          type="email"
        />
        <PrivateField
          label={t("profiles.private.phone", "Téléphone")}
          value={fields.phone || ""}
          onChange={(v) => handleChange("phone", v)}
          onBlur={() => handleBlur("phone")}
          type="tel"
        />
      </div>
    </div>
  );
}

function PrivateField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  type?: string;
}) {
  const { theme } = useTheme();
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 12,
      }}
    >
      <span style={{ color: theme.textSoft }}>{label}</span>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        style={{ fontSize: 13 }}
      />
    </label>
  );
}

/* ------ Bloc connexion + création (pas changé) ------ */

function UnifiedAuthBlock({
  profiles,
  onConnect,
  onCreate,
  autoFocusCreate = false,
}: {
  profiles: { id: string; name: string }[];
  onConnect: (id: string) => void;
  onCreate: (name: string, file?: File | null) => void;
  autoFocusCreate?: boolean;
}) {
  const [chosen, setChosen] = React.useState<string>(profiles[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const createRef = React.useRef<HTMLInputElement>(null);

  const { t } = useLang();
  const { theme } = useTheme();
  const primary = theme.primary;

  React.useEffect(() => {
    if (autoFocusCreate) createRef.current?.focus();
  }, [autoFocusCreate]);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const r = new FileReader();
    r.onload = () => setPreview(String(r.result));
    r.readAsDataURL(file);
  }, [file]);

  function submitCreate() {
    if (!name.trim()) return;
    onCreate(name.trim(), file);
    setName("");
    setFile(null);
    setPreview(null);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Connexion existante */}
      <div className="row" style={{ gap: 8 }}>
        <select
          className="input"
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          style={{ flex: 1 }}
        >
          {profiles.length === 0 && (
            <option value="">
              {t(
                "profiles.auth.select.none",
                "Aucun profil enregistré"
              )}
            </option>
          )}
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="btn primary sm"
          onClick={() => chosen && onConnect(chosen)}
          style={{
            background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
            color: "#000",
            fontWeight: 700,
          }}
        >
          {t("profiles.auth.select.btnConnect", "Connexion")}
        </button>
      </div>

      {/* Création */}
      <div
        className="row"
        style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
      >
        <label
          title={t("profiles.locals.add.avatar", "Avatar")}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            overflow: "hidden",
            border: `1px solid ${theme.borderSoft}`,
            display: "grid",
            placeItems: "center",
            background: theme.card,
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <img
              src={preview}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <span className="subtitle" style={{ fontSize: 11 }}>
              {t("profiles.locals.add.avatar", "Avatar")}
            </span>
          )}
        </label>

        <input
          ref={createRef}
          className="input"
          placeholder={t(
            "profiles.auth.create.placeholder",
            "Nom du profil"
          )}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitCreate()}
          style={{ flex: 1, minWidth: 160 }}
        />

        <button
          className="btn primary sm"
          onClick={submitCreate}
          style={{
            background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
            color: "#000",
            fontWeight: 700,
          }}
        >
          {t("profiles.auth.create.btn", "Ajouter")}
        </button>
      </div>
    </div>
  );
}

/* ----- Formulaire d’ajout local ----- */

function AddLocalProfile({
  onCreate,
}: {
  onCreate: (name: string, file?: File | null) => void;
}) {
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const r = new FileReader();
    r.onload = () => setPreview(String(r.result));
    r.readAsDataURL(file);
  }, [file]);

  function submit() {
    if (!name.trim()) return;
    onCreate(name.trim(), file);
    setName("");
    setFile(null);
    setPreview(null);
  }

  return (
    <div
      className="item"
      style={{
        gap: 10,
        alignItems: "center",
        marginBottom: 8,
        flexWrap: "wrap",
      }}
    >
      <label
        title={t("profiles.locals.add.avatar", "Avatar")}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          overflow: "hidden",
          border: `1px solid ${theme.borderSoft}`,
          display: "grid",
          placeItems: "center",
          background: theme.bg,
          cursor: "pointer",
          flex: "0 0 auto",
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <img
            src={preview}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span className="subtitle" style={{ fontSize: 11 }}>
            {t("profiles.locals.add.avatar", "Avatar")}
          </span>
        )}
      </label>

      <input
        className="input"
        placeholder={t(
          "profiles.locals.add.placeholder",
          "Nom du profil"
        )}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ flex: 1, minWidth: 160, maxWidth: 260 }}
      />

      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        <button
          className="btn primary sm"
          onClick={submit}
          style={{
            background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
            color: "#000",
            fontWeight: 700,
          }}
        >
          {t("profiles.locals.add.btnAdd", "Ajouter")}
        </button>
        {(name || file) && (
          <button
            className="btn sm"
            onClick={() => {
              setName("");
              setFile(null);
              setPreview(null);
            }}
          >
            {t("profiles.locals.add.btnCancel", "Annuler")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ----- Liste des profils locaux ----- */

function LocalProfiles({
  profiles,
  onRename,
  onAvatar,
  onDelete,
  statsMap,
  warmup,
  onOpenAvatarCreator,
}: {
  profiles: Profile[];
  onRename: (id: string, name: string) => void;
  onAvatar: (id: string, file: File) => void;
  onDelete: (id: string) => void;
  statsMap: Record<string, BasicProfileStats | undefined>;
  warmup: (id: string) => void;
  onOpenAvatarCreator?: () => void;
}) {
  const [editing, setEditing] = React.useState<string | null>(null);
  const [tmpName, setTmpName] = React.useState<string>("");
  const [tmpFile, setTmpFile] = React.useState<File | null>(null);

  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  function startEdit(p: Profile) {
    setEditing(p.id);
    setTmpName(p.name || "");
    setTmpFile(null);
  }

  function saveEdit(id: string) {
    if (tmpName.trim()) onRename(id, tmpName.trim());
    if (tmpFile) onAvatar(id, tmpFile);
    setEditing(null);
    setTmpFile(null);
  }

  return (
    <div className="list">
      {profiles.map((p) => {
        const isEdit = editing === p.id;
        const s = statsMap[p.id];
        const AVA = 48;
        const MEDALLION = AVA;
        const STAR = 9;

        return (
          <div
            className="item"
            key={p.id}
            style={{
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              background: theme.bg,
            }}
          >
            {/* gauche */}
            <div
              className="row"
              style={{ gap: 10, minWidth: 0, flex: 1 }}
            >
              <div
                style={{
                  position: "relative",
                  width: AVA,
                  height: AVA,
                  flex: "0 0 auto",
                }}
              >
                {/* anneau externe */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: -(STAR / 2),
                    top: -(STAR / 2),
                    width: MEDALLION + STAR,
                    height: MEDALLION + STAR,
                    pointerEvents: "none",
                  }}
                >
                  <ProfileStarRing
                    anchorSize={MEDALLION}
                    gapPx={2}
                    starSize={STAR}
                    stepDeg={10}
                    avg3d={Number(
                      (s as any)?.avg3d ?? (s as any)?.avg3 ?? 0
                    )}
                  />
                </div>

                <ProfileAvatar
                  size={AVA}
                  dataUrl={p.avatarDataUrl}
                  label={p.name?.[0]?.toUpperCase() || "?"}
                  showStars={false}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                {isEdit ? (
                  <div
                    className="row"
                    style={{ gap: 8, flexWrap: "wrap" }}
                  >
                    <input
                      className="input"
                      value={tmpName}
                      onChange={(e) =>
                        setTmpName(e.target.value)
                      }
                      style={{ width: 200 }}
                    />
                    <label className="btn sm">
                      {t(
                        "profiles.locals.edit.avatarBtn",
                        "Avatar"
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) =>
                          setTmpFile(
                            e.target.files?.[0] ?? null
                          )
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        textAlign: "left",
                      }}
                    >
                      <a
                        href={`#/stats?pid=${p.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          location.hash = `#/stats?pid=${p.id}`;
                        }}
                        onMouseEnter={() => warmup(p.id)}
                        style={{
                          color: primary,
                          textDecoration: "none",
                        }}
                        title={t(
                          "profiles.locals.seeStats",
                          "Voir les statistiques"
                        )}
                      >
                        {p.name || "—"}
                      </a>
                    </div>

                    {/* ruban stats */}
                    <div style={{ marginTop: 6 }}>
                      <GoldMiniStats profileId={p.id} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* droite: actions */}
            <div
              className="col"
              style={{
                gap: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                minWidth: 122,
              }}
            >
              <button
                className="btn sm"
                onClick={() => onOpenAvatarCreator?.()}
                title={t(
                  "profiles.locals.btn.avatarCreator.tooltip",
                  "Ouvrir le créateur d’avatar"
                )}
                style={{
                  background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
                  color: "#000",
                  fontWeight: 800,
                }}
              >
                {t(
                  "profiles.locals.btn.avatarCreator",
                  "Créer avatar"
                )}
              </button>

              {isEdit ? (
                <>
                  <button
                    className="btn ok sm"
                    onClick={() => saveEdit(p.id)}
                  >
                    {t(
                      "profiles.locals.btn.save",
                      "Enregistrer"
                    )}
                  </button>
                  <button
                    className="btn sm"
                    onClick={() => setEditing(null)}
                  >
                    {t(
                      "profiles.locals.btn.cancel",
                      "Annuler"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn sm"
                    onClick={() => startEdit(p)}
                  >
                    {t("profiles.locals.btn.edit", "Éditer")}
                  </button>
                  <button
                    className="btn danger sm"
                    onClick={() => onDelete(p.id)}
                  >
                    {t(
                      "profiles.locals.btn.delete",
                      "Suppr."
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----- Edition inline du profil actif ----- */

function EditInline({
  initialName,
  onSave,
  onDisconnect,
  compact = true,
}: {
  initialName: string;
  onSave: (name: string, avatar?: File | null) => void;
  onDisconnect?: () => void;
  compact?: boolean;
}) {
  const [edit, setEdit] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [file, setFile] = React.useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    null
  );

  const { t } = useLang();
  const { theme } = useTheme();
  const primary = theme.primary;

  React.useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () =>
        setAvatarUrl(String(reader.result));
      reader.readAsDataURL(file);
    } else {
      setAvatarUrl(null);
    }
  }, [file]);

  if (!edit) {
    return (
      <button
        className="btn sm"
        onClick={() => setEdit(true)}
        title={t(
          "profiles.connected.btn.edit",
          "MODIFIER LE PROFIL"
        )}
      >
        {t(
          "profiles.connected.btn.edit",
          "MODIFIER LE PROFIL"
        )}
      </button>
    );
  }

  return (
    <div
      className="row"
      style={{
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <label
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          overflow: "hidden",
          border: `2px solid ${primary}66`,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          background: "#111118",
          position: "relative",
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span style={{ color: "#999", fontSize: 12 }}>
            {t(
              "profiles.connected.edit.avatarPlaceholder",
              "Cliquer"
            )}
          </span>
        )}
      </label>

      <input
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: compact ? 160 : 200 }}
      />

      <button
        className="btn ok sm"
        onClick={() => {
          onSave(name, file);
          setEdit(false);
          setFile(null);
          setAvatarUrl(null);
        }}
      >
        {t("profiles.locals.btn.save", "Enregistrer")}
      </button>
      <button
        className="btn sm"
        onClick={() => {
          setEdit(false);
          setFile(null);
          setAvatarUrl(null);
        }}
      >
        {t("profiles.locals.btn.cancel", "Annuler")}
      </button>
      {onDisconnect && (
        <button
          className="btn danger sm"
          onClick={onDisconnect}
        >
          {t("profiles.connected.btn.quit", "QUITTER")}
        </button>
      )}
    </div>
  );
}

/* ------ Gold mini-stats (lecture SYNC cache) ------ */

function GoldMiniStats({ profileId }: { profileId: string }) {
  const bs = useBasicStats(profileId);
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme.primary;

  const avg3 = Number.isFinite(bs.avg3) ? bs.avg3 : 0;
  const best = Number(bs.bestVisit ?? 0);
  const co = Number(bs.bestCheckout ?? 0);
  const winPct = Math.round(Number(bs.winRate ?? 0));

  const pillW = "clamp(58px, 17vw, 78px)";

  return (
    <div
      style={{
        borderRadius: 10,
        padding: "5px 6px",
        boxSizing: "border-box",
        background: `linear-gradient(180deg, ${primary}33, ${primary}11)`,
        border: `1px solid ${primary}55`,
        boxShadow:
          "0 6px 16px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.35)",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "stretch",
          gap: 0,
          width: "100%",
        }}
      >
        <GoldStatItem
          label={t("home.stats.avg3", "Moy/3")}
          value={(Math.round(avg3 * 10) / 10).toFixed(1)}
          width={pillW}
        />
        <GoldSep />
        <GoldStatItem
          label={t("home.stats.best", "Best")}
          value={String(best)}
          width={pillW}
        />
        <GoldSep />
        <GoldStatItem
          label={t("home.stats.co", "CO")}
          value={String(co)}
          width={pillW}
        />
        <GoldSep />
        <GoldStatItem
          label={t("home.stats.winPct", "Win%")}
          value={`${winPct}`}
          width={pillW}
        />
      </div>
    </div>
  );
}

function GoldSep() {
  const { theme } = useTheme();
  const primary = theme.primary;
  return (
    <div
      aria-hidden
      style={{
        width: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 1,
          height: "64%",
          background: `${primary}33`,
          borderRadius: 1,
        }}
      />
    </div>
  );
}

function GoldStatItem({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  const { theme } = useTheme();
  const primary = theme.primary;

  return (
    <div
      style={{
        width,
        minWidth: 0,
        display: "grid",
        gap: 1,
        textAlign: "center",
        paddingInline: 2,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span
        style={{
          fontSize: "clamp(8px, 1.6vw, 9.5px)",
          color: "rgba(255,255,255,.66)",
          lineHeight: 1.05,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontWeight: 800,
          letterSpacing: 0.1,
          color: primary,
          textShadow: `0 0 4px ${primary}33`,
          fontSize: "clamp(9.5px, 2.4vw, 12px)",
          lineHeight: 1.05,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusDot({ kind }: { kind: "online" | "away" | "offline" }) {
  const color =
    kind === "online"
      ? "#1fb46a"
      : kind === "away"
      ? "#f0b12a"
      : "#777";
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 10px ${color}`,
        display: "inline-block",
      }}
    />
  );
}

/* ================================
   Utils
================================ */
function read(f: File) {
  return new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(f);
  });
}
async function warmProfileStats(
  id: string,
  setStatsMap: React.Dispatch<
    React.SetStateAction<
      Record<string, BasicProfileStats | undefined>
    >
  >
) {
  if (!id) return;
  try {
    const s = await getBasicProfileStats(id);
    setStatsMap((m) => (m[id] ? m : { ...m, [id]: s }));
  } catch {}
}
