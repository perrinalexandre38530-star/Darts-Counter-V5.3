// ============================================
// src/pages/AvatarCreator.tsx
// Création d'avatar "Option C" façon CHAPA DARTS
// - Médaillon noir + double anneau doré
// - Texte haut : "DARTS COUNTER" plaqué contre l’anneau intérieur (extérieur)
// - Texte bas : nom choisi, plaqué contre l’anneau intérieur (extérieur)
// - Import de photo + zoom dans le médaillon
// - Export en PNG (dataURL) via <canvas>
// - Optionnel : callback onSave pour l’intégrer au profil actif
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  size?: number; // taille du médaillon en px
  overlaySrc?: string; // pas utilisé ici mais gardé pour compat
  defaultName?: string;
  onSave?: (payload: { pngDataUrl: string; name: string }) => void;
  onBack?: () => void; // callback pour bouton Retour
};

const GOLD = "#F6C256";
const BLACK = "#000000";

// --- Géométrie du médaillon (calée sur ton modèle) ---
const R_OUTER = 248; // rayon du grand anneau doré (centre du stroke)
const R_INNER = 188; // rayon de l’anneau intérieur doré (centre du stroke)
const STROKE = 18; // épaisseur des anneaux

// Cercle avatar = bord interne de l’anneau intérieur → il "touche" l’anneau
const R_AVATAR = R_INNER - STROKE / 2;

// Texte haut collé au CERCLE INTÉRIEUR, côté extérieur
const R_TEXT = R_INNER + STROKE / 2 + 4;

// Offsets verticaux
const TEXT_DY_TOP = -6;

// Texte bas (nom)
const NAME_RADIUS = R_INNER + 6;
const TEXT_DY_BOTTOM = 30; // valeur que tu avais trouvée

