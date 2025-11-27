// ============================================================
// src/pages/SyncCenter.tsx
// Centre de Synchronisation & Partage (offline friendly)
// - Export Profil local → QR / JSON
// - Import Profil local → QR / JSON
// - Export sessions Training X01
// - Export historique complet X01 / Cricket
// - Backup complet du téléphone (.dcbackup)
// - Import backup
// ============================================================

import React from "react";
import QRCode from "qrcode.react";

import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { loadStore, saveStore } from "../lib/storage";
import { History } from "../lib/history";

// GoldPill     (déjà dans ton app)
import { GoldPill } from "../components/StatsPlayerDashboard";

// Pour les avatars
import ProfileAvatar from "../components/ProfileAvatar";

type Props = {
  store?: any;
  go?: (tab: string, params?: any) => void;
};

export default function SyncCenter({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [rawStore, setRawStore] = React.useState<any>(store ?? null);
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);
  const [training, setTraining] = React.useState<any[]>([]);

  const [exportData, setExportData] = React.useState<string | null>(null);
  const [importText, setImportText] = React.useState("");
  const [importResult, setImportResult] = React.useState<string | null>(null);

  // ---------- LOAD ACTUAL STORE ----------
  React.useEffect(() => {
    (async () => {
      const s = await loadStore<any>();
      setRawStore(s);
      setProfiles(s?.profiles || []);
      setTraining(s?.trainingX01Stats || []);
      const hist = await History.list();
      setHistory(hist || []);
    })();
  }, []);

  const card = {
    borderRadius: 20,
    padding: 16,
    background: "linear-gradient(180deg,#18181A,#0F0F12)",
    border: "1px solid rgba(255,255,255,.14)",
    boxShadow: "0 12px 24px rgba(0,0,0,.55)",
    marginBottom: 14,
  } as React.CSSProperties;

  const title = {
    fontSize: 16,
    fontWeight: 800,
    textTransform: "uppercase",
    color: theme.gold,
    textShadow: `0 0 8px ${theme.gold}AA,0 0 16px ${theme.gold}55`,
    letterSpacing: 0.7,
    marginBottom: 8,
  };

  // ============================================================
  // HELPERS EXPORT
  // ============================================================

  function exportProfile(profileId: string) {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const data = JSON.stringify({
      type: "dc_profile",
      version: 1,
      profile,
    });
    setExportData(data);
  }

  function exportTrainingSessions() {
    const data = JSON.stringify({
      type: "dc_training_x01",
      version: 1,
      sessions: training,
    });
    setExportData(data);
  }

  function exportHistory() {
    const data = JSON.stringify({
      type: "dc_history",
      version: 1,
      history,
    });
    setExportData(data);
  }

  function exportFullBackup() {
    const data = JSON.stringify({
      type: "dc_backup",
      version: 1,
      store: rawStore,
      history,
    });

    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DartsCounter_Backup.dcbackup";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // HELPERS IMPORT
  // ============================================================

  async function applyImport() {
    try {
      const parsed = JSON.parse(importText);

      if (parsed.type === "dc_profile") {
        const p = parsed.profile;
        const updated = [...profiles.filter((x) => x.id !== p.id), p];
        await saveStore({ ...rawStore, profiles: updated });
        setProfiles(updated);
        setImportResult(`Profil "${p.name}" importé avec succès.`);
        return;
      }

      if (parsed.type === "dc_training_x01") {
        await saveStore({ ...rawStore, trainingX01Stats: parsed.sessions });
        setTraining(parsed.sessions);
        setImportResult("Sessions Training X01 importées.");
        return;
      }

      if (parsed.type === "dc_history") {
        for (const r of parsed.history) {
          await History.save(r);
        }
        setHistory(await History.list());
        setImportResult("Historique importé.");
        return;
      }

      if (parsed.type === "dc_backup") {
        await saveStore(parsed.store);
        for (const r of parsed.history) {
          await History.save(r);
        }
        setImportResult("Backup complet restauré !");
        return;
      }

      setImportResult("Type de fichier inconnu.");
    } catch (e) {
      setImportResult("Erreur : JSON invalide.");
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={{ padding: 14 }}>
      {/* HEADER */}
      <div style={card}>
        <div style={{ ...title, fontSize: 22, textAlign: "center" }}>
          Sync & Partage
        </div>
      </div>

      {/* ============================
          EXPORT PROFIL LOCAL
          ============================ */}
      <div style={card}>
        <div style={title}>Exporter un profil local</div>

        {profiles.length === 0 && (
          <div style={{ color: theme.text70 }}>Aucun profil local.</div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => exportProfile(p.id)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  padding: 8,
                  background: "rgba(0,0,0,.55)",
                  border: `1px solid ${theme.gold}55`,
                  boxShadow: `0 0 12px ${theme.gold}33`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <ProfileAvatar
                  size={46}
                  dataUrl={p.avatarDataUrl}
                  label={p.name?.[0] || "?"}
                />
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color: theme.text,
                    fontWeight: 700,
                  }}
                >
                  {p.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ============================
          EXPORT TRAINING X01
          ============================ */}
      <div style={card}>
        <div style={title}>Exporter Training X01</div>

        <GoldPill onClick={exportTrainingSessions}>
          Exporter sessions Training
        </GoldPill>
      </div>

      {/* ============================
          EXPORT HISTORIQUE
          ============================ */}
      <div style={card}>
        <div style={title}>Exporter Historique (X01 / Cricket)</div>

        <GoldPill onClick={exportHistory}>Exporter historique</GoldPill>
      </div>

      {/* ============================
          BACKUP COMPLET
          ============================ */}
      <div style={card}>
        <div style={title}>Backup complet</div>

        <GoldPill onClick={exportFullBackup}>Créer un fichier .dcbackup</GoldPill>
      </div>

      {/* ============================
          IMPORT (JSON / QR TEXTE)
          ============================ */}
      <div style={card}>
        <div style={title}>Importer</div>

        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Coller ici un JSON exporté..."
          style={{
            width: "100%",
            minHeight: 140,
            background: "#000",
            color: "#fff",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.2)",
            padding: 8,
          }}
        />

        <GoldPill onClick={applyImport} style={{ marginTop: 10 }}>
          Importer
        </GoldPill>

        {importResult && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: theme.gold,
              fontWeight: 700,
            }}
          >
            {importResult}
          </div>
        )}
      </div>

      {/* ============================
          QR EXPORT
          ============================ */}
      {exportData && (
        <div style={card}>
          <div style={title}>QR Code export</div>

          <QRCode
            value={exportData}
            size={200}
            fgColor="#FFF"
            bgColor="#000"
            level="L"
            includeMargin={true}
          />

          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: theme.text70,
              textAlign: "center",
            }}
          >
            Scanne avec un autre téléphone pour importer
          </div>
        </div>
      )}
    </div>
  );
}
