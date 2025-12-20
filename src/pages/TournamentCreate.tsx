// @ts-nocheck
// ============================================
// src/pages/TournamentCreate.tsx
// Tournois (LOCAL) — Create (UI refacto v1)
// ✅ Objectif: CLARTÉ façon X01Config (même logique / même rendu neon)
// ✅ Étape 1: Choix du MODE via menu flottant (sheet)
// ✅ Étape 2: Paramètres MATCH (dépend du mode) + Format tournoi
// ✅ Étape 3: Sélection des JOUEURS (min 2) + avatars/initiales (CAROUSEL)
// ✅ Local uniquement: créer (pas de "rejoindre")
// ✅ FIX: plus de dynamic import vers des modules inexistants (Vite 500 écran noir)
// ✅ FIX: erreur babel "Identifier directly after number" (rgba(255,195,26,.08) -> 0.08)
// ✅ FIX CRITIQUE: génère + persiste les matchs/poules via lib/tournaments/engine (sinon 0 match)
// ============================================

import React from "react";
import type { Store } from "../lib/types";

// ✅ ENGINE + STORE (comme Tournaments.tsx)
import type { Tournament } from "../lib/tournaments/types";
import { createTournamentDraft, buildInitialMatches } from "../lib/tournaments/engine";
import { upsertTournamentLocal, upsertMatchesForTournamentLocal } from "../lib/tournaments/storeLocal";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type Mode = "x01" | "cricket" | "killer" | "shanghai";
type TourFormat = "single_ko" | "double_ko" | "round_robin" | "groups_ko";
type BestOf = 1 | 3 | 5 | 7;

const MODE_LABEL: Record<Mode, string> = {
  x01: "X01",
  cricket: "Cricket",
  killer: "Killer",
  shanghai: "Shanghai",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* -----------------------------
   UI atoms (neon-ish)
------------------------------ */

function Section({
  title,
  subtitle,
  children,
  accent = "#ffc63a",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        marginTop: 12,
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,0.08), transparent 55%), linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 950,
            letterSpacing: 0.3,
            color: accent,
            textShadow: `0 0 10px ${accent}40`,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ fontSize: 11.5, opacity: 0.78, lineHeight: 1.35 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function NeonPill({
  active,
  label,
  onClick,
  accent = "#ffcf57",
  small,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  accent?: string;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: small ? "6px 10px" : "7px 12px",
        border: active ? `1px solid ${accent}AA` : "1px solid rgba(255,255,255,0.12)",
        background: active
          ? `linear-gradient(180deg, ${accent}, ${accent}CC)`
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        color: active ? "#1b1508" : "rgba(255,255,255,0.92)",
        fontWeight: active ? 950 : 850,
        fontSize: small ? 11.5 : 12.2,
        cursor: "pointer",
        boxShadow: active ? `0 10px 22px ${accent}25` : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function NeonPrimary({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        width: "100%",
        borderRadius: 999,
        padding: "12px 14px",
        border: "none",
        fontWeight: 950,
        fontSize: 13,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        color: "#1b1508",
        background: disabled
          ? "linear-gradient(180deg,#555,#333)"
          : "linear-gradient(90deg,#ff4fd8,#ffc63a)",
        boxShadow: disabled ? "none" : "0 14px 34px rgba(0,0,0,0.55)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
      <div style={{ fontSize: 11.5, opacity: 0.82 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

/* -----------------------------
   Players helpers
------------------------------ */

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

function NeonGhost({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "7px 10px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        color: "rgba(255,255,255,0.9)",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function PlayerCarouselTile({
  active,
  name,
  avatarUrl,
  onClick,
}: {
  active: boolean;
  name: string;
  avatarUrl?: string | null;
  onClick: () => void;
}) {
  const ring = active ? "#ffcf57" : "rgba(255,255,255,0.16)";
  const glow = active ? "0 0 18px rgba(255,207,87,0.28)" : "none";

  // ✅ Grey-out non selected
  const greyImgFilter = active ? "none" : "grayscale(1) saturate(0.25) contrast(0.95)";
  const greyOpacity = active ? 1 : 0.55;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 86,
        flex: "0 0 auto",
        border: "none",
        background: "transparent",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        padding: 0,
        display: "grid",
        justifyItems: "center",
        gap: 6,
        scrollSnapAlign: "start",
        opacity: active ? 1 : 0.85,
      }}
      title={name}
    >
      <div
        style={{
          width: 62,
          height: 62,
          borderRadius: 999,
          padding: 3,
          background: `linear-gradient(180deg, ${ring}, rgba(255,255,255,0.10))`,
          boxShadow: glow,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 999,
            overflow: "hidden",
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: greyImgFilter,
                opacity: greyOpacity,
                transition: "filter .15s ease, opacity .15s ease",
              }}
            />
          ) : (
            <div
              style={{
                fontSize: 13,
                fontWeight: 950,
                opacity: greyOpacity,
                filter: active ? "none" : "grayscale(1)",
                transition: "filter .15s ease, opacity .15s ease",
              }}
            >
              {getInitials(name)}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          width: 86,
          fontSize: 11.5,
          fontWeight: 900,
          opacity: active ? 1 : 0.55,
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          transition: "opacity .15s ease",
        }}
      >
        {name || "Joueur"}
      </div>
    </button>
  );
}

function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.62)",
        display: "grid",
        placeItems: "end center",
        padding: 12,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(520px, 96vw)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(24,24,30,0.98), rgba(10,10,14,0.995))",
          boxShadow: "0 22px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14, color: "#ffcf57" }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.75)",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label="Fermer"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

