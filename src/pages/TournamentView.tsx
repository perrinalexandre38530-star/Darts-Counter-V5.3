// ============================================
// src/pages/TournamentView.tsx
// Tournois (LOCAL) — View (multi-visuals)
// ✅ Ajout : plusieurs vues d'affichage
// - "Résumé" (cards À jouer / En cours / Terminés)
// - "Tableau" (bracket global en colonnes par rounds, scroll horizontal)
// - "Matchs" (liste détaillée style TV)
// - "Poules" (groups_ko) : carrousel de poules + classement + matchs
// ✅ FIX CRASH: matches peut être undefined -> safeMatches partout
// ✅ FIX UI: BYE/TBD ne doivent JAMAIS apparaître comme "jouables"
// ✅ FIX UI: BYE vs BYE ne doit jamais être affiché (purge visuelle)
// ✅ NEW UI: on N'AFFICHE PLUS les matchs "vs BYE" -> on affiche un bloc "Qualifiés d’office"
// ✅ NEW UI: TBD -> affiche "Vainqueur du match X" + avatars des 2 joueurs du match source
// ✅ FIX STORELOCAL: bons noms list/upsert
// ============================================

import React from "react";
import type { Store } from "../lib/types";

import type { Tournament, TournamentMatch } from "../lib/tournaments/types";

import { startMatch, submitResult, getPlayableMatches } from "../lib/tournaments/engine";

import {
  getTournamentLocal,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  id: string;
};

type ViewMode = "summary" | "bracket" | "matches" | "groups";

const BYE = "__BYE__";
const TBD = "__TBD__";

function isByeId(x: any) {
  return String(x || "") === BYE;
}
function isTbdId(x: any) {
  return String(x || "") === TBD;
}
function isVoidByeMatch(m: any) {
  return isByeId(m?.aPlayerId) && isByeId(m?.bPlayerId);
}
function isByeMatch(m: any) {
  if (!m) return false;
  if (isVoidByeMatch(m)) return true;
  return isByeId(m?.aPlayerId) || isByeId(m?.bPlayerId);
}
function otherIdIfBye(m: any) {
  const a = String(m?.aPlayerId || "");
  const b = String(m?.bPlayerId || "");
  if (isByeId(a) && !isByeId(b) && b && !isTbdId(b)) return b;
  if (isByeId(b) && !isByeId(a) && a && !isTbdId(a)) return a;
  return "";
}
function isRealPlayable(m: any) {
  if (!m) return false;
  if (String(m.status || "") !== "pending") return false;
  if (!m?.aPlayerId || !m?.bPlayerId) return false;
  if (isTbdId(m.aPlayerId) || isTbdId(m.bPlayerId)) return false;
  if (isByeId(m.aPlayerId) || isByeId(m.bPlayerId)) return false;
  if (isVoidByeMatch(m)) return false;
  return true;
}

function formatDate(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

function Pill({
  active,
  label,
  onClick,
  accent = "#ffcf57",
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "7px 12px",
        border: active ? `1px solid ${accent}AA` : "1px solid rgba(255,255,255,0.12)",
        background: active
          ? `linear-gradient(180deg, ${accent}, ${accent}CC)`
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        color: active ? "#1b1508" : "rgba(255,255,255,0.92)",
        fontWeight: active ? 950 : 850,
        fontSize: 12.2,
        cursor: "pointer",
        boxShadow: active ? `0 10px 22px ${accent}25` : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Card({
  title,
  subtitle,
  badge,
  children,
  accent = "#ffcf57",
  icon,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {icon ? (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(circle at 30% 0%, ${accent}, ${accent}55)`,
                color: "#150d06",
                fontWeight: 950,
              }}
            >
              {icon}
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 3 }}>
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
        </div>
        {badge}
      </div>

      {children ? <div style={{ marginTop: 12 }}>{children}</div> : null}
    </div>
  );
}

function MiniBadge({
  label,
  value,
  accent = "#ffcf57",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        border: `1px solid ${accent}55`,
        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.04))`,
        color: "rgba(255,255,255,0.92)",
        fontWeight: 900,
        fontSize: 12,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.75, fontWeight: 850, fontSize: 11.5 }}>{label}</span>
      <span style={{ color: accent, textShadow: `0 0 10px ${accent}30` }}>{value}</span>
    </div>
  );
}

function AvatarCircle({
  name,
  avatarUrl,
  size = 30,
  dim,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  dim?: boolean;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        opacity: dim ? 0.65 : 1,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ fontWeight: 950, fontSize: Math.max(11, Math.floor(size * 0.4)) }}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

function PlayerPill({
  name,
  avatarUrl,
  dim,
  extra,
}: {
  name: string;
  avatarUrl?: string | null;
  dim?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        minWidth: 0,
        opacity: dim ? 0.6 : 1,
      }}
    >
      <AvatarCircle name={name} avatarUrl={avatarUrl} size={30} dim={dim} />
      <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name || "Joueur"}
        </div>
        {extra ? <div style={{ fontSize: 11, opacity: 0.75 }}>{extra}</div> : null}
      </div>
    </div>
  );
}

