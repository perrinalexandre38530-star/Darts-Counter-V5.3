// ============================================
// src/pages/TrainingX01Play.tsx
// X01 solo Training — chaque dart est enregistrée
// ============================================

import React from "react";
import { useX01Engine } from "../hooks/useX01Engine";
import Keypad from "../components/Keypad";
import { TrainingStore } from "../lib/trainingStore";
import { playSound } from "../lib/sound";
import { useCurrentProfile } from "../hooks/useCurrentProfile";

import type {
  Dart as UIDart,
  Visit as VisitType,
  PlayerLite,
} from "../lib/types";

export default function TrainingX01Play() {
  const profile = useCurrentProfile();

  // Joueur solo fictif
  const soloPlayer: PlayerLite = React.useMemo(
    () =>
      ({
        id: "training_solo",
        name: profile?.name || "Training",
      } as any),
    [profile?.name]
  );

  // ID de la session de training courante
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  // Démarre une session de training au premier render
  React.useEffect(() => {
    if (sessionId) return;
    const session = TrainingStore.startSession(
      "x01_solo",
      profile ? profile.id : null
    );
    setSessionId(session.id);
  }, [sessionId, profile]);

  // 🔧 FinishPolicy ultra simple pour le mode Training
  // -> toujours "valide", jamais de check-out forcé
  const finishPolicy = React.useCallback(() => {
    return {
      isValid: true,
      isCheckout: false,
    };
  }, []);

  const {
    state,
    scoresByPlayer = {},
    playTurn,
    canUndo,
    undoLast,
  } = useX01Engine({
    players: [soloPlayer],
    startScore: 501,
    finishPolicy: finishPolicy as any, // le moteur veut une fonction
    // tu peux rajouter inMode / outMode ici si ton hook les utilise
  });

  // Validation d'une volée
  function handleValidate(visit: VisitType) {
    // On capture l'index de volée AVANT d'appeler playTurn
    const visitIndex = (state as any)?.turnIndex ?? 0;

    // 1) on laisse le moteur jouer la visite
    playTurn(visit);

    // 2) on envoie les darts au TrainingStore
    if (!sessionId) return;

    const darts = (visit.darts || []) as UIDart[];

    TrainingStore.addHits(
      sessionId,
      darts.map((d, idx) => {
        const scoreVal = (d as any).value ?? 0; // adapte si ton type Dart est différent
        // V1 : on considère "hit" = score > 0
        const isHit = scoreVal > 0;

        return {
          profileId: profile ? profile.id : null,
          mode: "x01_solo",
          dart: d,
          scoreValue: scoreVal,
          isHit,
          visitIndex,
          dartIndex: idx,
          target: undefined, // pour plus tard (T20 / Bull etc.)
        };
      })
    );

    playSound("throw");
  }

  function handleEndTraining() {
    if (sessionId) {
      TrainingStore.finishSession(sessionId);
    }
    // Pas de router = tu sors avec le BottomNav (Jeux / Stats)
    alert("Session de training terminée. Tu peux aller voir tes stats.");
  }

  const remaining = (scoresByPlayer as any)[soloPlayer.id] ?? 501;

  return (
    <div className="page training-x01-page" style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 4 }}>Training X01 (solo)</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 12 }}>
        Chaque fléchette est mémorisée pour suivre ta progression.
      </p>

      <div
        style={{
          marginBottom: 16,
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.08)",
          background:
            "linear-gradient(180deg,rgba(25,25,28,.7),rgba(15,15,18,.9))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 16,
        }}
      >
        <span>Score restant</span>
        <strong style={{ fontSize: 20 }}>{remaining}</strong>
      </div>

      <div style={{ marginTop: "auto" }}>
        <Keypad
          onValidate={handleValidate}
          onUndo={canUndo ? undoLast : undefined}
        />
      </div>

      <button
        onClick={handleEndTraining}
        style={{
          marginTop: 16,
          width: "100%",
          padding: "10px 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.12)",
          background: "transparent",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Terminer la session
      </button>

      <p
        style={{
          marginTop: 6,
          fontSize: 11,
          opacity: 0.6,
          textAlign: "center",
        }}
      >
        Pour quitter, utilise la barre en bas (Jeux / Stats / Accueil).
      </p>
    </div>
  );
}
