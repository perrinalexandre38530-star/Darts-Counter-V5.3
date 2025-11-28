// ============================================
// src/pages/SyncCenter.tsx
// HUB SYNC & PARTAGE (Option C avancée)
// - Export / Import JSON (profil / tout le store)
// - Préparation Sync device-à-device (QR / lien court)
// - Préparation Sync Cloud (token / lien, via backend CF)
// - UI full thème + textes via LangContext
// ============================================
import React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { loadStore, saveStore } from "../lib/storage";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

type PanelMode = "none" | "local" | "peer" | "cloud";

export default function SyncCenter({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [mode, setMode] = React.useState<PanelMode>("local");

  // --- LOCAL EXPORT / IMPORT ---
  const [exportJson, setExportJson] = React.useState<string>("");
  const [importJson, setImportJson] = React.useState<string>("");
  const [localMessage, setLocalMessage] = React.useState<string>("");

  // --- CLOUD SYNC ---
  const [cloudToken, setCloudToken] = React.useState<string>("");
  const [cloudStatus, setCloudStatus] = React.useState<string>("");

  // --- PEER / DEVICE-À-DEVICE (préparation) ---
  const [peerPayload, setPeerPayload] = React.useState<string>("");
  const [peerStatus, setPeerStatus] = React.useState<string>("");

  // Helpers
  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return "";
    }
  };

  // =====================================================
  // 1) EXPORT LOCAL (tout le store)
  // =====================================================
  async function handleExportFullStore() {
    try {
      const current = (await loadStore()) || store;
      const payload = {
        kind: "dc_store_snapshot_v1",
        createdAt: new Date().toISOString(),
        app: "darts-counter-v5",
        store: current,
      };
      const json = safeStringify(payload);
      setExportJson(json);
      setLocalMessage(
        t(
          "syncCenter.local.exportSuccess",
          "Export complet du store généré ci-dessous."
        )
      );
    } catch (e) {
      console.error(e);
      setLocalMessage(
        t(
          "syncCenter.local.exportError",
          "Erreur pendant l'export du store local."
        )
      );
    }
  }

  // (Optionnel) export uniquement du profil actif
  async function handleExportActiveProfile() {
    const profiles = store?.profiles ?? [];
    const activeProfileId = store?.activeProfileId ?? null;
    const active =
      profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

    if (!active) {
      setLocalMessage(
        t(
          "syncCenter.local.noActiveProfile",
          "Aucun profil actif trouvé à exporter."
        )
      );
      return;
    }

    const payload = {
      kind: "dc_profile_snapshot_v1",
      createdAt: new Date().toISOString(),
      app: "darts-counter-v5",
      profile: active,
    };
    const json = safeStringify(payload);
    setExportJson(json);
    setLocalMessage(
      t(
        "syncCenter.local.exportProfileSuccess",
        "Export du profil actif généré ci-dessous."
      )
    );
  }

  // Download fichier .dcstats.json
  function handleDownloadJson() {
    if (!exportJson) return;
    try {
      const blob = new Blob([exportJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "darts-counter-sync.dcstats.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  // Import JSON collé (LOCAL)
  async function handleImportFromTextarea() {
    if (!importJson.trim()) {
      setLocalMessage(
        t(
          "syncCenter.local.importEmpty",
          "Colle d'abord un JSON d'export dans la zone prévue."
        )
      );
      return;
    }

    try {
      const parsed = JSON.parse(importJson);
      await importParsedPayload(parsed);
      setLocalMessage(
        t(
          "syncCenter.local.importStoreOk",
          "Import effectué. Relance l'app pour tout recharger proprement."
        )
      );
    } catch (e) {
      console.error(e);
      setLocalMessage(
        t(
          "syncCenter.local.importError",
          "Erreur pendant l'import. Vérifie le JSON ou réessaie."
        )
      );
    }
  }

  // Import JSON depuis un fichier (LOCAL)
  async function handleImportFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportJson(text);
      setLocalMessage(
        t(
          "syncCenter.local.fileLoaded",
          "Fichier chargé. Tu peux maintenant lancer l'import via le bouton prévu."
        )
      );
    } catch (err) {
      console.error(err);
      setLocalMessage(
        t(
          "syncCenter.local.fileError",
          "Impossible de lire ce fichier. Réessaie avec un export de l'application."
        )
      );
    } finally {
      e.target.value = "";
    }
  }

  // Import générique de payload (store complet / profil), utilisé par Local + Peer
  async function importParsedPayload(parsed: any) {
    if (parsed.kind === "dc_store_snapshot_v1" && parsed.store) {
      const nextStore: Store = parsed.store;
      await saveStore(nextStore);
      return;
    }

    if (
      (parsed.kind === "dc_profile_snapshot_v1" ||
        parsed.kind === "dc_peer_profile_v1") &&
      parsed.profile
    ) {
      const incoming = parsed.profile;
      const current = (await loadStore()) || store;
      const list = current.profiles ?? [];
      const idx = list.findIndex((p: any) => p.id === incoming.id);
      let newProfiles;
      if (idx === -1) {
        newProfiles = [...list, incoming];
      } else {
        newProfiles = [...list];
        newProfiles[idx] = incoming;
      }
      const nextStore: Store = {
        ...current,
        profiles: newProfiles,
      };
      await saveStore(nextStore);
      return;
    }

    if (parsed.kind === "dc_peer_sync_v1" && parsed.store) {
      const incomingStore: Store = parsed.store;
      // Stratégie simple : on remplace tout (comme un snapshot complet)
      await saveStore(incomingStore);
      return;
    }

    throw new Error("Unknown payload format");
  }

  // Copier le JSON (export ou payload peer) dans le presse-papiers
  async function handleCopyToClipboard(value: string) {
    if (!value) return;
    try {
      if (navigator && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(value);
        setPeerStatus(
          t(
            "syncCenter.peer.copied",
            "Contenu copié dans le presse-papiers."
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  // =====================================================
  // 2) PEER SYNC — Device à device (préparation)
  // =====================================================
  function handlePreparePeerPayload() {
    const payload = {
      kind: "dc_peer_sync_v1",
      createdAt: new Date().toISOString(),
      app: "darts-counter-v5",
      // Pour l’instant : snapshot du store complet
      // (évolution possible : ne prendre qu’un match / qu’un profil / qu’un mode)
      store,
    };
    const json = safeStringify(payload);
    setPeerPayload(json);
    setPeerStatus(
      t(
        "syncCenter.peer.ready",
        "Payload de synchronisation généré. Tu peux le partager (copier, QR, etc.)."
      )
    );
  }

  // Importer directement le payload peer généré / reçu
  async function handlePeerImportFromPayload() {
    if (!peerPayload.trim()) {
      setPeerStatus(
        t(
          "syncCenter.peer.empty",
          "Génère ou colle d'abord un payload avant d'importer."
        )
      );
      return;
    }

    try {
      const parsed = JSON.parse(peerPayload);
      await importParsedPayload(parsed);
      setPeerStatus(
        t(
          "syncCenter.peer.importOk",
          "Payload importé. Relance l'app pour tout recharger proprement."
        )
      );
    } catch (e) {
      console.error(e);
      setPeerStatus(
        t(
          "syncCenter.peer.importError",
          "Erreur pendant l'import du payload. Vérifie le contenu ou réessaie."
        )
      );
    }
  }

  // =====================================================
  // 3) CLOUD SYNC (backend CF Workers / KV)
  // =====================================================
  async function handleCloudUpload() {
    setCloudStatus(
      t("syncCenter.cloud.uploading", "Envoi du snapshot vers le cloud…")
    );
    try {
      const current = (await loadStore()) || store;
      const payload = {
        kind: "dc_cloud_snapshot_v1",
        createdAt: new Date().toISOString(),
        app: "darts-counter-v5",
        store: current,
      };

      // ⛓️ Backend à implémenter côté Cloudflare Workers
      // Endpoint suggéré : POST /api/sync/upload → { token: string }
      const res = await fetch("/api/sync/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      if (!data.token) {
        throw new Error("No token returned");
      }
      setCloudToken(data.token);
      setCloudStatus(
        t(
          "syncCenter.cloud.uploadOk",
          "Snapshot envoyé ! Utilise ce code sur un autre appareil pour récupérer tes stats."
        )
      );
    } catch (e) {
      console.error(e);
      setCloudStatus(
        t(
          "syncCenter.cloud.uploadError",
          "Erreur pendant l'envoi vers le cloud. Réessaie plus tard."
        )
      );
    }
  }

  async function handleCloudDownload() {
    if (!cloudToken.trim()) {
      setCloudStatus(
        t(
          "syncCenter.cloud.tokenMissing",
          "Rentre d'abord un code de synchronisation."
        )
      );
      return;
    }

    setCloudStatus(
      t("syncCenter.cloud.downloading", "Récupération du snapshot…")
    );
    try {
      // Endpoint suggéré : GET /api/sync/download?token=XYZ
      const res = await fetch(`/api/sync/download?token=${cloudToken.trim()}`);
      if (!res.ok) {
        throw new Error("Download failed");
      }
      const data = await res.json();
      if (!data || !data.store) {
        throw new Error("Invalid payload");
      }

      const nextStore: Store = data.store;
      await saveStore(nextStore);

      setCloudStatus(
        t(
          "syncCenter.cloud.downloadOk",
          "Synchronisation effectuée ! Relance l'app pour tout recharger proprement."
        )
      );
    } catch (e) {
      console.error(e);
      setCloudStatus(
        t(
          "syncCenter.cloud.downloadError",
          "Erreur pendant la récupération du snapshot. Vérifie le code et réessaie."
        )
      );
    }
  }

  return (
    <div
      className="sync-center-page container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 0,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        .sync-center-page {
          --title-min: 26px;
          --title-ideal: 8vw;
          --title-max: 40px;
          --card-pad: 14px;
          --menu-gap: 10px;
          --menu-title: 14px;
          --menu-sub: 12px;
          --panel-radius: 16px;
        }
        @media (max-height: 680px), (max-width: 360px) {
          .sync-center-page {
            --title-min: 24px;
            --title-ideal: 7vw;
            --title-max: 34px;
            --card-pad: 12px;
            --menu-gap: 8px;
            --menu-title: 13.5px;
            --menu-sub: 11px;
          }
        }

        /* Cartes avec halo très léger, comme StatsShell */
        .sync-center-card {
          position: relative;
        }
        .sync-center-card::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background:
            radial-gradient(circle at 15% 0%, rgba(255,255,255,.10), transparent 60%);
          opacity: 0.0;
          pointer-events: none;
          animation: syncCardGlow 3.6s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        @keyframes syncCardGlow {
          0%, 100% {
            opacity: 0.02;
          }
          50% {
            opacity: 0.12;
          }
        }

        .sync-pill-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          border: 1px solid ${theme.borderSoft};
          background: rgba(0,0,0,0.6);
          color: ${theme.textSoft};
          cursor: pointer;
          transition: all .16s ease;
        }
        .sync-pill-toggle.active {
          border-color: ${theme.primary};
          color: #000;
          background: ${theme.primary};
          box-shadow: 0 0 14px ${theme.primary}55;
        }

        .sync-textarea {
          width: 100%;
          min-height: 120px;
          border-radius: 10px;
          border: 1px solid ${theme.borderSoft};
          background: rgba(0,0,0,0.88);
          color: ${theme.text};
          font-size: 11.5px;
          padding: 8px;
          resize: vertical;
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          paddingInline: 18,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <button
            type="button"
            onClick={() => go("stats")}
            style={{
              border: "none",
              background: "transparent",
              color: theme.textSoft,
              fontSize: 14,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ←
          </button>
          <div
            style={{
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              color: theme.primary,
            }}
          >
            <span
              style={{
                fontSize:
                  "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
                textShadow: `0 0 14px ${theme.primary}66`,
              }}
            >
              {t("syncCenter.title", "SYNC & PARTAGE")}
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            color: theme.textSoft,
            maxWidth: 340,
          }}
        >
          {t(
            "syncCenter.subtitle",
            "Export, import et synchronisation entre appareils ou via le cloud, sans perdre tes stats."
          )}
        </div>
      </div>

      {/* ===== CARDS (choix du mode) ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: "var(--menu-gap)",
          paddingInline: 12,
          marginBottom: 10,
        }}
      >
        {/* LOCAL */}
        <SyncCard
          theme={theme}
          active={mode === "local"}
          onClick={() => setMode("local")}
          title={t("syncCenter.card.local.title", "Export / Import local")}
          subtitle={t(
            "syncCenter.card.local.subtitle",
            "Sauvegarde ou restaure tes stats via un fichier ou un JSON."
          )}
        />

        {/* PEER / DEVICE-À-DEVICE */}
        <SyncCard
          theme={theme}
          active={mode === "peer"}
          onClick={() => setMode("peer")}
          title={t(
            "syncCenter.card.peer.title",
            "Sync directe avec un ami (device à device)"
          )}
          subtitle={t(
            "syncCenter.card.peer.subtitle",
            "Prépare un payload à partager par QR ou message pour fusionner vos stats."
          )}
        />

        {/* CLOUD */}
        <SyncCard
          theme={theme}
          active={mode === "cloud"}
          onClick={() => setMode("cloud")}
          title={t("syncCenter.card.cloud.title", "Sync Cloud (code)")}
          subtitle={t(
            "syncCenter.card.cloud.subtitle",
            "Envoie un snapshot vers le cloud et récupère-le sur un autre appareil avec un code."
          )}
        />
      </div>

      {/* ===== PANNEAU DÉTAILLÉ ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          paddingInline: 12,
          marginBottom: 12,
        }}
      >
        {mode === "local" && (
          <LocalPanel
            theme={theme}
            t={t}
            exportJson={exportJson}
            importJson={importJson}
            message={localMessage}
            onChangeImport={setImportJson}
            onExportStore={handleExportFullStore}
            onExportActiveProfile={handleExportActiveProfile}
            onDownload={handleDownloadJson}
            onImport={handleImportFromTextarea}
            onImportFile={handleImportFromFile}
          />
        )}

        {mode === "peer" && (
          <PeerPanel
            theme={theme}
            t={t}
            payload={peerPayload}
            status={peerStatus}
            onGenerate={handlePreparePeerPayload}
            onCopy={() => handleCopyToClipboard(peerPayload)}
            onImport={handlePeerImportFromPayload}
          />
        )}

        {mode === "cloud" && (
          <CloudPanel
            theme={theme}
            t={t}
            token={cloudToken}
            status={cloudStatus}
            onTokenChange={setCloudToken}
            onUpload={handleCloudUpload}
            onDownload={handleCloudDownload}
          />
        )}
      </div>

      {/* Espace BottomNav */}
      <div style={{ height: 80 }} />
    </div>
  );
}

/* --------------------------------------------
 * CARTES DE CHOIX DE MODE
 * -------------------------------------------*/
function SyncCard({
  theme,
  active,
  title,
  subtitle,
  onClick,
}: {
  theme: any;
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <div
      className="sync-center-card"
      style={{
        position: "relative",
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${
          active ? theme.primary : theme.primary + "22"
        }`,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--card-pad)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: "var(--menu-title)",
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}55`,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "var(--menu-sub)",
              color: theme.textSoft,
              lineHeight: 1.3,
              maxWidth: 360,
            }}
          >
            {subtitle}
          </div>
        </div>
        <div className={`sync-pill-toggle ${active ? "active" : ""}`}>
          {active ? "ACTIF" : "VOIR"}
        </div>
      </button>
    </div>
  );
}

/* --------------------------------------------
 * PANEL LOCAL EXPORT / IMPORT
 * -------------------------------------------*/
function LocalPanel({
  theme,
  t,
  exportJson,
  importJson,
  message,
  onChangeImport,
  onExportStore,
  onExportActiveProfile,
  onDownload,
  onImport,
  onImportFile,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  exportJson: string;
  importJson: string;
  message: string;
  onChangeImport: (v: string) => void;
  onExportStore: () => void;
  onExportActiveProfile: () => void;
  onDownload: () => void;
  onImport: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--panel-radius)",
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        padding: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,.85)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: theme.primary,
          marginBottom: 8,
        }}
      >
        {t("syncCenter.local.title", "Export / Import local")}
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: theme.textSoft,
          marginBottom: 8,
          lineHeight: 1.35,
        }}
      >
        {t(
          "syncCenter.local.desc",
          "Permet de sauvegarder l'intégralité de tes stats dans un fichier, ou de restaurer un export sur un autre appareil."
        )}
      </div>

      {/* Actions export */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onExportStore} style={buttonSmall(theme)}>
          {t("syncCenter.local.btnExportStore", "Exporter TOUT le store")}
        </button>
        <button onClick={onExportActiveProfile} style={buttonSmall(theme)}>
          {t("syncCenter.local.btnExportProfile", "Exporter profil actif")}
        </button>
        <button
          onClick={onDownload}
          style={buttonSmall(theme)}
          disabled={!exportJson}
        >
          {t(
            "syncCenter.local.btnDownload",
            "Télécharger (.dcstats.json)"
          )}
        </button>
      </div>

      {/* Zone JSON export (readonly) */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.local.exportLabel",
            "JSON d'export (tu peux aussi le copier / coller vers un autre appareil) :"
          )}
        </div>
        <textarea className="sync-textarea" readOnly value={exportJson} />
      </div>

      {/* Import */}
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.local.importLabel",
            "Colle ici un JSON d'export, ou importe un fichier :"
          )}
        </div>
        <textarea
          className="sync-textarea"
          value={importJson}
          onChange={(e) => onChangeImport(e.target.value)}
          placeholder={t("syncCenter.local.importPlaceholder", "{ ... }")}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <button onClick={onImport} style={buttonSmall(theme)}>
            {t("syncCenter.local.btnImport", "Importer JSON")}
          </button>
          <label style={{ ...buttonSmall(theme), cursor: "pointer" }}>
            <span>
              {t("syncCenter.local.btnChooseFile", "Choisir un fichier")}
            </span>
            <input
              type="file"
              accept=".json,.dcstats.json,application/json"
              style={{ display: "none" }}
              onChange={onImportFile}
            />
          </label>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: theme.textSoft,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------
 * PANEL PEER / DEVICE-À-DEVICE
 * -------------------------------------------*/
