// ============================================
// src/pages/Games.tsx — Sélecteur de modes de jeu
// - Style cartes néon, cohérent avec TrainingMenu
// - Modes grisés : non cliquables
// - Pastille "i" à droite => panneau d'aide
// - Textes pilotés par LangContext (t())
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Tab =
  | "games"
  | "training"        // 👈 corrigé : correspond à App.tsx
  | "training_x01"
  | "x01setup"
  | "cricket"
  | "killer"
  | "shanghai"
  | "battle";

type Props = {
  go?: (tab: Tab, params?: any) => void;
  setTab?: (tab: Tab) => void; // compat anciennes versions
};

type GameId =
  | "training"
  | "x01"
  | "cricket"
  | "killer"
  | "shanghai"
  | "battle";

type GameDef = {
  id: GameId;
  titleKey: string;
  titleDefault: string;
  subtitleKey: string;
  subtitleDefault: string;
  infoKey: string;
  infoDefault: string;
  tab: Tab | null; // null = mode à venir
  enabled: boolean;
};

const GAMES: GameDef[] = [
  {
    id: "training",
    titleKey: "games.training.title",
    titleDefault: "TRAINING",
    subtitleKey: "games.training.subtitle",
    subtitleDefault: "Améliore ta progression.",
    infoKey: "games.training.info",
    infoDefault:
      "Accède à tous les modes d’entraînement : X01 solo, tour de l’horloge et d’autres outils pour progresser.",
    tab: "training",   // 👈 corrigé
    enabled: true,
  },
  {
    id: "x01",
    titleKey: "games.x01.title",
    titleDefault: "X01",
    subtitleKey: "games.x01.subtitle",
    subtitleDefault: "301 / 501 / 701 / 901.",
    infoKey: "games.x01.info",
    infoDefault:
      "Joue les classiques 301, 501, 701, 901 avec gestion des sets / legs, double-out et stats complètes.",
    tab: "x01setup",
    enabled: true,
  },
  {
    id: "cricket",
    titleKey: "games.cricket.title",
    titleDefault: "CRICKET",
    subtitleKey: "games.cricket.subtitle",
    subtitleDefault: "Ferme les zones 15…20 + Bull.",
    infoKey: "games.cricket.info",
    infoDefault:
      "Mode Cricket classique : tu dois fermer les cases 15 à 20 + Bull tout en marquant plus de points que l’adversaire.",
    tab: "cricket",
    enabled: true,
  },
  {
    id: "killer",
    titleKey: "games.killer.title",
    titleDefault: "KILLER",
    subtitleKey: "games.killer.subtitle",
    subtitleDefault: "Double ton numéro… deviens Killer.",
    infoKey: "games.killer.info",
    infoDefault:
      "Chaque joueur reçoit un numéro. Deviens Killer en le doublant, puis élimine les autres en touchant leur numéro.",
    tab: null,
    enabled: false,
  },
  {
    id: "shanghai",
    titleKey: "games.shanghai.title",
    titleDefault: "SHANGHAI",
    subtitleKey: "games.shanghai.subtitle",
    subtitleDefault: "Cible du tour, S+D+T = Shanghai à win.",
    infoKey: "games.shanghai.info",
    infoDefault:
      "À chaque manche, une nouvelle valeur de cible. Le combo simple + double + triple sur la même valeur = Shanghai.",
    tab: null,
    enabled: false,
  },
  {
    id: "battle",
    titleKey: "games.battle.title",
    titleDefault: "BATTLE ROYALE",
    subtitleKey: "games.battle.subtitle",
    subtitleDefault: "Mode fun à plusieurs — éliminations.",
    infoKey: "games.battle.info",
    infoDefault:
      "Mode multijoueurs fun avec éliminations progressives et règles spéciales. Arrive dans une prochaine version.",
    tab: null,
    enabled: false,
  },
];

export default function Games(props: Props) {
  const { go, setTab } = props;
  const { theme } = useTheme();
  const { t } = useLang();
  const [infoGame, setInfoGame] = React.useState<GameDef | null>(null);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function navigate(tab: Tab | null) {
    if (!tab) return;
    if (go) go(tab);
    else if (setTab) setTab(tab);
  }

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* Titre */}
      <h1
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: 24,
          color: theme.primary,
          textAlign: "center",
          textShadow: `0 0 12px ${theme.primary}66`,
        }}
      >
        {t("games.title", "TOUS LES JEUX")}
      </h1>

      <div
        style={{
          fontSize: 13,
          color: theme.textSoft,
          marginBottom: 18,
          textAlign: "center",
        }}
      >
        {t("games.subtitle", "Sélectionne un mode de jeu")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {GAMES.map((g) => {
          const title = t(g.titleKey, g.titleDefault);
          const subtitle = t(g.subtitleKey, g.subtitleDefault);
          const disabled = !g.enabled;

          return (
            <button
              key={g.id}
              onClick={() => !disabled && navigate(g.tab)}
              style={{
                position: "relative",
                width: "100%",
                padding: 14,
                paddingRight: 46,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: CARD_BG,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.55 : 1,
                boxShadow: disabled
                  ? "none"
                  : `0 10px 24px rgba(0,0,0,0.55)`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  color: disabled ? theme.textSoft : theme.primary,
                  textTransform: "uppercase",
                  textShadow: disabled
                    ? "none"
                    : `0 0 12px ${theme.primary}55`,
                }}
              >
                {title}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: disabled ? theme.textSoft : theme.textSoft,
                  opacity: 0.9,
                }}
              >
                {subtitle}
              </div>

              {/* Pastille "i" */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoGame(g);
                }}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.9)",
                  boxShadow: `0 0 10px ${theme.primary}44`,
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                i
              </button>
            </button>
          );
        })}
      </div>

      {/* Overlay d'information */}
      {infoGame && (
        <div
          onClick={() => setInfoGame(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              margin: 16,
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                marginBottom: 8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              {t(infoGame.titleKey, infoGame.titleDefault)}
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: theme.textSoft,
                marginBottom: 12,
              }}
            >
              {t(infoGame.infoKey, infoGame.infoDefault)}
            </div>

            <button
              type="button"
              onClick={() => setInfoGame(null)}
              style={{
                display: "block",
                marginLeft: "auto",
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: theme.primary,
                color: "#000",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("games.info.close", "Fermer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
