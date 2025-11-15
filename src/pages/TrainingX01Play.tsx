// ============================================
// src/pages/TrainingX01Play.tsx
// X01 solo — Training (501, double-out)
// Réutilise le Keypad X01, sans liste de joueurs
// et enregistre chaque fléchette dans TrainingStore.
// ============================================

import React from "react";
import Keypad from "../components/Keypad";
import type { Dart as UIDart, Profile } from "../lib/types";
import { useCurrentProfile } from "../hooks/useCurrentProfile";
import { TrainingStore } from "../lib/TrainingStore";
import { playSound } from "../lib/sound";

const NAV_HEIGHT = 64;
const CONTENT_MAX = 520;
const START_SCORE: 301 | 501 | 701 | 901 | 1001 = 501;

// ------- helpers simples --------
function dartValue(d: UIDart) {
  if (!d) return 0;
  if (d.v === 25 && d.mult === 2) return 50;
  if (d.v === 25) return 25;
  if (d.v === 0) return 0;
  return d.v * d.mult;
}

function throwTotal(throwDarts: UIDart[]) {
  return (throwDarts || []).reduce((acc, d) => acc + dartValue(d), 0);
}

type Props = {
  // fonction go fournie par App.tsx (setTab interne)
  go?: (tab: any, params?: any) => void;
};