/* -----------------------------
   Page
------------------------------ */

export default function TournamentCreate({ store, go }: Props) {
  const [name, setName] = React.useState("Mon tournoi");
  const [mode, setMode] = React.useState<Mode | null>(null);
  const [sheetMode, setSheetMode] = React.useState(false);

  // ---- Players (LOCAL)
  const profiles = React.useMemo(() => {
    const arr = (store as any)?.profiles || [];
    return arr
      .filter((p: any) => p?.id)
      .map((p: any) => ({
        id: String(p.id),
        name: p?.name || p?.displayName || p?.pseudo || "Joueur",
        avatar:
          p?.avatarDataUrl ||
          p?.avatarUrl ||
          p?.avatar ||
          p?.photo ||
          null,
      }))
      .filter((p: any) => !!p.id);
  }, [store]);

  const [playerIds, setPlayerIds] = React.useState<string[]>(() => {
    const active = (store as any)?.activeProfiles || [];
    const fromActive = Array.isArray(active)
      ? active.map((x: any) => String(x)).filter(Boolean)
      : [];
    const base = fromActive.length ? fromActive : profiles.slice(0, 2).map((p: any) => String(p.id));
    return Array.from(new Set(base)).filter(Boolean);
  });

  // si profiles arrivent après (store hydrate async) -> assure min 0/2 par défaut
  React.useEffect(() => {
    setPlayerIds((prev) => {
      const stillValid = prev.filter((id) => profiles.some((p: any) => p.id === id));
      if (stillValid.length >= 2) return stillValid;
      if (profiles.length >= 2) return Array.from(new Set([...stillValid, profiles[0].id, profiles[1].id]));
      if (profiles.length === 1) return Array.from(new Set([...stillValid, profiles[0].id]));
      return stillValid;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  const togglePlayer = (id: string) => {
    setPlayerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const minPlayersOk = playerIds.length >= 2;

  // ---- Format tournoi
  const [format, setFormat] = React.useState<TourFormat>("single_ko");
  const [bestOf, setBestOf] = React.useState<BestOf>(3);
  const [seedingRandom, setSeedingRandom] = React.useState(true);

  // ---- Params match X01
  const defaultStart =
    (store?.settings?.defaultX01 as any) === 301 ||
    (store?.settings?.defaultX01 as any) === 501 ||
    (store?.settings?.defaultX01 as any) === 701 ||
    (store?.settings?.defaultX01 as any) === 901
      ? (store.settings.defaultX01 as 301 | 501 | 701 | 901)
      : 501;

  const [x01Start, setX01Start] = React.useState<301 | 501 | 701 | 901>(defaultStart);
  const [x01In, setX01In] = React.useState<"simple" | "double" | "master">("simple");
  const [x01Out, setX01Out] = React.useState<"simple" | "double" | "master">(
    store?.settings?.doubleOut ? "double" : "simple"
  );

  const canCreate = !!name.trim() && !!mode && minPlayersOk;

  // ✅ helper: construit les stages ENGINE depuis ton UI
  function buildStagesForEngine(fmt: TourFormat, nPlayers: number) {
    // RR seul
    if (fmt === "round_robin") {
      return [
        {
          id: "rr",
          type: "round_robin",
          name: "Championnat",
          groups: 1,
          qualifiersPerGroup: Math.max(1, nPlayers), // pas utilisé en RR “pur”
          seeding: seedingRandom ? "random" : "ordered",
        },
      ];
    }

    // Poules + KO
    if (fmt === "groups_ko") {
      const GROUP_SIZE = 4;
      const groups = Math.max(1, Math.ceil(nPlayers / GROUP_SIZE));
      const qualifiers = Math.min(2, GROUP_SIZE); // simple et efficace
      return [
        {
          id: "rr",
          type: "round_robin",
          name: "Poules",
          groups,
          qualifiersPerGroup: qualifiers,
          seeding: seedingRandom ? "random" : "ordered",
        },
        {
          id: "se",
          type: "single_elim",
          name: "Phase finale",
          seeding: seedingRandom ? "random" : "ordered",
        },
      ];
    }

    // KO simple (et pour l’instant KO double => on démarre en SE pour avoir des matchs)
    return [
      {
        id: "se",
        type: "single_elim",
        name: fmt === "double_ko" ? "Élimination (phase 1)" : "Phase finale",
        seeding: seedingRandom ? "random" : "ordered",
      },
    ];
  }

  async function createTournament() {
    if (!canCreate) return;

    const selectedProfiles = profiles.filter((p: any) => playerIds.includes(String(p.id)));

    // ✅ format attendu par l’engine
    const players = selectedProfiles.map((p: any) => ({
      id: String(p.id),
      name: p.name || "Joueur",
      avatarDataUrl: p.avatar || null,
      source: "local",
    }));

    // ✅ rules engine (minimum viable)
    const rules =
      mode === "x01"
        ? {
            start: x01Start,
            doubleOut: x01Out === "double", // (master out géré plus tard si tu veux)
            inMode: x01In,
            outMode: x01Out,
            bestOf,
          }
        : { bestOf };

    const stages = buildStagesForEngine(format, players.length);

    // ✅ TOURNOI ENGINE
    const tour: Tournament = createTournamentDraft({
      name: name.trim(),
      source: "local",
      ownerProfileId: (store as any)?.activeProfileId ?? null,
      players,
      game: {
        mode,
        rules,
      },
      stages,
    }) as any;

    // ✅ Génère les matchs initiaux
    const matches = buildInitialMatches(tour);

    // ✅ Persiste tournoi + matchs (sinon TournamentView voit 0 match)
    try {
      upsertTournamentLocal(tour as any);
      upsertMatchesForTournamentLocal(tour.id, matches as any);
    } catch (e) {
      console.error("[TournamentCreate] persist failed:", e);
    }

    go("tournament_view", { id: tour.id });
  }

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          type="button"
          onClick={() => go("tournaments")}
          style={{
            borderRadius: 999,
            padding: "7px 12px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: 0.2 }}>Créer un tournoi</div>
          <div style={{ fontSize: 11.5, opacity: 0.75 }}>Choisis un mode puis configure le format.</div>
        </div>
      </div>

      {/* Infos */}
      <Section
        title="Infos du tournoi"
        subtitle="Nom + choix du mode. Le mode détermine les paramètres de match disponibles."
        accent="#ffcf57"
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, opacity: 0.82, marginBottom: 6 }}>Nom</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du tournoi"
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(8,8,12,0.75)",
                color: "#fff",
                padding: "10px 12px",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "grid", gap: 3 }}>
              <div style={{ fontSize: 11.5, opacity: 0.82 }}>Mode</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: mode ? "#ffcf57" : "rgba(255,255,255,0.65)" }}>
                {mode ? MODE_LABEL[mode] : "Aucun mode choisi"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSheetMode(true)}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: "none",
                fontWeight: 950,
                cursor: "pointer",
                background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                color: "#1b1508",
                boxShadow: "0 10px 22px rgba(0,0,0,0.55)",
                whiteSpace: "nowrap",
              }}
            >
              Choisir mode
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["x01", "cricket", "killer", "shanghai"] as Mode[]).map((m) => (
              <NeonPill
                key={m}
                active={mode === m}
                label={MODE_LABEL[m]}
                onClick={() => setMode(m)}
                accent={m === "x01" ? "#ffcf57" : m === "cricket" ? "#4fb4ff" : m === "killer" ? "#ff4fd8" : "#7fe2a9"}
              />
            ))}
          </div>

          <div style={{ fontSize: 11.2, opacity: 0.72, lineHeight: 1.35 }}>
            💡 Conseil : commence par choisir le mode. Ensuite seulement, tu règles les paramètres match et le format.
          </div>
        </div>
      </Section>

      {/* ✅ JOUEURS (CAROUSEL swipe) */}
      <Section title="Joueurs" subtitle="Sélectionne au moins 2 joueurs pour le tournoi." accent="#ffcf57">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.82 }}>
            <b style={{ color: "#ffcf57" }}>{playerIds.length}</b>{" "}
            {playerIds.length > 1 ? "joueurs" : "joueur"} sélectionné(s)
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <NeonGhost label="Tout sélectionner" onClick={() => setPlayerIds(profiles.map((p: any) => String(p.id)))} />
            <NeonGhost label="Vider" onClick={() => setPlayerIds([])} />
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 6,
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
        >
          {profiles.map((p: any) => (
            <PlayerCarouselTile
              key={p.id}
              active={playerIds.includes(p.id)}
              name={p.name}
              avatarUrl={p.avatar}
              onClick={() => togglePlayer(p.id)}
            />
          ))}
        </div>

        {!minPlayersOk ? <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>⚠️ Minimum 2 joueurs.</div> : null}
      </Section>

      {/* Params match */}
      {mode === "x01" ? (
        <Section
          title="Match — Paramètres X01"
          subtitle="Même logique que X01 Config : score de départ + modes d’entrée/sortie."
          accent="#4fb4ff"
        >
          <Row label="Score de départ">
            {[301, 501, 701, 901].map((v) => (
              <NeonPill key={v} active={x01Start === v} label={String(v)} onClick={() => setX01Start(v as any)} accent="#ffcf57" />
            ))}
          </Row>

          <Row label="Mode d’entrée">
            <NeonPill active={x01In === "simple"} label="Simple IN" onClick={() => setX01In("simple")} accent="#4fb4ff" />
            <NeonPill active={x01In === "double"} label="Double IN" onClick={() => setX01In("double")} accent="#4fb4ff" />
            <NeonPill active={x01In === "master"} label="Master IN" onClick={() => setX01In("master")} accent="#4fb4ff" />
          </Row>

          <Row label="Mode de sortie">
            <NeonPill active={x01Out === "simple"} label="Simple OUT" onClick={() => setX01Out("simple")} accent="#ff4fd8" />
            <NeonPill active={x01Out === "double"} label="Double OUT" onClick={() => setX01Out("double")} accent="#ff4fd8" />
            <NeonPill active={x01Out === "master"} label="Master OUT" onClick={() => setX01Out("master")} accent="#ff4fd8" />
          </Row>

          <div style={{ marginTop: 10, fontSize: 11.2, opacity: 0.72, lineHeight: 1.35 }}>
            ✅ Les autres paramètres viendront ensuite, mais on garde cette page ULTRA lisible.
          </div>
        </Section>
      ) : mode ? (
        <Section
          title={`Match — Paramètres ${MODE_LABEL[mode]}`}
          subtitle="UI clean : les réglages spécifiques à ce mode seront ajoutés ici ensuite."
          accent="#7fe2a9"
        >
          <div style={{ fontSize: 12, opacity: 0.82, lineHeight: 1.45 }}>
            Pour l’instant, on verrouille la structure + le rendu. Ensuite on ajoute la config dédiée à{" "}
            <b>{MODE_LABEL[mode]}</b>.
          </div>
        </Section>
      ) : null}

      {/* Format tournoi */}
      <Section title="Format du tournoi" subtitle="Structure + nombre de manches par match (best-of)." accent="#ffcf57">
        <Row label="Type">
          <NeonPill active={format === "single_ko"} label="Élimination simple" onClick={() => setFormat("single_ko")} accent="#ffcf57" />
          <NeonPill active={format === "double_ko"} label="Élimination double" onClick={() => setFormat("double_ko")} accent="#ffcf57" />
          <NeonPill active={format === "round_robin"} label="Championnat (Round Robin)" onClick={() => setFormat("round_robin")} accent="#ffcf57" />
          <NeonPill active={format === "groups_ko"} label="Poules + KO" onClick={() => setFormat("groups_ko")} accent="#ffcf57" />
        </Row>

        <Row label="Match — Best-of">
          {([1, 3, 5, 7] as BestOf[]).map((v) => (
            <NeonPill key={v} active={bestOf === v} label={`BO${v}`} onClick={() => setBestOf(v)} accent="#4fb4ff" />
          ))}
        </Row>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontSize: 12.2, fontWeight: 900 }}>Seeding aléatoire</div>
            <div style={{ fontSize: 11.2, opacity: 0.75 }}>ON = mélange les joueurs au départ</div>
          </div>

          <button
            type="button"
            onClick={() => setSeedingRandom((v) => !v)}
            style={{
              borderRadius: 999,
              padding: "9px 12px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: seedingRandom
                ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                : "linear-gradient(180deg,#444,#262626)",
              color: seedingRandom ? "#04101f" : "rgba(255,255,255,0.9)",
              fontWeight: 950,
              cursor: "pointer",
              minWidth: 64,
              textAlign: "center",
              boxShadow: seedingRandom ? "0 10px 22px rgba(0,0,0,0.55)" : "none",
            }}
          >
            {seedingRandom ? "ON" : "OFF"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 11.2, opacity: 0.72 }}>Exemple : BO3 = 2 manches gagnantes.</div>
        {format === "double_ko" ? (
          <div style={{ marginTop: 8, fontSize: 11.2, opacity: 0.72 }}>
            ⚠️ Double KO : pour l’instant on génère une phase initiale (SE) pour éviter “0 match”. On complètera le loser bracket ensuite.
          </div>
        ) : null}
      </Section>

      {/* CTA */}
      <div style={{ marginTop: 14 }}>
        <NeonPrimary label="Créer le tournoi" onClick={createTournament} disabled={!canCreate} />
        {!canCreate ? (
          <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.72 }}>
            ⚠️ Renseigne un nom, choisis un mode et sélectionne au moins 2 joueurs.
          </div>
        ) : null}
      </div>

      {/* Sheet mode */}
      <Sheet open={sheetMode} title="Choisir un mode" onClose={() => setSheetMode(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
            Choisis le mode du tournoi. Ensuite tu règles les paramètres du match et le format.
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {(["x01", "cricket", "killer", "shanghai"] as Mode[]).map((m) => {
              const accent = m === "x01" ? "#ffcf57" : m === "cricket" ? "#4fb4ff" : m === "killer" ? "#ff4fd8" : "#7fe2a9";

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setSheetMode(false);
                  }}
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: mode === m ? `1px solid ${accent}AA` : "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                    color: "rgba(255,255,255,0.92)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    cursor: "pointer",
                    boxShadow: mode === m ? `0 14px 34px ${accent}22` : "none",
                  }}
                >
                  <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
                    <div style={{ fontWeight: 950, fontSize: 14, color: accent }}>{MODE_LABEL[m]}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.75 }}>
                      {m === "x01" ? "Score départ, IN/OUT, etc." : "Config dédiée à venir (même UX)."}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: `radial-gradient(circle at 30% 0%, ${accent}, ${accent}88)`,
                      boxShadow: `0 0 14px ${accent}33`,
                      display: "grid",
                      placeItems: "center",
                      color: "#120c06",
                      fontWeight: 950,
                    }}
                    aria-hidden
                  >
                    ✓
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
