// =============================================================
// src/pages/KillerConfig.tsx
// Config KILLER — style DC-V5 (même esprit que X01ConfigV3 / CricketConfig)
// - Sélection joueurs (profils locaux + bots si présents dans store.profiles)
// - Attribution numéro Killer (1..20) unique + random
// - Options (maxLives, exact, friendlyFire...)
// - START => go("killer_play", { config })
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

export type KillerPlayerConfig = {
  pid: string; // id joueur dans le match
  profileId: string; // id profil
  name: string;
  killerNumber: number; // 1..20
};

export type KillerMatchConfig = {
  mode: "killer";
  players: KillerPlayerConfig[];
  params: {
    maxLives: number; // ex 3
    mustReachExactLives: boolean;
    allowFriendlyFire: boolean;
    loseLivesOnOwnNumberWhenKiller: boolean;
  };
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function normNum(n: number) {
  return clamp(Math.floor(n || 1), 1, 20);
}
function uid() {
  return `p_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function pickFreeNumber(used: Set<number>) {
  const all = Array.from({ length: 20 }, (_, i) => i + 1).filter((n) => !used.has(n));
  if (!all.length) return 1;
  return all[Math.floor(Math.random() * all.length)];
}

export default function KillerConfig(props: Props) {
  const { store, go } = props;
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = (theme as any)?.primary || "#f7c948";
  const bg0 = "rgba(10,12,18,.92)";
  const card = "rgba(255,255,255,.06)";
  const stroke = "rgba(255,255,255,.10)";
  const glow = `0 0 18px rgba(247, 201, 72, .18)`;

  // --- Profiles list (locaux + bots si déjà dans store.profiles)
  const allProfiles: Profile[] = React.useMemo(() => {
    const dict = (store as any)?.profiles || {};
    const arr = Object.values(dict) as Profile[];
    // tri : favoris / nom
    return arr
      .slice()
      .sort((a: any, b: any) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [store]);

  const defaultParams = React.useMemo(
    () => ({
      maxLives: 3,
      mustReachExactLives: false,
      allowFriendlyFire: false,
      loseLivesOnOwnNumberWhenKiller: false,
    }),
    []
  );

  const [params, setParams] = React.useState(defaultParams);

  // --- Players config state
  const [players, setPlayers] = React.useState<KillerPlayerConfig[]>(() => {
    const first = allProfiles?.[0];
    if (!first) return [];
    return [
      {
        pid: uid(),
        profileId: (first as any).id,
        name: (first as any).name || "Player 1",
        killerNumber: 20,
      },
    ];
  });

  React.useEffect(() => {
    // si store.profiles arrive après (async), seed si vide
    if (players.length) return;
    const first = allProfiles?.[0];
    if (!first) return;
    setPlayers([
      {
        pid: uid(),
        profileId: (first as any).id,
        name: (first as any).name || "Player 1",
        killerNumber: 20,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProfiles?.length]);

  const usedNumbers = React.useMemo(() => {
    const s = new Set<number>();
    players.forEach((p) => s.add(normNum(p.killerNumber)));
    return s;
  }, [players]);

  const canStart = players.filter((p) => p.profileId).length >= 2;

  const updatePlayer = (pid: string, patch: Partial<KillerPlayerConfig>) => {
    setPlayers((prev) => prev.map((p) => (p.pid === pid ? { ...p, ...patch } : p)));
  };

  const removePlayer = (pid: string) => {
    setPlayers((prev) => prev.filter((p) => p.pid !== pid));
  };

  const addPlayer = () => {
    const usedProf = new Set(players.map((p) => p.profileId).filter(Boolean));
    const candidate = allProfiles.find((p: any) => !usedProf.has(p.id)) || allProfiles[0];
    if (!candidate) return;

    const used = new Set(players.map((p) => normNum(p.killerNumber)));
    const freeNum = pickFreeNumber(used);

    setPlayers((prev) => [
      ...prev,
      {
        pid: uid(),
        profileId: (candidate as any).id,
        name: (candidate as any).name || `Player ${prev.length + 1}`,
        killerNumber: freeNum,
      },
    ]);
  };

  const randomizeNumbers = () => {
    setPlayers((prev) => {
      const used = new Set<number>();
      return prev.map((p) => {
        const n = pickFreeNumber(used);
        used.add(n);
        return { ...p, killerNumber: n };
      });
    });
  };

  const ensureUniqueNumbers = () => {
    setPlayers((prev) => {
      const used = new Set<number>();
      return prev.map((p) => {
        let n = normNum(p.killerNumber);
        if (!used.has(n)) {
          used.add(n);
          return { ...p, killerNumber: n };
        }
        // collision -> pick free
        n = pickFreeNumber(used);
        used.add(n);
        return { ...p, killerNumber: n };
      });
    });
  };

  const handleStart = () => {
    ensureUniqueNumbers();
    const config: KillerMatchConfig = {
      mode: "killer",
      players: players.map((p) => ({
        ...p,
        killerNumber: normNum(p.killerNumber),
      })),
      params: { ...params },
    };
    go("killer_play", { config });
  };

  const Button = (p: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    tone?: "gold" | "soft" | "danger";
    style?: React.CSSProperties;
  }) => {
    const tone = p.tone || "gold";
    const bg =
      tone === "danger"
        ? "linear-gradient(180deg, rgba(255,90,90,.22), rgba(255,90,90,.10))"
        : tone === "soft"
        ? "rgba(255,255,255,.08)"
        : "linear-gradient(180deg, rgba(255,215,120,.28), rgba(255,215,120,.10))";

    const border =
      tone === "danger" ? "rgba(255,120,120,.35)" : tone === "soft" ? stroke : "rgba(255,215,120,.35)";

    const shadow =
      tone === "danger"
        ? "0 0 16px rgba(255,90,90,.18)"
        : tone === "soft"
        ? "0 0 0 rgba(0,0,0,0)"
        : glow;

    return (
      <button
        onClick={p.onClick}
        disabled={!!p.disabled}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: `1px solid ${border}`,
          background: bg,
          color: "#fff",
          fontWeight: 900,
          letterSpacing: 1,
          textTransform: "uppercase",
          cursor: p.disabled ? "not-allowed" : "pointer",
          opacity: p.disabled ? 0.55 : 1,
          boxShadow: p.disabled ? "none" : shadow,
          transition: "transform .12s, box-shadow .12s, opacity .12s",
          ...p.style,
        }}
        onMouseDown={(e) => {
          (e.currentTarget as any).style.transform = "scale(.98)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as any).style.transform = "scale(1)";
        }}
      >
        {p.label}
      </button>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg0,
        padding: "18px 14px 26px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <button
          onClick={() => go("games")}
          style={{
            width: 44,
            height: 40,
            borderRadius: 12,
            border: `1px solid ${stroke}`,
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
          title="Back"
        >
          {"←"}
        </button>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 1000,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#fff",
              textShadow: `0 0 18px rgba(0,0,0,.35), 0 0 18px rgba(255,215,120,.18)`,
            }}
          >
            KILLER — CONFIG
          </div>
          <div style={{ marginTop: 2, color: "rgba(255,255,255,.70)", fontSize: 12 }}>
            {t?.("Choose players, assign numbers, and start the chaos") ||
              "Choisis les joueurs, attribue les numéros, et lance le chaos."}
          </div>
        </div>

        <Button label={t?.("Start") || "START"} onClick={handleStart} disabled={!canStart} />
      </div>

      {/* Players card */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${stroke}`,
          background: card,
          padding: 14,
          boxShadow: "0 10px 40px rgba(0,0,0,.35)",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", color: "#fff" }}>
            {t?.("Players") || "JOUEURS"}
          </div>
          <div style={{ flex: 1 }} />
          <Button label={t?.("Random numbers") || "RANDOM"} onClick={randomizeNumbers} tone="soft" />
          <Button label={t?.("Add") || "AJOUTER"} onClick={addPlayer} />
        </div>

        {players.length === 0 ? (
          <div style={{ padding: 12, color: "rgba(255,255,255,.7)" }}>
            {t?.("No players yet") || "Aucun joueur."}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 6,
            }}
          >
            {players.map((p, idx) => {
              const prof = (store as any)?.profiles?.[p.profileId] as Profile | undefined;

              // collision visuelle
              const num = normNum(p.killerNumber);
              const isDup =
                players.filter((x) => normNum(x.killerNumber) === num).length > 1;

              return (
                <div
                  key={p.pid}
                  style={{
                    minWidth: 220,
                    borderRadius: 16,
                    border: `1px solid ${isDup ? "rgba(255,120,120,.55)" : stroke}`,
                    background: isDup
                      ? "linear-gradient(180deg, rgba(255,90,90,.14), rgba(255,255,255,.06))"
                      : "rgba(255,255,255,.06)",
                    padding: 12,
                    boxShadow: isDup ? "0 0 18px rgba(255,90,90,.18)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                      <ProfileAvatar profile={prof as any} size={54} />
                      <div style={{ position: "absolute", inset: -6, pointerEvents: "none" }}>
                        <ProfileStarRing size={66} active />
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "#fff",
                          fontWeight: 1000,
                          fontSize: 13,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.name || `Player ${idx + 1}`}
                      </div>

                      <div style={{ color: "rgba(255,255,255,.65)", fontSize: 12, marginTop: 2 }}>
                        #{idx + 1}
                      </div>
                    </div>

                    <Button
                      label="✕"
                      tone="danger"
                      onClick={() => removePlayer(p.pid)}
                      disabled={players.length <= 1}
                      style={{ padding: "8px 10px", borderRadius: 12 }}
                    />
                  </div>

                  {/* Profile picker */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ color: "rgba(255,255,255,.70)", fontSize: 12, marginBottom: 6 }}>
                      {t?.("Profile") || "PROFIL"}
                    </div>
                    <select
                      value={p.profileId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const nextProf = (store as any)?.profiles?.[nextId] as Profile | undefined;
                        updatePlayer(p.pid, {
                          profileId: nextId,
                          name: (nextProf as any)?.name || p.name,
                        });
                      }}
                      style={{
                        width: "100%",
                        height: 40,
                        borderRadius: 12,
                        border: `1px solid ${stroke}`,
                        background: "rgba(0,0,0,.20)",
                        color: "#fff",
                        padding: "0 10px",
                        fontWeight: 800,
                        outline: "none",
                      }}
                    >
                      {allProfiles.map((pr: any) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Killer number */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "rgba(255,255,255,.70)", fontSize: 12, marginBottom: 6 }}>
                          {t?.("Killer number") || "NUMÉRO KILLER"}
                          {isDup ? (
                            <span style={{ marginLeft: 8, color: "rgba(255,120,120,.95)", fontWeight: 1000 }}>
                              {t?.("duplicate") || "DOUBLON"}
                            </span>
                          ) : null}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={p.killerNumber}
                          onChange={(e) => updatePlayer(p.pid, { killerNumber: normNum(Number(e.target.value)) })}
                          style={{
                            width: "100%",
                            height: 40,
                            borderRadius: 12,
                            border: `1px solid ${stroke}`,
                            background: "rgba(0,0,0,.20)",
                            color: "#fff",
                            padding: "0 10px",
                            fontWeight: 1000,
                            outline: "none",
                            boxShadow: isDup ? "0 0 18px rgba(255,90,90,.12)" : "none",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          border: `1px solid ${stroke}`,
                          background: "radial-gradient(circle at 35% 25%, rgba(255,215,120,.35), rgba(255,255,255,.06))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: 1100,
                          fontSize: 20,
                          textShadow: "0 0 14px rgba(255,215,120,.22)",
                        }}
                        title="Killer number"
                      >
                        {normNum(p.killerNumber)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 10, color: "rgba(255,255,255,.60)", fontSize: 12 }}>
          {t?.("Tip: numbers should be unique (1-20)") ||
            "Astuce : les numéros doivent être uniques (1-20)."}
        </div>
      </div>

      {/* Options card */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${stroke}`,
          background: card,
          padding: 14,
          boxShadow: "0 10px 40px rgba(0,0,0,.30)",
        }}
      >
        <div style={{ fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", color: "#fff", marginBottom: 10 }}>
          {t?.("Options") || "OPTIONS"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* maxLives */}
          <div
            style={{
              border: `1px solid ${stroke}`,
              borderRadius: 16,
              padding: 12,
              background: "rgba(255,255,255,.06)",
            }}
          >
            <div style={{ color: "rgba(255,255,255,.70)", fontSize: 12, marginBottom: 6 }}>
              {t?.("Lives to become Killer") || "VIES POUR DEVENIR KILLER"}
            </div>
            <input
              type="number"
              min={1}
              max={9}
              value={params.maxLives}
              onChange={(e) => setParams((p) => ({ ...p, maxLives: clamp(Number(e.target.value || 3), 1, 9) }))}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 12,
                border: `1px solid ${stroke}`,
                background: "rgba(0,0,0,.20)",
                color: "#fff",
                padding: "0 10px",
                fontWeight: 1000,
                outline: "none",
              }}
            />
          </div>

          {/* exact */}
          <div
            style={{
              border: `1px solid ${stroke}`,
              borderRadius: 16,
              padding: 12,
              background: "rgba(255,255,255,.06)",
            }}
          >
            <div style={{ color: "rgba(255,255,255,.70)", fontSize: 12, marginBottom: 6 }}>
              {t?.("Exact lives required") || "ATTEINTE EXACTE"}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                label={params.mustReachExactLives ? (t?.("ON") || "ON") : (t?.("OFF") || "OFF")}
                onClick={() => setParams((p) => ({ ...p, mustReachExactLives: !p.mustReachExactLives }))}
                tone={params.mustReachExactLives ? "gold" : "soft"}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ marginTop: 8, color: "rgba(255,255,255,.60)", fontSize: 12 }}>
              {params.mustReachExactLives
                ? t?.("If you exceed, you gain nothing") || "Si tu dépasses, tu ne gagnes rien."
                : t?.("Lives are capped to max") || "Les vies sont capées au max."}
            </div>
          </div>

          {/* friendly fire */}
          <div
            style={{
              border: `1px solid ${stroke}`,
              borderRadius: 16,
              padding: 12,
              background: "rgba(255,255,255,.06)",
            }}
          >
            <div style={{ color: "rgba(255,255,255,.70)", fontSize: 12, marginBottom: 6 }}>
              {t?.("Friendly fire") || "FRIENDLY FIRE"}
            </div>
            <Button
              label={params.allowFriendlyFire ? (t?.("ON") || "ON") : (t?.("OFF") || "OFF")}
              onClick={() => setParams((p) => ({ ...p, allowFriendlyFire: !p.allowFriendlyFire }))}
              tone={params.allowFriendlyFire ? "gold" : "soft"}
              style={{ width: "100%" }}
            />
            <div style={{ marginTop: 8, color: "rgba(255,255,255,.60)", fontSize: 12 }}>
              {t?.("If ON, you can hit yourself (variants)") ||
                "Si ON, tu peux toucher toi-même (variantes)."}
            </div>
          </div>

          {/* lose lives on own number when killer */}
          <div
            style={{
              border: `1px solid ${stroke}`,
              borderRadius: 16,
              padding: 12,
              background: "rgba(255,255,255,.06)",
            }}
          >
            <div style={{ color: "rgba(255,255,255,.70)", fontSize: 12, marginBottom: 6 }}>
              {t?.("Own number hurts when Killer") || "SON NUMÉRO FAIT MAL (KILLER)"}
            </div>
            <Button
              label={params.loseLivesOnOwnNumberWhenKiller ? (t?.("ON") || "ON") : (t?.("OFF") || "OFF")}
              onClick={() =>
                setParams((p) => ({
                  ...p,
                  loseLivesOnOwnNumberWhenKiller: !p.loseLivesOnOwnNumberWhenKiller,
                }))
              }
              tone={params.loseLivesOnOwnNumberWhenKiller ? "gold" : "soft"}
              style={{ width: "100%" }}
            />
            <div style={{ marginTop: 8, color: "rgba(255,255,255,.60)", fontSize: 12 }}>
              {t?.("Variant: hitting your own number costs lives") ||
                "Variante : toucher ton propre numéro te retire des vies."}
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <Button
            label={t?.("Randomize numbers") || "RANDOM NUMBERS"}
            onClick={randomizeNumbers}
            tone="soft"
            style={{ flex: 1 }}
          />
          <Button
            label={t?.("Start match") || "START MATCH"}
            onClick={handleStart}
            disabled={!canStart}
            style={{ flex: 1 }}
          />
        </div>

        {!canStart ? (
          <div style={{ marginTop: 10, color: "rgba(255,120,120,.92)", fontSize: 12, fontWeight: 900 }}>
            {t?.("Need at least 2 players to start") || "Il faut au moins 2 joueurs pour démarrer."}
          </div>
        ) : null}
      </div>

      {/* Accent line */}
      <div
        style={{
          marginTop: 14,
          height: 2,
          borderRadius: 999,
          background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
          opacity: 0.55,
          filter: "blur(.2px)",
        }}
      />
    </div>
  );
}
