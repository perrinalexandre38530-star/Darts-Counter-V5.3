// ============================================
// src/pages/ProfilesBots.tsx
// Gestion des BOTS (joueurs virtuels / CPU)
// - Création / édition / suppression de BOTS
// - Médaillon joueur (compatible ProfileAvatar)
// - Niveaux de performance (easy -> legend)
// - Stockage localStorage (dc_bots_v1)
// - Pensé pour être appelé depuis Profiles.tsx
// ============================================

import React from "react";
import { nanoid } from "nanoid";
import type { Store, Profile } from "../lib/types";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

// --------------------------------------------
// Types & Storage
// --------------------------------------------

export type BotLevel = "easy" | "medium" | "strong" | "pro" | "legend";

export type Bot = {
  id: string;
  name: string;
  level: BotLevel;
  // avatarSeed : n'importe quelle valeur compatible
  // avec ton AvatarCreator / ProfileAvatar
  avatarSeed: string;
  createdAt: string;
  updatedAt: string;
};

const LS_BOTS_KEY = "dc_bots_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadBots(): Bot[] {
  if (typeof window === "undefined") return [];
  return safeParse<Bot[]>(window.localStorage.getItem(LS_BOTS_KEY), []);
}

function saveBots(bots: Bot[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_BOTS_KEY, JSON.stringify(bots));
}

// Petit helper : convertir un Bot vers un Profile "fake"
// pour réutiliser ProfileAvatar partout dans l’appli.
function botToProfile(bot: Bot): Profile {
  // @ts-expect-error : on complète juste ce qui est nécessaire
  const fakeProfile: Profile = {
    id: bot.id,
    name: bot.name,
    avatar: {
      // Tu adapteras ce shape à ton AvatarCreator :
      // ici on stocke juste un seed / preset.
      seed: bot.avatarSeed,
      kind: "bot",
    },
    // Indicateur pour plus tard si tu veux différencier
    // dans les stats / sélecteurs :
    isBot: true,
  };

  return fakeProfile;
}

// --------------------------------------------
// UI helpers
// --------------------------------------------

function levelLabel(level: BotLevel, t: (k: string, f?: string) => string) {
  switch (level) {
    case "easy":
      return t("bots.level.easy", "Débutant");
    case "medium":
      return t("bots.level.medium", "Standard");
    case "strong":
      return t("bots.level.strong", "Fort");
    case "pro":
      return t("bots.level.pro", "Pro");
    case "legend":
      return t("bots.level.legend", "Légende");
    default:
      return level;
  }
}

function levelHint(level: BotLevel, t: (k: string, f?: string) => string) {
  switch (level) {
    case "easy":
      return t("bots.level.easy.hint", "Score moyen, idéal pour débuter.");
    case "medium":
      return t("bots.level.medium.hint", "Niveau régulier, proche d’un joueur loisir.");
    case "strong":
      return t("bots.level.strong.hint", "Bon joueur de club, régulier.");
    case "pro":
      return t("bots.level.pro.hint", "Très solide, proche des joueurs régionaux.");
    case "legend":
      return t("bots.level.legend.hint", "Mode Monster / mode streamer énervé.");
    default:
      return "";
  }
}

// --------------------------------------------
// Composant principal
// --------------------------------------------

type Props = {
  store: Store;
  // suivant ta navigation : setTab ou go
  setTab?: (tab: any, params?: any) => void;
  go?: (tab: any, params?: any) => void;
};