function scoreText(m: any) {
  const a = typeof m?.scoreA === "number" ? m.scoreA : null;
  const b = typeof m?.scoreB === "number" ? m.scoreB : null;
  if (a == null && b == null) return "";
  return `${a ?? 0} - ${b ?? 0}`;
}

function matchLabel(m: any) {
  if (m?.groupId) return `Poule`;
  if (typeof m?.round === "number") return `Round ${m.round}`;
  return "Match";
}

function matchKeyHuman(m: any) {
  const r = typeof m?.round === "number" ? m.round : null;
  const o = typeof m?.order === "number" ? m.order : null;
  if (r != null && o != null) return `R${r} • M${o + 1}`;
  if (r != null) return `R${r}`;
  return "Match";
}

/* -------------------------------------------
   TBD resolver: "Vainqueur du match X" + avatars
   (supporte plein de schémas possibles via keys)
-------------------------------------------- */

function pickFirstDefined(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return null;
}

function resolveSourceMatchForTbdSide(
  allMatches: any[],
  current: any,
  side: "a" | "b"
): any | null {
  // 1) champs directs sur le match (si présents)
  const directKeysA = ["aFromMatchId", "fromMatchIdA", "prevMatchIdA", "sourceMatchIdA", "feederMatchIdA"];
  const directKeysB = ["bFromMatchId", "fromMatchIdB", "prevMatchIdB", "sourceMatchIdB", "feederMatchIdB"];

  const direct = pickFirstDefined(current, side === "a" ? directKeysA : directKeysB);
  if (direct) {
    const f = allMatches.find((m) => String(m?.id) === String(direct));
    if (f) return f;
  }

  // 2) reverse lookup: des matches qui pointent vers current via nextMatchId / nextId / winnerToMatchId...
  const currentId = String(current?.id || "");
  if (!currentId) return null;

  const candidates = allMatches.filter((m) => {
    const next = pickFirstDefined(m, ["nextMatchId", "nextId", "winnerToMatchId", "toMatchId"]);
    if (!next) return false;
    return String(next) === currentId;
  });

  if (!candidates.length) return null;

  // si on a un slot / position, on essaye de respecter side
  const bySide = candidates.find((m) => {
    const slot = pickFirstDefined(m, ["nextSlot", "toSlot", "winnerToSlot", "slot"]);
    if (!slot) return false;
    const s = String(slot).toLowerCase();
    return side === "a" ? s.includes("a") || s.includes("left") : s.includes("b") || s.includes("right");
  });

  return bySide || candidates[0] || null;
}

function WinnerPlaceholder({
  label,
  leftAvatarUrl,
  leftName,
  rightAvatarUrl,
  rightName,
}: {
  label: string;
  leftAvatarUrl?: string | null;
  leftName: string;
  rightAvatarUrl?: string | null;
  rightName: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: -8 }}>
        <div style={{ marginRight: -8, zIndex: 2 }}>
          <AvatarCircle name={leftName} avatarUrl={leftAvatarUrl} size={26} />
        </div>
        <AvatarCircle name={rightName} avatarUrl={rightAvatarUrl} size={26} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontWeight: 950,
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 11, opacity: 0.72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {leftName} vs {rightName}
        </div>
      </div>
    </div>
  );
}

function renderPlayerOrTbd(
  allMatches: any[],
  current: any,
  side: "a" | "b",
  playersById: Record<string, any>
) {
  const pid = String(side === "a" ? current?.aPlayerId : current?.bPlayerId || "");
  if (!pid) return <PlayerPill name="TBD" dim />;

  if (isByeId(pid)) {
    // on ne devrait pas afficher les matchs BYE, mais par sécurité
    return <PlayerPill name="BYE" dim />;
  }

  if (!isTbdId(pid)) {
    const pl = playersById[pid];
    return <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatar} />;
  }

  const feeder = resolveSourceMatchForTbdSide(allMatches, current, side);
  if (!feeder) {
    return <PlayerPill name="Vainqueur du match précédent" dim extra={matchKeyHuman(current)} />;
  }

  const fa = String(feeder?.aPlayerId || "");
  const fb = String(feeder?.bPlayerId || "");

  const pa = fa && playersById[fa] ? playersById[fa] : null;
  const pb = fb && playersById[fb] ? playersById[fb] : null;

  const leftName = pa?.name || (isByeId(fa) ? "BYE" : isTbdId(fa) ? "TBD" : "Joueur");
  const rightName = pb?.name || (isByeId(fb) ? "BYE" : isTbdId(fb) ? "TBD" : "Joueur");

  const label = `Vainqueur ${matchKeyHuman(feeder)}`;

  return (
    <WinnerPlaceholder
      label={label}
      leftName={leftName}
      leftAvatarUrl={pa?.avatar || null}
      rightName={rightName}
      rightAvatarUrl={pb?.avatar || null}
    />
  );
}

