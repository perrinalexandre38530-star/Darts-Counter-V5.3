// =============================================================
// src/components/DartSetScannerSheet.tsx
// UI de scan pour un jeu de fléchettes
// - Choix / prise de photo
// - Envoi vers l'API scanner
// - Mise à jour du DartSet (mainImageUrl + thumbImageUrl + bgColor)
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import {
  type DartSet,
  updateDartSet,
} from "../lib/dartSetsStore";
import {
  scanDartImage,
  type DartScanResult,
} from "../lib/dartScannerApi";

type Props = {
  dartSet: DartSet;
  onClose: () => void;
  onUpdated?: (updated: DartSet) => void;
};

type ScanStatus = "idle" | "preview" | "uploading" | "processing" | "done" | "error";

const DartSetScannerSheet: React.FC<Props> = ({
  dartSet,
  onClose,
  onUpdated,
}) => {
  const { palette } = useTheme();
  const { lang } = useLang();
  const primary = palette?.primary || "#f5c35b";

  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<ScanStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const t_scanTitle =
    lang === "fr"
      ? "Scanner la fléchette"
      : lang === "es"
      ? "Escanear el dardo"
      : lang === "de"
      ? "Dart scannen"
      : "Scan dart";

  const t_scanSubtitle =
    lang === "fr"
      ? "Prends ta fléchette en photo sur fond neutre. L'app va la détourer, la styliser en cartoon et l'orienter automatiquement."
      : lang === "es"
      ? "Haz una foto de tu dardo sobre un fondo neutro. La app lo recortará, aplicará estilo cartoon y lo orientará automáticamente."
      : lang === "de"
      ? "Fotografiere deinen Dart vor neutralem Hintergrund. Die App schneidet ihn aus, stylisiert ihn im Cartoon-Look und richtet ihn automatisch aus."
      : "Take a picture of your dart on a neutral background. The app will cut it out, cartoonize it and orient it automatically.";

  const handlePickImage = () => {
    setError(null);
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError(
        lang === "fr"
          ? "Fichier non valide. Choisis une image."
          : "Invalid file. Please pick an image."
      );
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setStatus("preview");
  };

  const handleScan = async () => {
    if (!file) return;
    setError(null);
    try {
      setStatus("uploading");
      const result: DartScanResult = await scanDartImage(file, {
        bgColor: dartSet.bgColor || "#101020",
        targetAngleDeg: 48,
        cartoonLevel: 0.85,
      });
      setStatus("processing");

      const updated = updateDartSet(dartSet.id, {
        mainImageUrl: result.mainImageUrl,
        thumbImageUrl: result.thumbImageUrl,
        bgColor: result.bgColor || dartSet.bgColor,
      });

      setStatus("done");
      if (updated && onUpdated) onUpdated(updated);
      // On laisse l'utilisateur voir le résultat éventuel ailleurs, on ferme direct
      onClose();
    } catch (err: any) {
      console.error("[DartSetScannerSheet] scan error", err);
      setStatus("error");
      setError(
        lang === "fr"
          ? "Le scan a échoué. Vérifie ta connexion et réessaie."
          : "Scan failed. Check your connection and try again."
      );
    }
  };

  const canScan = !!file && (status === "preview" || status === "error");
  const isBusy = status === "uploading" || status === "processing";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(circle at 0% 0%, rgba(245,195,91,.15), rgba(5,5,10,.98))",
        display: "flex",
        flexDirection: "column",
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.18)",
            background: "rgba(0,0,0,.5)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          {lang === "fr" ? "Fermer" : "Close"}
        </button>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "#fff",
          }}
        >
          {t_scanTitle}
        </div>

        <div style={{ width: 60 }} />
      </div>

      {/* Infos + preview */}
      <div
        style={{
          flex: 1,
          borderRadius: 18,
          background:
            "linear-gradient(145deg, rgba(6,6,14,.96), rgba(10,10,26,.98))",
          border: "1px solid rgba(255,255,255,.08)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,.7)",
          }}
        >
          {t_scanSubtitle}
        </div>

        {/* Zone preview */}
        <div
          style={{
            marginTop: 4,
            flex: 1,
            borderRadius: 14,
            border: "1px dashed rgba(255,255,255,.25)",
            background: "rgba(0,0,0,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 8,
            overflow: "hidden",
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="dart preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <>
              <div
                style={{
                  fontSize: 32,
                  marginBottom: 4,
                }}
              >
                📷
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,.6)",
                  textAlign: "center",
                  padding: "0 16px",
                }}
              >
                {lang === "fr"
                  ? "Choisis une photo de ta fléchette ou prends-la directement avec l'appareil photo."
                  : "Pick a photo of your dart or take one with the camera."}
              </div>
            </>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "rgba(255,140,140,.95)",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 6,
          }}
        >
          <button
            type="button"
            onClick={handlePickImage}
            disabled={isBusy}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.3)",
              background: "rgba(0,0,0,.7)",
              color: "#fff",
              fontSize: 12,
            }}
          >
            {lang === "fr"
              ? "Choisir / prendre une photo"
              : "Pick / take a photo"}
          </button>

          <button
            type="button"
            onClick={handleScan}
            disabled={!canScan || isBusy}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 999,
              border: "none",
              background: canScan
                ? "radial-gradient(circle at 0% 0%, rgba(127,226,169,.45), rgba(8,28,18,.98))"
                : "rgba(0,0,0,.4)",
              color: canScan ? "#fff" : "rgba(255,255,255,.4)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.4,
            }}
          >
            {isBusy
              ? lang === "fr"
                ? "Scan en cours..."
                : "Scanning..."
              : lang === "fr"
              ? "Lancer le scan"
              : "Scan dart"}
          </button>
        </div>
      </div>

      {/* input file caché */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default DartSetScannerSheet;