export default function AvatarCreator({
  size = 512,
  overlaySrc, // eslint-disable-line @typescript-eslint/no-unused-vars
  defaultName = "",
  onSave,
  onBack,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [name, setName] = React.useState(defaultName);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [cartoonUrl, setCartoonUrl] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1.15); // zoom dans le médaillon
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const isCartoon = !!cartoonUrl;
  // Image utilisée dans le médaillon (cartoon si dispo, sinon photo brute)
  const avatarImage = cartoonUrl || photoUrl || null;

  // Back unifié : si onBack fourni (App), on l’utilise, sinon history.back()
  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  }, [onBack]);

  // ---------------- Import photo ----------------
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxMb = 6;
    if (f.size > maxMb * 1024 * 1024) {
      setError(
        t(
          "avatar.error.tooBig",
          `L’image est trop lourde (max ${maxMb} Mo).`
        )
      );
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setCartoonUrl(null);
      setStatus(
        t(
          "avatar.status.photoLoaded",
          "Photo importée, ajuste le zoom puis génère la version cartoon."
        )
      );
    };
    reader.readAsDataURL(f);
  }

  // ---------------- Cartoon (placeholder + petit filtre visuel) ----------------
  async function handleCartoonize() {
    if (!photoUrl) {
      setError(
        t("avatar.error.noPhoto", "Commence par importer une photo.")
      );
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(
      t(
        "avatar.status.cartoonInProgress",
        "Préparation de l’avatar cartoon (IA)…"
      )
    );

    try {
      // TODO backend IA réel
      await new Promise((r) => setTimeout(r, 600));
      setCartoonUrl(photoUrl);
      setStatus(
        t(
          "avatar.status.cartoonReady",
          "Avatar cartoon prêt. Tu peux l’enregistrer."
        )
      );
      console.log(
        "[AvatarCreator] Cartoon client appliqué (placeholder filtre SVG)."
      );
    } catch (e) {
      console.warn(e);
      setError(
        t(
          "avatar.error.cartoonFailed",
          "Impossible de générer la version cartoon pour le moment."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  // ---------------- Export SVG -> PNG ----------------
  async function handleSave() {
    if (!avatarImage) {
      setError(
        t(
          "avatar.error.noAvatar",
          "Importe une photo puis génère l’avatar avant d’enregistrer."
        )
      );
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;

    try {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = "anonymous";

      const pngDataUrl: string = await new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas non dispo"));
            return;
          }
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };
        img.src = url;
      });

      if (onSave) {
        onSave({ pngDataUrl, name: name || "PLAYER" });
        setStatus(
          t(
            "avatar.status.savedToProfile",
            "Avatar enregistré sur le profil."
          )
        );
      } else {
        const a = document.createElement("a");
        a.href = pngDataUrl;
        a.download = `avatar-darts-counter-${name || "player"}.png`;
        a.click();
        setStatus(
          t(
            "avatar.status.downloaded",
            "Avatar généré et téléchargé."
          )
        );
      }
    } catch (e) {
      console.warn(e);
      setError(
        t(
          "avatar.error.saveFailed",
          "Impossible d’enregistrer l’avatar pour le moment."
        )
      );
    }
  }

  const primary = theme.primary ?? GOLD;

  // Calcul taille de l’image dans le clip (zoom)
  const avatarImgSize = R_AVATAR * 2 * zoom;

  return (
    <div
      className="container"
      style={{
        padding: 8,
        paddingBottom: 96,
        color: theme.text,
        maxWidth: 820,
        margin: "0 auto",
      }}
    >
      {/* Bouton Retour sobre */}
      <button
        type="button"
        onClick={handleBack}
        style={{
          marginBottom: 8,
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "transparent",
          color: theme.textSoft,
          cursor: "pointer",
        }}
      >
        ← {t("avatar.back", "Retour")}
      </button>

      <h2
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 4,
          color: primary,
        }}
      >
        {t("avatar.title", "Création d’avatar")}
      </h2>
      <p
        style={{
          fontSize: 12,
          opacity: 0.8,
          marginBottom: 14,
        }}
      >
        {t(
          "avatar.subtitle",
          "Importe une photo, recadre-la dans le médaillon Darts Counter puis applique un effet cartoon."
        )}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {/* Prévisualisation médaillon */}
        <div
          style={{
            flex: "0 0 auto",
            width: "min(100%, 360px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: size,
              aspectRatio: "1 / 1",
              background:
                "radial-gradient(circle at 30% 0%, rgba(255,220,120,.22), transparent 60%), #05050a",
              borderRadius: 24,
              padding: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <svg
              ref={svgRef}
              viewBox="-256 -256 512 512"
              width="100%"
              height="100%"
            >
              <defs>
                <clipPath id="avatarClip">
                  <circle r={R_AVATAR} cx={0} cy={0} />
                </clipPath>

                {/* Filtre CARTOON pour le mode IA (placeholder) */}
                <filter id="cartoonFilter">
                  <feColorMatrix
                    type="matrix"
                    values="
                      1.2 0   0   0 -0.1
                      0   1.2 0   0 -0.1
                      0   0   1.2 0 -0.1
                      0   0   0   1  0
                    "
                  />
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="
                      -1  -1  -1  0  1
                      -1  -1  -1  0  1
                      -1  -1  -1  0  1
                      0   0   0   1  0
                    "
                    result="edges"
                  />
                  <feBlend in="SourceGraphic" in2="edges" mode="multiply" />
                </filter>
              </defs>

              {/* Fond noir global */}
              <circle r={R_OUTER + STROKE} fill={BLACK} />

              {/* Grand anneau doré extérieur */}
              <circle
                r={R_OUTER}
                fill="none"
                stroke={GOLD}
                strokeWidth={STROKE}
              />

              {/* Anneau doré intérieur */}
              <circle
                r={R_INNER}
                fill="none"
                stroke={GOLD}
                strokeWidth={STROKE}
              />

              {/* Cercle noir de fond pour l’avatar (colle à l’anneau intérieur) */}
              <circle r={R_AVATAR} fill={BLACK} />

              {/* Image avatar, clipée dans le cercle avatar */}
              {avatarImage ? (
                <g clipPath="url(#avatarClip)">
                  <image
                    href={avatarImage}
                    x={-avatarImgSize / 2}
                    y={-avatarImgSize / 2}
                    width={avatarImgSize}
                    height={avatarImgSize}
                    preserveAspectRatio="xMidYMid slice"
                    filter={isCartoon ? "url(#cartoonFilter)" : undefined}
                  />
                </g>
              ) : (
                <g clipPath="url(#avatarClip)">
                  {/* Placeholder cartoon simple */}
                  <circle r={R_AVATAR} fill="#22232b" />
                  <circle r={R_AVATAR * 0.7} fill="#f0c27b" />
                  <circle
                    r={R_AVATAR * 0.55}
                    cy={R_AVATAR * 0.05}
                    fill="#f7d29b"
                  />
                  <circle
                    cx={-R_AVATAR * 0.25}
                    cy={-R_AVATAR * 0.2}
                    r={R_AVATAR * 0.08}
                    fill="#2b1c12"
                  />
                  <circle
                    cx={R_AVATAR * 0.25}
                    cy={-R_AVATAR * 0.2}
                    r={R_AVATAR * 0.08}
                    fill="#2b1c12"
                  />
                  <path
                    d={`
                      M ${-R_AVATAR * 0.3} ${R_AVATAR * 0.18}
                      Q 0 ${R_AVATAR * 0.35}
                        ${R_AVATAR * 0.3} ${R_AVATAR * 0.18}
                    `}
                    fill="none"
                    stroke="#c66b2b"
                    strokeWidth={R_AVATAR * 0.08}
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Texte haut : DARTS COUNTER collé au cercle intérieur côté extérieur */}
              <path
                id="arcTop"
                d={`
                  M ${-R_TEXT} ${TEXT_DY_TOP}
                  A ${R_TEXT} ${R_TEXT} 0 0 1 ${R_TEXT} ${TEXT_DY_TOP}
                `}
                fill="none"
              />
              <text
                fontFamily="'Montserrat','system-ui',sans-serif"
                fontSize={40}
                fontWeight={800}
                letterSpacing={4}
                fill={GOLD}
              >
                <textPath
                  href="#arcTop"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  DARTS COUNTER
                </textPath>
              </text>

              {/* Texte bas : nom, collé au cercle intérieur dans la bande noire */}
              <path
                id="arcBottom"
                d={`
                  M ${-NAME_RADIUS} ${TEXT_DY_BOTTOM}
                  A ${NAME_RADIUS} ${NAME_RADIUS} 0 0 0 ${NAME_RADIUS} ${TEXT_DY_BOTTOM}
                `}
                fill="none"
              />
              <text
                fontFamily="'Montserrat','system-ui',sans-serif"
                fontSize={40}
                fontWeight={800}
                letterSpacing={4}
                fill={GOLD}
              >
                <textPath
                  href="#arcBottom"
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {(name || "PLAYER").toUpperCase()}
                </textPath>
              </text>

              {/* Petit badge "IA" quand le cartoon est actif */}
              {isCartoon && (
                <g transform="translate(150,-190)">
                  <rect
                    x={-36}
                    y={-14}
                    width={72}
                    height={28}
                    rx={14}
                    fill="rgba(0,0,0,0.75)"
                    stroke={GOLD}
                    strokeWidth={2}
                  />
                  <text
                    x={0}
                    y={6}
                    textAnchor="middle"
                    fontFamily="'Montserrat','system-ui',sans-serif"
                    fontSize={16}
                    fontWeight={800}
                    fill={GOLD}
                  >
                    IA
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Panneau contrôles */}
        <div
          style={{
            flex: "1 1 260px",
            minWidth: 260,
            maxWidth: 360,
            padding: 12,
            borderRadius: 18,
            background: theme.card,
            border: `1px solid ${theme.borderSoft}`,
            boxShadow: "0 18px 36px rgba(0,0,0,.55)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Nom */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.textSoft }}>
              {t("avatar.label.name", "Nom affiché en bas du médaillon")}
            </span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("avatar.placeholder.name", "Ex : NINZALEX")}
            />
          </label>

          {/* Zoom */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.textSoft }}>
              {t(
                "avatar.label.zoom",
                "Zoom (pince les doigts ou utilise le slider)"
              )}
            </span>
            <input
              type="range"
              min={1}
              max={2.4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
            <span
              className="subtitle"
              style={{ fontSize: 11, color: theme.textSoft }}
            >
              {t(
                "avatar.help.zoom",
                "Ajuste le zoom pour bien centrer le visage dans le médaillon."
              )}
            </span>
          </div>

          {/* Import photo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 4,
              fontSize: 12,
            }}
          >
            <span style={{ color: theme.textSoft }}>
              {t("avatar.label.photo", "Photo de départ")}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label
                className="btn sm"
                style={{
                  cursor: "pointer",
                  borderRadius: 999,
                  paddingInline: 12,
                }}
              >
                {t("avatar.btn.import", "Importer une photo")}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </label>
              {photoUrl && (
                <button
                  className="btn sm"
                  type="button"
                  onClick={() => {
                    setPhotoUrl(null);
                    setCartoonUrl(null);
                    setStatus(null);
                  }}
                >
                  {t("avatar.btn.clear", "Effacer la photo")}
                </button>
              )}
            </div>
            <span
              className="subtitle"
              style={{ fontSize: 11, color: theme.textSoft }}
            >
              {t(
                "avatar.help.photo",
                "Utilise une photo bien centrée sur le visage, de préférence en bonne lumière."
              )}
            </span>
          </div>

          {/* Bouton IA */}
          <div style={{ marginTop: 6 }}>
            <button
              className="btn primary sm"
              type="button"
              disabled={!photoUrl || busy}
              onClick={handleCartoonize}
              style={{
                width: "100%",
                borderRadius: 999,
                fontWeight: 800,
                background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
                color: "#000",
              }}
            >
              {busy
                ? t("avatar.btn.cartoonBusy", "Génération cartoon…")
                : t("avatar.btn.cartoon", "Appliquer l’effet cartoon (IA)")}
            </button>
            <div
              className="subtitle"
              style={{ fontSize: 11, marginTop: 4, color: theme.textSoft }}
            >
              {t(
                "avatar.help.cartoon",
                "Actuellement, un filtre cartoon est appliqué côté client à partir de la photo importée."
              )}
            </div>
          </div>

          {/* Indicateur IA très clair */}
          <div
            style={{
              fontSize: 11,
              marginTop: 4,
              color: isCartoon ? "#8fe6aa" : theme.textSoft,
            }}
          >
            {isCartoon
              ? t(
                  "avatar.info.cartoonOn",
                  "Effet cartoon ACTIF sur le médaillon."
                )
              : t(
                  "avatar.info.cartoonOff",
                  "Effet cartoon inactif. Clique sur le bouton IA après avoir importé ta photo."
                )}
          </div>

          {/* Messages statut / erreurs */}
          {status && !error && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11.5,
                color: "#8fe6aa",
              }}
            >
              {status}
            </div>
          )}
          {error && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11.5,
                color: "#ff8a8a",
              }}
            >
              {error}
            </div>
          )}

          {/* Enregistrer */}
          <div style={{ marginTop: 10 }}>
            <button
              className="btn ok"
              type="button"
              onClick={handleSave}
              disabled={busy || !avatarImage}
              style={{
                width: "100%",
                borderRadius: 999,
                fontWeight: 800,
              }}
            >
              {t("avatar.btn.save", "Enregistrer l’avatar")}
            </button>
            <div
              className="subtitle"
              style={{ fontSize: 11, marginTop: 4, color: theme.textSoft }}
            >
              {onSave
                ? t(
                    "avatar.help.saveToProfile",
                    "L’avatar sera enregistré sur ton profil actif et utilisable partout dans l’application."
                  )
                : t(
                    "avatar.help.download",
                    "Sans profil cible, l’avatar sera téléchargé en PNG. Tu pourras ensuite l’importer comme avatar."
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