export default function TrainingX01Play({ go }: Props) {
  // Le hook renvoie le profil courant ou null
  const currentProfile = useCurrentProfile() as Profile | null;

  // --- état de la session Training ---
  const [remaining, setRemaining] = React.useState<number>(START_SCORE);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const [totalDarts, setTotalDarts] = React.useState(0);
  const [totalHits, setTotalHits] = React.useState(0); // flèches non MISS
  const [bestVisit, setBestVisit] = React.useState(0);

  const sessionIdRef = React.useRef<string | null>(null);

  // --- démarrer la session Training une fois ---
  React.useEffect(() => {
    const s = TrainingStore.startSession(
      "x01_solo" as any, // TrainingMode côté types
      currentProfile?.id ?? null,
      "501"
    );
    sessionIdRef.current = s.id;
    setRemaining(START_SCORE);

    return () => {
      if (sessionIdRef.current) {
        TrainingStore.finishSession(sessionIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id]);

  // --- gestion des boutons du Keypad ---
  function handleNumber(n: number) {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: n, mult: multiplier };
    const next = [...currentThrow, d];
    playSound("dart-hit");
    navigator.vibrate?.(20);
    setCurrentThrow(next);
    setMultiplier(1);
  }

  function handleBull() {
    if (currentThrow.length >= 3) return;
    const d: UIDart = { v: 25, mult: multiplier === 2 ? 2 : 1 };
    const next = [...currentThrow, d];
    playSound("dart-hit");
    navigator.vibrate?.(20);
    setCurrentThrow(next);
    setMultiplier(1);
  }

  function handleBackspace() {
    playSound("dart-hit");
    setCurrentThrow((t) => t.slice(0, -1));
  }

  function handleCancel() {
    // si volée en cours -> on efface la volée
    if (currentThrow.length) {
      playSound("bust");
      setCurrentThrow([]);
      setMultiplier(1);
      return;
    }
    // sinon : rien (on pourrait, plus tard, annuler la dernière volée de la session)
  }

  function handleValidate() {
    if (!currentThrow.length || sessionIdRef.current == null) return;

    const volleyPts = throwTotal(currentThrow);
    const after = remaining - volleyPts;

    let willBust = after < 0;
    const doubleOut = true; // Training X01 = double-out

    if (!willBust && doubleOut && after === 0) {
      const last = currentThrow[currentThrow.length - 1];
      const isDouble = last.v === 25 ? last.mult === 2 : last.mult === 2;
      willBust = !isDouble;
    }

    const ptsForStats = willBust ? 0 : volleyPts;
    const nextRemaining = willBust ? remaining : Math.max(after, 0);

    // --- enregistrement dans TrainingStore : une entrée par fléchette ---
    const hitsPayload = currentThrow.map((d) => ({
      profileId: currentProfile?.id ?? null,
      value: dartValue(d),
      mult: d.mult,
      isHit: d.v !== 0 && !willBust, // MISS = faux, sinon vrai si pas bust
      remainingBefore: remaining,
      remainingAfter: nextRemaining,
      mode: "x01_solo" as any,
    }));

    try {
      TrainingStore.addHits(sessionIdRef.current, hitsPayload as any);
    } catch (e) {
      console.warn("[TrainingX01Play] addHits failed", e);
    }

    // --- stats locales ---
    setTotalDarts((n) => n + currentThrow.length);
    setTotalHits((n) => n + hitsPayload.filter((h) => h.isHit).length);

    if (!willBust) {
      setBestVisit((b) => Math.max(b, ptsForStats));
      setRemaining(nextRemaining);
      if (nextRemaining === 0) {
        playSound("doubleout");
      }
    } else {
      playSound("bust");
      navigator.vibrate?.([120, 60, 140]);
    }

    // reset volée
    setCurrentThrow([]);
    setMultiplier(1);
  }

  const hitRate =
    totalDarts > 0 ? ((totalHits / totalDarts) * 100).toFixed(1) : "0.0";

  function handleExit() {
    if (sessionIdRef.current) {
      TrainingStore.finishSession(sessionIdRef.current);
    }
    go?.("training");
  }

  // hauteur max pour caler le keypad
  return (
    <div
      className="training-x01-container"
      style={{
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      {/* HEADER FIXE */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: 0,
          zIndex: 60,
          width: `min(100%, ${CONTENT_MAX}px)`,
          paddingInline: 10,
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        {/* Barre haute : retour + titre court */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={handleExit}
            style={{
              borderRadius: 10,
              padding: "5px 11px",
              border: "1px solid rgba(255,180,0,.3)",
              background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
              color: "#1a1a1a",
              fontWeight: 900,
              boxShadow: "0 8px 18px rgba(255,170,0,.25)",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            ← Training
          </button>

          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: "#ffffff",
            }}
          >
            X01 solo — Training
          </div>

          <div style={{ width: 70 }} /> {/* espace symétrique */}
        </div>

        {/* Carte info / stats */}
        <div
          style={{
            background:
              "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 18,
            padding: 10,
            boxShadow: "0 8px 26px rgba(0,0,0,.35)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#d9dbe3",
              marginBottom: 6,
            }}
          >
            Chaque fléchette est mémorisée pour suivre votre progression.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            {/* Score restant */}
            <div
              style={{
                fontSize: 46,
                fontWeight: 900,
                color: "#ffcf57",
                textShadow: "0 4px 18px rgba(255,195,26,.25)",
                lineHeight: 1.05,
              }}
            >
              {remaining -
                currentThrow.reduce((s, d) => s + dartValue(d), 0) <
              0
                ? 0
                : remaining -
                  currentThrow.reduce((s, d) => s + dartValue(d), 0)}
            </div>

            {/* Petit bloc stats */}
            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                fontSize: 11.5,
                color: "#e4e6ef",
              }}
            >
              <div>
                <div style={{ opacity: 0.75 }}>Fléchettes jouées</div>
                <div style={{ fontWeight: 800 }}>{totalDarts}</div>
              </div>
              <div>
                <div style={{ opacity: 0.75 }}>% de hits</div>
                <div style={{ fontWeight: 800 }}>{hitRate}%</div>
              </div>
              <div>
                <div style={{ opacity: 0.75 }}>Meilleure volée</div>
                <div style={{ fontWeight: 800 }}>{bestVisit}</div>
              </div>
              <div>
                <div style={{ opacity: 0.75 }}>Score de la volée</div>
                <div style={{ fontWeight: 800 }}>
                  {throwTotal(currentThrow)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KEYPAD FIXE EN BAS */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: NAV_HEIGHT,
          width: `min(100%, ${CONTENT_MAX}px)`,
          padding: "0 10px 4px",
          zIndex: 45,
        }}
      >
        <Keypad
          currentThrow={currentThrow}
          multiplier={multiplier}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={handleBackspace}
          onCancel={handleCancel}
          onNumber={handleNumber}
          onBull={handleBull}
          onValidate={handleValidate}
          hidePreview={false}
        />
      </div>
    </div>
  );
}
