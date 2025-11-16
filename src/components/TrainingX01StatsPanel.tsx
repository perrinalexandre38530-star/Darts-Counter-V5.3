// ============================================
// src/components/TrainingX01StatsPanel.tsx
// Panneau Stats › Training X01
// Lit les résumés depuis localStorage
// ============================================

import React from "react";
import type { TrainingFinishStats } from "../pages/TrainingX01Play";

const TRAINING_X01_STATS_KEY = "dc_training_x01_stats_v1";

function loadTrainingStats(): TrainingFinishStats[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_X01_STATS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrainingFinishStats[];
  } catch {
    return [];
  }
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrainingX01StatsPanel() {
  const [sessions, setSessions] = React.useState<TrainingFinishStats[]>([]);

  React.useEffect(() => {
    setSessions(loadTrainingStats());
  }, []);

  const totalSessions = sessions.length;

  const bestAvg =
    totalSessions > 0
      ? Math.max(...sessions.map((s) => s.avg3D))
      : 0;

  const bestVisit =
    totalSessions > 0
      ? Math.max(...sessions.map((s) => s.bestVisit))
      : 0;

  const bestCheckout =
    totalSessions > 0
      ? Math.max(...sessions.map((s) => s.checkout))
      : 0;

  const avgDarts =
    totalSessions > 0
      ? (
          sessions.reduce((sum, s) => sum + (s.darts || 0), 0) /
          totalSessions
        ).toFixed(1)
      : "0.0";

  if (!totalSessions) {
    return (
      <div
        style={{
          padding: 12,
          borderRadius: 16,
          marginTop: 16,
          background:
            "linear-gradient(180deg,rgba(10,10,15,0.96),rgba(5,5,9,0.96))",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(230,230,245,0.9)",
          fontSize: 13,
        }}
      >
        Aucune session de training X01 enregistrée pour l&apos;instant.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 8,
        marginTop: 8,
      }}
    >
      {/* Résumé global */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            borderRadius: 14,
            padding: 8,
            background:
              "linear-gradient(180deg,#1b1b22,#090910)",
            border: "1px solid rgba(255,220,140,0.35)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(230,230,245,0.8)",
              marginBottom: 2,
            }}
          >
            Sessions
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#ffcf61",
            }}
          >
            {totalSessions}
          </div>
        </div>

        <div
          style={{
            borderRadius: 14,
            padding: 8,
            background:
              "linear-gradient(180deg,#1b1b22,#090910)",
            border: "1px solid rgba(255,220,140,0.35)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(230,230,245,0.8)",
              marginBottom: 2,
            }}
          >
            Moy. darts / session
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#ffcf61",
            }}
          >
            {avgDarts}
          </div>
        </div>

        <div
          style={{
            borderRadius: 14,
            padding: 8,
            background:
              "linear-gradient(180deg,#1b1b22,#090910)",
            border: "1px solid rgba(140,220,255,0.35)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(230,230,245,0.8)",
              marginBottom: 2,
            }}
          >
            Meilleure Moy.3D
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#a3e4ff",
            }}
          >
            {bestAvg.toFixed(1)}
          </div>
        </div>

        <div
          style={{
            borderRadius: 14,
            padding: 8,
            background:
              "linear-gradient(180deg,#1b1b22,#090910)",
            border: "1px solid rgba(180,255,180,0.35)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(230,230,245,0.8)",
              marginBottom: 2,
            }}
          >
            Best visit / checkout
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#c9ffc9",
            }}
          >
            BV {bestVisit} — CO {bestCheckout}
          </div>
        </div>
      </div>

      {/* Liste des sessions */}
      <div
        style={{
          borderRadius: 16,
          background:
            "linear-gradient(180deg,#121218,#050508)",
          border: "1px solid rgba(255,255,255,0.1)",
          maxHeight: 380,
          overflowY: "auto",
        }}
      >
        {sessions
          .slice()
          .sort((a, b) => b.date - a.date)
          .map((s, idx) => (
            <div
              key={s.date + "-" + idx}
              style={{
                padding: 10,
                borderBottom:
                  "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#ffffff",
                    marginBottom: 2,
                  }}
                >
                  {formatDate(s.date)}
                </div>
                <div
                  style={{
                    color: "rgba(230,230,245,0.85)",
                  }}
                >
                  Darts: {s.darts} • Moy.3D:{" "}
                  {s.avg3D.toFixed(1)} • BV: {s.bestVisit} • CO:{" "}
                  {s.checkout}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