export default function ProfilesBots({ store, setTab, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [bots, setBots] = React.useState<Bot[]>(() => loadBots());
  const [editingBotId, setEditingBotId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [level, setLevel] = React.useState<BotLevel>("medium");
  const [avatarSeed, setAvatarSeed] = React.useState("");

  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    saveBots(bots);
  }, [bots]);

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

  function navigateBack() {
    const nav = setTab ?? go;
    if (nav) {
      nav("profiles");
    }
  }

  // ----------------------------------------
  // Form helpers
  // ----------------------------------------

  function resetForm() {
    setEditingBotId(null);
    setName("");
    setLevel("medium");
    setAvatarSeed(`bot-${Date.now()}`);
    setError(null);
  }

  function startCreate() {
    resetForm();
  }

  function startEdit(bot: Bot) {
    setEditingBotId(bot.id);
    setName(bot.name);
    setLevel(bot.level);
    setAvatarSeed(bot.avatarSeed);
    setError(null);
  }

  function handleDelete(botId: string) {
    if (!window.confirm(t("bots.delete.confirm", "Supprimer ce BOT ?"))) return;
    setBots((prev) => prev.filter((b) => b.id !== botId));
    if (editingBotId === botId) {
      resetForm();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError(t("bots.error.name_required", "Donne un nom à ton BOT 😉"));
      return;
    }

    if (!avatarSeed.trim()) {
      setError(
        t(
          "bots.error.avatar_required",
          "Il faut un avatar (même un seed par défaut) pour ton BOT."
        )
      );
      return;
    }

    const now = new Date().toISOString();

    if (editingBotId) {
      setBots((prev) =>
        prev.map((bot) =>
          bot.id === editingBotId
            ? {
                ...bot,
                name: name.trim(),
                level,
                avatarSeed: avatarSeed.trim(),
                updatedAt: now,
              }
            : bot
        )
      );
    } else {
      const newBot: Bot = {
        id: nanoid(),
        name: name.trim(),
        level,
        avatarSeed: avatarSeed.trim(),
        createdAt: now,
        updatedAt: now,
      };
      setBots((prev) => [newBot, ...prev]);
    }

    resetForm();
  }

  // ----------------------------------------
  // Intégration AvatarCreator
  // ----------------------------------------
  function openAvatarCreator() {
    const nav = setTab ?? go;
    if (!nav) return;
    // Tu pourras gérer ce paramètre dans AvatarCreator.tsx
    // pour qu’il renvoie un avatarSeed et que tu le réinjectes ensuite.
    nav("avatar_creator", {
      mode: "bot",
      currentSeed: avatarSeed || `bot-${Date.now()}`,
      // éventuellement : on pourrait passer un callbackId ou botId
    });
  }

  // ----------------------------------------
  // Rendu
  // ----------------------------------------

  return (
    <div
      style={{
        background: theme.bg,
        color: theme.text,
        minHeight: "100vh",
      }}
      className="px-4 py-4 sm:px-6 sm:py-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <button
          type="button"
          onClick={navigateBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.12)] text-sm"
          style={{
            background: "transparent",
            color: theme.textSoft,
          }}
        >
          ← {t("bots.back", "Retour aux profils")}
        </button>

        <div className="text-right">
          <div
            className="text-xs uppercase tracking-widest"
            style={{ color: theme.textSoft }}
          >
            {t("bots.badge", "Joueurs virtuels")}
          </div>
          <h1
            className="text-xl sm:text-2xl font-semibold"
            style={{
              color: theme.primary,
              textShadow: `0 0 8px ${theme.primary}`,
            }}
          >
            {t("bots.title", "BOTS (CPU)")}
          </h1>
        </div>
      </div>

      <p
        className="text-sm mb-6"
        style={{ color: theme.textSoft, maxWidth: 520 }}
      >
        {t(
          "bots.subtitle",
          "Crée tes propres joueurs imaginaires gérés par l’ordinateur, avec avatar et niveau de performance, puis sélectionne-les dans les jeux."
        )}
      </p>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
        {/* Colonne gauche : liste des BOTS */}
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: theme.card,
            boxShadow: `0 0 30px rgba(0,0,0,0.65)`,
            border: `1px solid ${theme.borderSoft}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {t("bots.list.title", "Tes BOTS")}
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: theme.textSoft,
              }}
            >
              {bots.length}{" "}
              {bots.length <= 1
                ? t("bots.list.count_single", "BOT")
                : t("bots.list.count_multi", "BOTS")}
            </span>
          </div>

          {bots.length === 0 ? (
            <div
              className="text-sm rounded-xl px-3 py-3"
              style={{ background: "rgba(0,0,0,0.3)", color: theme.textSoft }}
            >
              {t(
                "bots.list.empty",
                "Aucun BOT pour le moment. Commence par en créer un dans le panneau de droite."
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bots.map((bot) => {
                const fakeProfile = botToProfile(bot);
                return (
                  <div
                    key={bot.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{
                      background:
                        editingBotId === bot.id
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.25)",
                      border: `1px solid ${
                        editingBotId === bot.id
                          ? theme.primary
                          : theme.borderSoft
                      }`,
                      boxShadow:
                        editingBotId === bot.id
                          ? `0 0 12px ${theme.primary}`
                          : "none",
                    }}
                  >
                    <div className="shrink-0">
                      <ProfileAvatar
                        profile={fakeProfile}
                        size={52}
                        ring="outside"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">
                          <div className="text-sm font-semibold truncate">
                            {bot.name}
                          </div>
                          <div
                            className="text-[11px] mt-0.5"
                            style={{ color: theme.textSoft }}
                          >
                            {levelLabel(level, t)} ·{" "}
                            {t("bots.tag.cpu", "Joueur virtuel")}
                          </div>
                        </div>

                        <span
                          className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(0,0,0,0.6)",
                            border: `1px solid ${theme.borderSoft}`,
                            color: theme.textSoft,
                          }}
                        >
                          {bot.level.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => startEdit(bot)}
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: theme.text,
                          border: `1px solid ${theme.borderSoft}`,
                        }}
                      >
                        {t("bots.actions.edit", "Éditer")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(bot.id)}
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          background: "transparent",
                          color: theme.danger,
                          border: `1px solid rgba(255,0,0,0.35)`,
                        }}
                      >
                        {t("bots.actions.delete", "Supprimer")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 text-[11px]" style={{ color: theme.textSoft }}>
            {t(
              "bots.list.help",
              "Astuce : ces BOTS pourront ensuite apparaître dans les sélecteurs de joueurs X01, Cricket, Training, etc."
            )}
          </div>
        </div>

        {/* Colonne droite : formulaire création / édition */}
        <div
          className="rounded-2xl p-4 sm:p-5"
          style={{
            background: "radial-gradient(circle at top, #15172A 0, #050712 55%)",
            boxShadow: `0 0 30px rgba(0,0,0,0.75)`,
            border: `1px solid ${theme.borderSoft}`,
          }}
        >
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide">
              {editingBotId
                ? t("bots.form.title_edit", "Modifier un BOT")
                : t("bots.form.title_create", "Créer un nouveau BOT")}
            </h2>
            {editingBotId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: theme.borderSoft,
                  color: theme.textSoft,
                  background: "transparent",
                }}
              >
                {t("bots.form.cancel_edit", "Annuler l’édition")}
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Nom */}
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide opacity-80">
                {t("bots.form.name.label", "Nom du BOT")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  "bots.form.name.placeholder",
                  "Ex : The Grinder, RoboPhil, CPU_180…"
                )}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  border: `1px solid ${theme.borderSoft}`,
                  color: theme.text,
                }}
              />
            </div>

            {/* Niveau */}
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide opacity-80">
                {t("bots.form.level.label", "Niveau de performance")}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as BotLevel)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  border: `1px solid ${theme.borderSoft}`,
                  color: theme.text,
                }}
              >
                <option value="easy">
                  {levelLabel("easy", t)} — {t("bots.level.easy.short", "Cool")}
                </option>
                <option value="medium">
                  {levelLabel("medium", t)} —{" "}
                  {t("bots.level.medium.short", "Standard")}
                </option>
                <option value="strong">
                  {levelLabel("strong", t)} —{" "}
                  {t("bots.level.strong.short", "Fort")}
                </option>
                <option value="pro">
                  {levelLabel("pro", t)} — {t("bots.level.pro.short", "Pro")}
                </option>
                <option value="legend">
                  {levelLabel("legend", t)} —{" "}
                  {t("bots.level.legend.short", "Légende")}
                </option>
              </select>
              <p
                className="text-[11px]"
                style={{ color: theme.textSoft, minHeight: 16 }}
              >
                {levelHint(level, t)}
              </p>
            </div>

            {/* Avatar / Seed */}
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide opacity-80">
                {t("bots.form.avatar.label", "Avatar / Médaillon")}
              </label>

              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {/* Aperçu avatar basé sur le seed */}
                  <ProfileAvatar
                    profile={botToProfile({
                      id: editingBotId ?? "preview",
                      name: name || t("bots.preview.name", "BOT Prévisualisation"),
                      level,
                      avatarSeed: avatarSeed || "bot-preview",
                      createdAt: "",
                      updatedAt: "",
                    })}
                    size={60}
                    ring="outside"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={avatarSeed}
                    onChange={(e) => setAvatarSeed(e.target.value)}
                    placeholder={t(
                      "bots.form.avatar.placeholder",
                      "Seed / preset d’avatar (géré par le créateur d’avatar)"
                    )}
                    className="w-full rounded-xl px-3 py-1.5 text-xs outline-none"
                    style={{
                      background: "rgba(0,0,0,0.55)",
                      border: `1px solid ${theme.borderSoft}`,
                      color: theme.text,
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openAvatarCreator}
                      className="text-[11px] px-2.5 py-1 rounded-full"
                      style={{
                        background: theme.primary,
                        color: "#050712",
                        boxShadow: `0 0 12px ${theme.primary}`,
                        border: "none",
                      }}
                    >
                      {t("bots.form.avatar.edit", "Ouvrir le créateur d’avatar")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAvatarSeed(`bot-${Math.floor(Math.random() * 999999)}`)
                      }
                      className="text-[11px] px-2.5 py-1 rounded-full border"
                      style={{
                        borderColor: theme.borderSoft,
                        color: theme.textSoft,
                        background: "transparent",
                      }}
                    >
                      {t("bots.form.avatar.random", "Seed aléatoire")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div
                className="text-xs rounded-lg px-3 py-2"
                style={{
                  background: "rgba(255,0,0,0.12)",
                  border: "1px solid rgba(255,0,0,0.4)",
                  color: theme.danger,
                }}
              >
                {error}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="submit"
                className="flex-1 rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: theme.primary,
                  color: "#050712",
                  boxShadow: `0 0 16px ${theme.primary}`,
                  border: "none",
                }}
              >
                {editingBotId
                  ? t("bots.form.submit_edit", "Mettre à jour le BOT")
                  : t("bots.form.submit_create", "Créer ce BOT")}
              </button>

              {!editingBotId && (
                <button
                  type="button"
                  onClick={startCreate}
                  className="px-3 py-2 rounded-full text-xs"
                  style={{
                    background: "transparent",
                    border: `1px dashed ${theme.borderSoft}`,
                    color: theme.textSoft,
                  }}
                >
                  {t("bots.form.reset", "Réinitialiser le formulaire")}
                </button>
              )}
            </div>

            <p
              className="text-[11px] mt-2"
              style={{ color: theme.textSoft, lineHeight: 1.4 }}
            >
              {t(
                "bots.form.help",
                "Chaque BOT sera stocké en local et pourra être proposé dans les menus de sélection de joueurs X01, Cricket, Training, etc. Tu pourras plus tard lier le niveau à un moteur de stats/définition de moyenne."
              )}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