/* -----------------------------
   Bracket overview (KO)
   -> n'affiche PLUS les matchs "vs BYE"
------------------------------ */

function BracketOverview({
  tournament,
  matches,
  allMatches,
  playersById,
  onStart,
  onOpenResult,
}: {
  tournament: any;
  matches: any[];
  allMatches: any[];
  playersById: Record<string, any>;
  onStart: (id: string) => void;
  onOpenResult: (m: any) => void;
}) {
  // only KO-like (no group matches)
  const koMatches = (Array.isArray(matches) ? matches : [])
    .filter((m) => !m?.groupId)
    // ✅ purge visuelle : jamais BYE vs BYE
    .filter((m) => !isVoidByeMatch(m))
    // ✅ NEW : pas de match vs BYE (on gère via "Qualifiés d'office")
    .filter((m) => !isByeMatch(m));

  const rounds = Array.from(
    new Set(koMatches.map((m) => (typeof m?.round === "number" ? m.round : 1)))
  ).sort((a: number, b: number) => a - b);

  const byRound: Record<number, any[]> = {};
  for (const r of rounds) byRound[r] = [];
  for (const m of koMatches) {
    const r = typeof m?.round === "number" ? m.round : 1;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(m);
  }
  for (const r of Object.keys(byRound)) {
    byRound[Number(r)].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
  }

  const formatType = tournament?.format?.type || "";
  const subtitle =
    formatType === "double_ko"
      ? "Double élimination — bracket (1er tour + progression)."
      : "Élimination directe — bracket global.";

  return (
    <Card
      title="Tableau"
      subtitle={subtitle}
      accent="#4fb4ff"
      icon="⟂"
      badge={<MiniBadge label="Matchs" value={koMatches.length} accent="#4fb4ff" />}
    >
      {koMatches.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match KO à afficher.</div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 6,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {rounds.map((r) => (
            <div
              key={r}
              style={{
                width: 260,
                flex: "0 0 auto",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 10,
              }}
            >
              <div
                style={{
                  fontWeight: 950,
                  fontSize: 12,
                  color: "#4fb4ff",
                  textShadow: "0 0 10px rgba(79,180,255,0.35)",
                  marginBottom: 8,
                }}
              >
                ROUND {r}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {byRound[r]?.map((m: any) => {
                  const status = String(m?.status || "pending");
                  const playable = isRealPlayable(m);
                  const running = status === "running" || status === "playing";
                  const done = status === "done";

                  const actionLabel = running ? "Reprendre" : playable ? "Jouer" : done ? "Résultat" : "—";

                  return (
                    <div
                      key={m.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background:
                          "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
                        padding: 10,
                        boxShadow: done ? "0 10px 22px rgba(0,0,0,0.35)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                          <div style={{ minWidth: 0 }}>{renderPlayerOrTbd(allMatches, m, "a", playersById)}</div>
                          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                          <div style={{ minWidth: 0 }}>{renderPlayerOrTbd(allMatches, m, "b", playersById)}</div>
                        </div>

                        <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                          <div style={{ fontSize: 11.5, opacity: 0.75 }}>{matchLabel(m)}</div>
                          <div
                            style={{
                              fontWeight: 950,
                              fontSize: 13,
                              color: done ? "#7fe2a9" : "#ffcf57",
                            }}
                          >
                            {done ? scoreText(m) : running ? "EN COURS" : playable ? "À JOUER" : "ATTENTE"}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (done) onOpenResult(m);
                              else if (running || playable) onStart(m.id);
                            }}
                            disabled={!done && !running && !playable}
                            style={{
                              borderRadius: 999,
                              padding: "7px 10px",
                              border: "none",
                              fontWeight: 950,
                              cursor: !done && !running && !playable ? "default" : "pointer",
                              background: !done && !running && !playable
                                ? "linear-gradient(180deg,#3a3a3a,#232323)"
                                : running
                                ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                                : done
                                ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                                : "linear-gradient(180deg,#ffc63a,#ffaf00)",
                              color: !done && !running && !playable ? "rgba(255,255,255,0.55)" : "#120c06",
                              opacity: !done && !running && !playable ? 0.6 : 1,
                            }}
                          >
                            {actionLabel}
                          </button>
                        </div>
                      </div>

                      {done && m?.winnerId ? (
                        <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.78 }}>
                          ✅ Vainqueur :{" "}
                          <b style={{ color: "#7fe2a9" }}>
                            {playersById[String(m.winnerId)]?.name || "—"}
                          </b>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* -----------------------------
   Detailed matches view (TV-like)
   -> n'affiche PLUS les matchs "vs BYE"
------------------------------ */

function MatchDetailsList({
  title,
  subtitle,
  matches,
  allMatches,
  playersById,
  onStart,
  onOpenResult,
  accent,
  icon,
}: {
  title: string;
  subtitle?: string;
  matches: any[];
  allMatches: any[];
  playersById: Record<string, any>;
  onStart: (id: string) => void;
  onOpenResult: (m: any) => void;
  accent: string;
  icon?: React.ReactNode;
}) {
  const safe = (Array.isArray(matches) ? matches : [])
    .filter((m) => !isVoidByeMatch(m))
    // ✅ NEW : pas de match vs BYE
    .filter((m) => !isByeMatch(m));

  return (
    <Card
      title={title}
      subtitle={subtitle}
      accent={accent}
      icon={icon}
      badge={<MiniBadge label="Matchs" value={safe.length} accent={accent} />}
    >
      {safe.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match à afficher.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {safe.map((m: any) => {
            const status = String(m?.status || "pending");
            const playable = isRealPlayable(m);
            const running = status === "running" || status === "playing";
            const done = status === "done";

            const topTag = done ? "TERMINÉ" : running ? "EN COURS" : playable ? "À JOUER" : "ATTENTE";
            const topColor =
              done ? "#7fe2a9" : running ? "#4fb4ff" : playable ? "#ffcf57" : "rgba(255,255,255,0.55)";

            return (
              <div
                key={m.id}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background:
                    "radial-gradient(120% 160% at 0% 0%, rgba(79,180,255,0.08), transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
                  padding: 12,
                  boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        background: topColor,
                        boxShadow: `0 0 14px ${topColor}55`,
                        flex: "0 0 auto",
                      }}
                    />
                    <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 12.5, color: topColor }}>
                        {topTag} • {matchLabel(m)}
                      </div>
                      <div style={{ fontSize: 11.5, opacity: 0.75 }}>
                        BO{m?.bestOf ?? "?"} •{" "}
                        {m?.groupId
                          ? `Groupe ${String(m.groupId).slice(-4)}`
                          : m?.round
                          ? `Round ${m.round}`
                          : ""}{" "}
                        {m?.updatedAt ? `• ${formatDate(m.updatedAt)}` : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (done) onOpenResult(m);
                      else if (running || playable) onStart(m.id);
                    }}
                    disabled={!done && !running && !playable}
                    style={{
                      borderRadius: 999,
                      padding: "8px 12px",
                      border: "none",
                      fontWeight: 950,
                      cursor: !done && !running && !playable ? "default" : "pointer",
                      background: !done && !running && !playable
                        ? "linear-gradient(180deg,#3a3a3a,#232323)"
                        : running
                        ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                        : done
                        ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                        : "linear-gradient(180deg,#ffc63a,#ffaf00)",
                      color: !done && !running && !playable ? "rgba(255,255,255,0.55)" : "#120c06",
                      opacity: !done && !running && !playable ? 0.6 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {done ? "Voir" : running ? "Reprendre" : playable ? "Jouer" : "—"}
                  </button>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>{renderPlayerOrTbd(allMatches, m, "a", playersById)}</div>
                    <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.9 }}>
                      {done ? scoreText(m) : "VS"}
                    </div>
                    <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
                      {renderPlayerOrTbd(allMatches, m, "b", playersById)}
                    </div>
                  </div>

                  {done && m?.winnerId ? (
                    <div style={{ fontSize: 11.5, opacity: 0.78 }}>
                      ✅ Vainqueur :{" "}
                      <b style={{ color: "#7fe2a9" }}>{playersById[String(m.winnerId)]?.name || "—"}</b>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* -----------------------------
   Groups carousel + standings
   (on garde la logique, mais on masque les matchs vs BYE)
------------------------------ */

function computeStandings(groupPlayerIds: string[], groupMatches: any[]) {
  const rows: Record<
    string,
    { id: string; played: number; wins: number; losses: number; points: number; scored: number; conceded: number }
  > = {};

  for (const pid of groupPlayerIds) {
    rows[pid] = { id: pid, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };
  }

  for (const m of groupMatches) {
    if (m?.status !== "done") continue;
    const a = String(m?.aPlayerId || "");
    const b = String(m?.bPlayerId || "");
    if (!a || !b) continue;
    if (isByeId(a) || isByeId(b)) continue;
    if (isTbdId(a) || isTbdId(b)) continue;

    if (!rows[a]) rows[a] = { id: a, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };
    if (!rows[b]) rows[b] = { id: b, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

    const sa = typeof m?.scoreA === "number" ? m.scoreA : 0;
    const sb = typeof m?.scoreB === "number" ? m.scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m?.winnerId || "");
    if (w && w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += 2;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += 2;
    }
  }

  const arr = Object.values(rows);
  arr.sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points;
    const diff1 = r1.scored - r1.conceded;
    const diff2 = r2.scored - r2.conceded;
    if (diff2 !== diff1) return diff2 - diff1;
    return r2.wins - r1.wins;
  });
  return arr;
}

function GroupsCarousel({
  tournament,
  matches,
  allMatches,
  playersById,
  onStart,
  onOpenResult,
}: {
  tournament: any;
  matches: any[];
  allMatches: any[];
  playersById: Record<string, any>;
  onStart: (id: string) => void;
  onOpenResult: (m: any) => void;
}) {
  const safeMatches = (Array.isArray(matches) ? matches : [])
    .filter((m) => !isVoidByeMatch(m)); // ✅

  const groups = Array.isArray(tournament?.groups) ? tournament.groups : [];

  const derivedGroupIds = Array.from(
    new Set(safeMatches.filter((m) => m?.groupId).map((m) => String(m.groupId)))
  );

  const groupList =
    groups.length > 0
      ? groups
      : derivedGroupIds.map((gid, idx) => ({
          id: gid,
          name: `Groupe ${idx + 1}`,
          playerIds: Array.from(
            new Set(
              safeMatches
                .filter((m) => String(m.groupId) === gid)
                .flatMap((m) => [m?.aPlayerId, m?.bPlayerId])
                .filter(Boolean)
                .map((x) => String(x))
                .filter((x) => !isByeId(x) && !isTbdId(x))
            )
          ),
        }));

  return (
    <Card
      title="Poules"
      subtitle="Swipe entre les groupes : classement + matchs."
      accent="#7fe2a9"
      icon="▦"
      badge={<MiniBadge label="Groupes" value={groupList.length} accent="#7fe2a9" />}
    >
      {groupList.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.78 }}>Aucune poule.</div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 6,
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
        >
          {groupList.map((g: any) => {
            const gid = String(g.id);
            const groupMatches = safeMatches.filter((m) => String(m?.groupId) === gid);
            const pids = Array.isArray(g?.playerIds) ? g.playerIds.map((x: any) => String(x)) : [];
            const standings = computeStandings(pids, groupMatches);

            const groupMatchesVisible = groupMatches
              .slice()
              .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
              .filter((m) => !isVoidByeMatch(m))
              .filter((m) => !isByeMatch(m));

            return (
              <div
                key={gid}
                style={{
                  width: 320,
                  flex: "0 0 auto",
                  scrollSnapAlign: "start",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 13, color: "#7fe2a9" }}>
                    {g?.name || `Groupe`}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.75 }}>{groupMatchesVisible.length} matchs</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11.5, opacity: 0.82, marginBottom: 6 }}>Classement</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {standings.map((r, idx) => {
                      const pl = playersById[String(r.id)];
                      const diff = r.scored - r.conceded;
                      return (
                        <div
                          key={r.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px 1fr auto",
                            gap: 10,
                            alignItems: "center",
                            padding: "8px 10px",
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.25)",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 950,
                              color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.75)",
                            }}
                          >
                            {idx + 1}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatar} />
                          </div>

                          <div style={{ textAlign: "right", fontSize: 11.5, opacity: 0.9 }}>
                            <b style={{ color: "#7fe2a9" }}>{r.points}</b> pts • {r.wins}-{r.losses} • Δ {diff}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11.5, opacity: 0.82, marginBottom: 6 }}>Matchs</div>

                  {groupMatchesVisible.length === 0 ? (
                    <div style={{ fontSize: 12, opacity: 0.72 }}>Aucun match à afficher (BYE masqués).</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {groupMatchesVisible.map((m: any) => {
                        const status = String(m?.status || "pending");
                        const playable = isRealPlayable(m);
                        const running = status === "running" || status === "playing";
                        const done = status === "done";

                        return (
                          <div
                            key={m.id}
                            style={{
                              borderRadius: 14,
                              border: "1px solid rgba(255,255,255,0.10)",
                              background:
                                "linear-gradient(180deg, rgba(0,0,0,0.30), rgba(255,255,255,0.03))",
                              padding: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                  <div style={{ minWidth: 0 }}>{renderPlayerOrTbd(allMatches, m, "a", playersById)}</div>
                                  <div style={{ fontWeight: 950, opacity: 0.85 }}>{done ? scoreText(m) : "VS"}</div>
                                  <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
                                    {renderPlayerOrTbd(allMatches, m, "b", playersById)}
                                  </div>
                                </div>

                                <div style={{ fontSize: 11.2, opacity: 0.75 }}>
                                  BO{m?.bestOf ?? "?"} • {done ? "Terminé" : running ? "En cours" : playable ? "À jouer" : "Attente"}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (done) onOpenResult(m);
                                  else if (running || playable) onStart(m.id);
                                }}
                                disabled={!done && !running && !playable}
                                style={{
                                  borderRadius: 999,
                                  padding: "7px 10px",
                                  border: "none",
                                  fontWeight: 950,
                                  cursor: !done && !running && !playable ? "default" : "pointer",
                                  background: !done && !running && !playable
                                    ? "linear-gradient(180deg,#3a3a3a,#232323)"
                                    : running
                                    ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                                    : done
                                    ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                                    : "linear-gradient(180deg,#ffc63a,#ffaf00)",
                                  color: !done && !running && !playable ? "rgba(255,255,255,0.55)" : "#120c06",
                                  opacity: !done && !running && !playable ? 0.6 : 1,
                                }}
                              >
                                {done ? "Voir" : running ? "↺" : playable ? "▶" : "—"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* -----------------------------
   Page
------------------------------ */

export default function TournamentView({ store, go, id }: Props) {
  const [tour, setTour] = React.useState<Tournament | null>(null);
  const [matches, setMatches] = React.useState<TournamentMatch[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ✅ FIX: matches peut être undefined -> on normalise
  const safeMatches: TournamentMatch[] = React.useMemo(
    () => (Array.isArray(matches) ? matches : []),
    [matches]
  );

  // ✅ purge minimale : jamais BYE vs BYE
  const visibleMatches: TournamentMatch[] = React.useMemo(
    () => safeMatches.filter((m: any) => !isVoidByeMatch(m)),
    [safeMatches]
  );

  // ✅ NEW : matches affichables (on masque TOUS les matchs avec BYE)
  const displayMatches: TournamentMatch[] = React.useMemo(
    () => visibleMatches.filter((m: any) => !isByeMatch(m)),
    [visibleMatches]
  );

  const [view, setView] = React.useState<ViewMode>("summary");
  const [resultMatch, setResultMatch] = React.useState<TournamentMatch | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const t = await getTournamentLocal(id);
        const ms = await listMatchesForTournamentLocal(id);
        if (!alive) return;
        setTour((t as any) ?? null);
        setMatches(Array.isArray(ms) ? (ms as any) : []);
      } catch (e) {
        console.error("[TournamentView] load error:", e);
        if (alive) {
          setTour(null);
          setMatches([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const playersById = React.useMemo(() => {
    const out: Record<string, any> = {};
    const pls = (tour as any)?.players || [];
    for (const p of pls) {
      if (!p?.id) continue;
      out[String(p.id)] = {
        id: String(p.id),
        name: p?.name || "Joueur",
        avatar: p?.avatar || p?.avatarDataUrl || p?.avatarUrl || null,
      };
    }
    return out;
  }, [tour]);

  // ✅ NEW : qualifiés d'office (BYE) -> bloc au lieu de matchs vs BYE
  const autoQualified = React.useMemo(() => {
    // on veut lister les joueurs qui passent via BYE (un match avec un seul joueur réel)
    const ids: string[] = [];

    for (const m of visibleMatches as any[]) {
      if (!m) continue;
      if (!isByeMatch(m)) continue;
      if (isVoidByeMatch(m)) continue;

      const pid = otherIdIfBye(m);
      if (!pid) continue;

      // si le moteur marque done + winnerId, OK
      // si pending mais BYE (selon moteur), on considère aussi "qualifié"
      ids.push(pid);
    }

    // unique + only real
    const uniq = Array.from(new Set(ids)).filter((x) => x && !isByeId(x) && !isTbdId(x));
    return uniq.map((pid) => playersById[pid]).filter(Boolean);
  }, [visibleMatches, playersById]);

  const { playableMatches, runningMatches, doneMatches } = React.useMemo(() => {
    // IMPORTANT: jouables = UNIQUEMENT sur displayMatches (pas de BYE, pas de TBD)
    const playable = displayMatches.filter((m: any) => isRealPlayable(m));
    const running = displayMatches.filter((m: any) => {
      const st = String(m?.status || "");
      return st === "running" || st === "playing";
    });
    const done = displayMatches.filter((m: any) => String(m?.status || "") === "done");

    return {
      playableMatches: playable as any[],
      runningMatches: running as any[],
      doneMatches: done as any[],
    };
  }, [displayMatches]);

  const hasGroups = React.useMemo(() => {
    if ((tour as any)?.format?.type === "groups_ko") return true;
    if (Array.isArray((tour as any)?.groups) && (tour as any).groups.length) return true;
    return visibleMatches.some((m: any) => !!m?.groupId);
  }, [tour, visibleMatches]);

  const statusCounts = React.useMemo(() => {
    // counts sur displayMatches (ce que tu vois à l’écran)
    const pending = displayMatches.filter((m: any) => String(m?.status || "") === "pending").length;
    const running = displayMatches.filter((m: any) => {
      const st = String(m?.status || "");
      return st === "running" || st === "playing";
    }).length;
    const done = displayMatches.filter((m: any) => String(m?.status || "") === "done").length;
    return { pending, running, done };
  }, [displayMatches]);

  const persist = React.useCallback(
    async (nextTour: Tournament, nextMatches: TournamentMatch[]) => {
      const fixedMatches = Array.isArray(nextMatches) ? nextMatches : [];
      setTour(nextTour);
      setMatches(fixedMatches);

      try {
        await upsertTournamentLocal(nextTour as any);
        await upsertMatchesForTournamentLocal((nextTour as any).id, fixedMatches as any);
      } catch (e) {
        console.error("[TournamentView] persist error:", e);
      }
    },
    []
  );

  const onStartMatch = React.useCallback(
    async (matchId: string) => {
      if (!tour) return;

      try {
        const r = startMatch({
          tournament: tour as any,
          matches: safeMatches as any,
          matchId,
        });

        await persist(r.tournament as any, r.matches as any);

        go("tournament_match_play", { tournamentId: (tour as any).id, matchId });
      } catch (e) {
        console.error("[TournamentView] startMatch error:", e);
      }
    },
    [tour, safeMatches, persist, go]
  );

  // ✅ AUTO: lance automatiquement le prochain match jouable
  const onAutoNextMatch = React.useCallback(async () => {
    if (!tour) return;

    try {
      // on laisse le moteur décider, MAIS on filtre côté UI pour ne pas démarrer BYE/TBD par accident
      const playable = getPlayableMatches(tour as any, safeMatches as any) || [];
      const realPlayable = playable.filter((m: any) => isRealPlayable(m) && !isByeMatch(m));
      if (!realPlayable.length) return;

      const next = realPlayable[0];

      const r = startMatch({
        tournament: tour as any,
        matches: safeMatches as any,
        matchId: next.id,
      });

      await persist(r.tournament as any, r.matches as any);

      go("tournament_match_play", {
        tournamentId: (tour as any).id,
        matchId: next.id,
      });
    } catch (e) {
      console.error("[TournamentView] AUTO start error:", e);
    }
  }, [tour, safeMatches, persist, go]);

  const onOpenResult = React.useCallback((m: any) => setResultMatch(m), []);

  const allMatchesSorted = React.useMemo(() => {
    const arr = [...(displayMatches as any[])];
    const statusRank: Record<string, number> = { running: 0, playing: 0, pending: 1, done: 2 };

    arr.sort((a, b) => {
      const ra = statusRank[String(a?.status || "")] ?? 9;
      const rb = statusRank[String(b?.status || "")] ?? 9;
      if (ra !== rb) return ra - rb;

      const ga = a?.groupId ? 1 : 0;
      const gb = b?.groupId ? 1 : 0;
      if (ga !== gb) return ga - gb;

      const r1 = a?.round ?? 999;
      const r2 = b?.round ?? 999;
      if (r1 !== r2) return r1 - r2;

      return (a?.order ?? 0) - (b?.order ?? 0);
    });

    return arr;
  }, [displayMatches]);

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
          ←
        </button>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: 0.2 }}>
            {(tour as any)?.name || "Tournoi"}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.75 }}>
            {(tour as any)?.status ? String((tour as any).status).toUpperCase() : "—"} •{" "}
            {statusCounts.pending}/{displayMatches.length}
          </div>
        </div>
      </div>

      {/* View switch */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Pill active={view === "summary"} label="Résumé" onClick={() => setView("summary")} accent="#ffcf57" />
        <Pill active={view === "bracket"} label="Tableau" onClick={() => setView("bracket")} accent="#4fb4ff" />
        <Pill active={view === "matches"} label="Matchs" onClick={() => setView("matches")} accent="#ff4fd8" />
        {hasGroups ? (
          <Pill active={view === "groups"} label="Poules" onClick={() => setView("groups")} accent="#7fe2a9" />
        ) : null}
      </div>

      {loading ? (
        <Card title="Chargement…" subtitle="Récupération du tournoi et des matchs." accent="#ffcf57" />
      ) : !tour ? (
        <Card title="Introuvable" subtitle="Ce tournoi n'existe pas (ou a été supprimé)." accent="#ff4fd8" />
      ) : (
        <>
          {/* ✅ VUE : RÉSUMÉ */}
          {view === "summary" ? (
            <>
              {/* ✅ NEW : Qualifiés d'office */}
              {autoQualified.length ? (
                <Card
                  title="Qualifiés d’office"
                  subtitle="Exempt (BYE) — ces joueurs passent automatiquement le tour."
                  accent="#7fe2a9"
                  icon="★"
                  badge={<MiniBadge label="Qualifiés" value={autoQualified.length} accent="#7fe2a9" />}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    {autoQualified.map((p: any) => (
                      <div
                        key={String(p.id)}
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.28), rgba(255,255,255,0.03))",
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <PlayerPill name={p?.name || "Joueur"} avatarUrl={p?.avatar || null} />
                        <div style={{ fontWeight: 950, color: "#7fe2a9", opacity: 0.95 }}>✅ Qualifié</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card
                title="À jouer"
                subtitle={playableMatches.length ? "Choisis un match à lancer." : "Aucun match jouable pour le moment."}
                accent="#ffcf57"
                icon="⚡"
                badge={<MiniBadge label="À jouer" value={playableMatches.length} accent="#ffcf57" />}
              >
                {playableMatches.length ? (
                  <>
                    {/* ✅ Bouton global */}
                    <button
                      type="button"
                      onClick={onAutoNextMatch}
                      disabled={!playableMatches.length}
                      style={{
                        width: "100%",
                        borderRadius: 14,
                        padding: "10px 12px",
                        border: "none",
                        fontWeight: 950,
                        cursor: playableMatches.length ? "pointer" : "default",
                        background: playableMatches.length
                          ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                          : "linear-gradient(180deg,#3a3a3a,#232323)",
                        color: playableMatches.length ? "#0b0f14" : "rgba(255,255,255,0.55)",
                        boxShadow: playableMatches.length ? "0 16px 34px rgba(79,180,255,0.18)" : "none",
                        marginBottom: 10,
                      }}
                    >
                      ▶ LANCER LE PROCHAIN MATCH
                    </button>

                    <div style={{ display: "grid", gap: 10 }}>
                      {playableMatches.slice(0, 6).map((m: any) => (
                        <div
                          key={m.id}
                          style={{
                            borderRadius: 16,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
                            padding: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ minWidth: 0 }}>{renderPlayerOrTbd(safeMatches as any, m, "a", playersById)}</div>
                              <div style={{ fontWeight: 950, opacity: 0.8 }}>VS</div>
                              <div style={{ minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
                                {renderPlayerOrTbd(safeMatches as any, m, "b", playersById)}
                              </div>
                            </div>
                            <div style={{ fontSize: 11.5, opacity: 0.75 }}>
                              {matchLabel(m)} • BO{m?.bestOf ?? "?"}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onStartMatch(m.id)}
                            style={{
                              borderRadius: 999,
                              padding: "8px 12px",
                              border: "none",
                              fontWeight: 950,
                              cursor: "pointer",
                              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
                              color: "#120c06",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Jouer
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </Card>

              <Card
                title="Matchs en cours"
                subtitle={runningMatches.length ? "Reprendre un match en cours." : "Aucun match en cours."}
                accent="#4fb4ff"
                icon="●"
                badge={<MiniBadge label="En cours" value={runningMatches.length} accent="#4fb4ff" />}
              />

              <Card
                title="Terminés"
                subtitle={doneMatches.length ? "Consulter les résultats." : "Aucun match terminé."}
                accent="#7fe2a9"
                icon="✓"
                badge={<MiniBadge label="Terminés" value={doneMatches.length} accent="#7fe2a9" />}
              />
            </>
          ) : null}

          {/* ✅ VUE : TABLEAU */}
          {view === "bracket" ? (
            <BracketOverview
              tournament={tour as any}
              matches={displayMatches as any}
              allMatches={safeMatches as any}
              playersById={playersById}
              onStart={onStartMatch}
              onOpenResult={onOpenResult}
            />
          ) : null}

          {/* ✅ VUE : MATCHS */}
          {view === "matches" ? (
            <MatchDetailsList
              title="Matchs"
              subtitle="Vue détaillée (style TV)."
              matches={allMatchesSorted}
              allMatches={safeMatches as any}
              playersById={playersById}
              onStart={onStartMatch}
              onOpenResult={onOpenResult}
              accent="#ff4fd8"
              icon="≡"
            />
          ) : null}

          {/* ✅ VUE : POULES */}
          {view === "groups" ? (
            <GroupsCarousel
              tournament={tour as any}
              matches={visibleMatches as any}
              allMatches={safeMatches as any}
              playersById={playersById}
              onStart={onStartMatch}
              onOpenResult={onOpenResult}
            />
          ) : null}
        </>
      )}

      {/* Modal résultat */}
      {resultMatch ? (
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
          onMouseDown={() => setResultMatch(null)}
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
              <div style={{ fontWeight: 950, fontSize: 14, color: "#ffcf57" }}>Résultat</div>
              <button
                type="button"
                onClick={() => setResultMatch(null)}
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

            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
                Choisis le vainqueur pour enregistrer le résultat.
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!tour) return;
                    const r = submitResult({
                      tournament: tour as any,
                      matches: safeMatches as any,
                      matchId: (resultMatch as any).id,
                      winnerId: String((resultMatch as any).aPlayerId),
                      historyMatchId: null,
                    });
                    persist(r.tournament as any, r.matches as any);
                    setResultMatch(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(255,207,87,0.18), rgba(255,207,87,0.08))",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 950,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ✅ {playersById[String((resultMatch as any).aPlayerId)]?.name || "Joueur A"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!tour) return;
                    const r = submitResult({
                      tournament: tour as any,
                      matches: safeMatches as any,
                      matchId: (resultMatch as any).id,
                      winnerId: String((resultMatch as any).bPlayerId),
                      historyMatchId: null,
                    });
                    persist(r.tournament as any, r.matches as any);
                    setResultMatch(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(79,180,255,0.18), rgba(79,180,255,0.08))",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 950,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ✅ {playersById[String((resultMatch as any).bPlayerId)]?.name || "Joueur B"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