function PeerPanel({
  theme,
  t,
  payload,
  status,
  onGenerate,
  onCopy,
  onImport,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  payload: string;
  status: string;
  onGenerate: () => void;
  onCopy: () => void;
  onImport: () => void;
}) {
  const [qrUrl, setQrUrl] = React.useState<string>("");

  return (
    <div
      style={{
        borderRadius: "var(--panel-radius)",
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        padding: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,.85)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: theme.primary,
          marginBottom: 8,
        }}
      >
        {t(
          "syncCenter.peer.titlePanel",
          "Sync directe avec un ami (device à device)"
        )}
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: theme.textSoft,
          marginBottom: 8,
          lineHeight: 1.35,
        }}
      >
        {t(
          "syncCenter.peer.desc",
          "Génère un payload que tu pourras partager via QR code, message ou e-mail. Sur l'appareil de ton ami, il suffira d'importer ce payload pour fusionner les stats."
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onGenerate} style={buttonSmall(theme)}>
          {t("syncCenter.peer.btnGenerate", "Générer payload de sync")}
        </button>
        <button
          onClick={onCopy}
          style={buttonSmall(theme)}
          disabled={!payload}
        >
          {t(
            "syncCenter.peer.btnCopy",
            "Copier pour partage (QR / message)"
          )}
        </button>
        <button
          onClick={() => {
            if (!payload) return;
            const url = generateQrDataUrl(payload, theme.primary);
            setQrUrl(url);
          }}
          style={buttonSmall(theme)}
          disabled={!payload}
        >
          {t("syncCenter.peer.btnShowQr", "Afficher QR")}
        </button>
        <button
          onClick={onImport}
          style={buttonSmall(theme)}
          disabled={!payload}
        >
          {t("syncCenter.peer.btnImport", "Importer ce payload")}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.peer.payloadLabel",
            "Payload généré (format JSON, à transformer en QR ou à envoyer) :"
          )}
        </div>
        <textarea className="sync-textarea" readOnly value={payload} />
      </div>

      {qrUrl && (
        <div style={{ marginTop: 10, marginBottom: 8, textAlign: "center" }}>
          <img
            src={qrUrl}
            alt="QR"
            style={{
              width: 220,
              height: 220,
              margin: "0 auto",
              borderRadius: 12,
              boxShadow: `0 0 18px ${theme.primary}55`,
            }}
          />
        </div>
      )}

      {status && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: theme.textSoft,
          }}
        >
          {status}
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          fontSize: 10.5,
          color: theme.textSoft,
          opacity: 0.8,
        }}
      >
        {t(
          "syncCenter.peer.todo",
          "TODO technique : ajouter un module de scan QR pour importer automatiquement ce payload sur l'autre appareil."
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------
 * PANEL CLOUD SYNC
 * -------------------------------------------*/
function CloudPanel({
  theme,
  t,
  token,
  status,
  onTokenChange,
  onUpload,
  onDownload,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  token: string;
  status: string;
  onTokenChange: (v: string) => void;
  onUpload: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--panel-radius)",
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        padding: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,.85)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: theme.primary,
          marginBottom: 8,
        }}
      >
        {t("syncCenter.cloud.titlePanel", "Sync Cloud (code)")}
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: theme.textSoft,
          marginBottom: 8,
          lineHeight: 1.35,
        }}
      >
        {t(
          "syncCenter.cloud.desc",
          "Envoie un snapshot de tes stats vers le cloud. Tu reçois un code unique à saisir sur un autre appareil pour tout récupérer."
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onUpload} style={buttonSmall(theme)}>
          {t("syncCenter.cloud.btnUpload", "Envoyer snapshot")}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.cloud.tokenLabel",
            "Code de synchronisation (cloud) :"
          )}
        </div>
        <input
          type="text"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder={t(
            "syncCenter.cloud.tokenPlaceholder",
            "Ex : 7FQ9-L2KD-8ZP3"
          )}
          style={{
            width: "100%",
            borderRadius: 999,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.75)",
            color: theme.text,
            fontSize: 12,
            padding: "6px 10px",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onDownload} style={buttonSmall(theme)}>
          {t("syncCenter.cloud.btnDownload", "Récupérer avec ce code")}
        </button>
      </div>

      {status && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: theme.textSoft,
          }}
        >
          {status}
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          fontSize: 10.5,
          color: theme.textSoft,
          opacity: 0.8,
        }}
      >
        {t(
          "syncCenter.cloud.todo",
          "TODO technique : implémenter /api/sync/upload & /api/sync/download dans un Worker Cloudflare avec stockage KV."
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------
 * STYLE BOUTONS
 * -------------------------------------------*/
function buttonSmall(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    border: "none",
    padding: "5px 12px",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    background: theme.primary,
    color: "#000",
    cursor: "pointer",
    boxShadow: `0 0 14px ${theme.primary}55`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };
}

/* --------------------------------------------
 * QR PLACEHOLDER (SVG dans un data URL)
 * -------------------------------------------*/
// ⚠️ Ce n'est pas un vrai QR scannable pour l’instant, juste un placeholder visuel.
function generateQrDataUrl(text: string, color: string): string {
  const safe = encodeURIComponent(text.slice(0, 32));
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="black"/>
      <stop offset="100%" stop-color="black"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="220" height="220" fill="url(#bg)"/>
  <rect x="16" y="16" width="52" height="52" fill="none" stroke="${color}" stroke-width="6"/>
  <rect x="24" y="24" width="36" height="36" fill="${color}22"/>
  <rect x="152" y="16" width="52" height="52" fill="none" stroke="${color}" stroke-width="6"/>
  <rect x="160" y="24" width="36" height="36" fill="${color}22"/>
  <rect x="16" y="152" width="52" height="52" fill="none" stroke="${color}" stroke-width="6"/>
  <rect x="24" y="160" width="36" height="36" fill="${color}22"/>
  <text x="110" y="208" fill="${color}" font-size="10" text-anchor="middle">
    DC-SYNC
  </text>
  <title>${safe}</title>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
