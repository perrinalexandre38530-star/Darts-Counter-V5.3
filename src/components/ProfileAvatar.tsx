// ============================================
// src/components/ProfileAvatar.tsx
// Avatar + couronne d’étoiles dorées (moy. 3-darts)
// - Accepte EITHER {dataUrl,label,size,avg3D,showStars[,ringColor,textColor]}
//   OR      {profile,size,avg3D,showStars[,ringColor,textColor]}
// - NEW : overlay fléchette (set préféré ou set imposé via dartSetId)
// ✅ FIX PRIORITY : Supabase avatarUrl > legacy avatarDataUrl (base64)
// ✅ FIX PERF : ignore base64 énorme (évite RAM + latence)
// ✅ CLEAN : suppression logs/DEBUG + pas de cercle rouge
// ============================================

import React from "react";
import ProfileStarRing from "./ProfileStarRing";
import {
  type DartSet,
  getFavoriteDartSetForProfile,
  getDartSetsForProfile,
} from "../lib/dartSetsStore";

type ProfileLike = {
  id?: string;
  name?: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
  avatarPath?: string | null;
  stats?: { avg3D?: number | null; avg3?: number | null } | null;
};

type VisualOpts = {
  ringColor?: string;
  textColor?: string;
  dartSetId?: string | null;
  showDartOverlay?: boolean;
};

type Props =
  | (VisualOpts & {
      dataUrl?: string;
      label?: string;
      size?: number;
      avg3D?: number | null;
      showStars?: boolean;
      profile?: never;
    })
  | (VisualOpts & {
      profile?: ProfileLike | null;
      size?: number;
      avg3D?: number | null;
      showStars?: boolean;
      dataUrl?: never;
      label?: never;
    });

function withCacheBust(src: string, salt: string) {
  if (!/^https?:\/\//i.test(src)) return src;
  const hasQ = src.includes("?");
  return `${src}${hasQ ? "&" : "?"}v=${encodeURIComponent(salt)}`;
}

function normalizeSrc(raw: any): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;

  // OK: data:, blob:
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;

  // OK: http(s)
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return s.replace(/ /g, "%20");
  }

  // path sans host -> pas résolvable ici
  return null;
}

export default function ProfileAvatar(props: Props) {
  const size = props.size ?? 56;
  const showStars = props.showStars ?? true;
  const showDartOverlay = props.showDartOverlay === true;

  const p: ProfileLike | null = ("profile" in props ? props.profile : null) ?? null;

  const name = ("label" in props ? props.label : undefined) ?? p?.name ?? "P";

  const avg3D =
    ("avg3D" in props ? props.avg3D : undefined) ??
    p?.stats?.avg3D ??
    p?.stats?.avg3 ??
    null;

  const ringColor = props.ringColor ?? "rgba(255,255,255,0.28)";
  const textColor = props.textColor ?? "#f5f5ff";

  // ============================================================
  // ✅ SOURCE ORDER FIX
  // - dataUrl (props) = preview explicite (ex: blob: en édition) -> PRIORITÉ
  // - avatarUrl (Supabase publicUrl) -> PRIORITÉ
  // - avatarPath (si déjà un vrai src http/data/blob) -> ok
  // - avatarDataUrl (legacy base64) -> EN DERNIER, et ignoré si énorme
  // ============================================================
  const propDataUrl =
    "dataUrl" in props && props.dataUrl ? String(props.dataUrl).trim() : "";

  const avatarUrl = p?.avatarUrl ? String(p.avatarUrl).trim() : "";
  const avatarPath = p?.avatarPath ? String(p.avatarPath).trim() : "";
  const avatarDataUrl = p?.avatarDataUrl ? String(p.avatarDataUrl).trim() : "";

  const dataUrlLooksHuge =
    avatarDataUrl.startsWith("data:image/") && avatarDataUrl.length > 200_000;

  const rawImg = React.useMemo(() => {
    if (propDataUrl) return propDataUrl; // preview explicite (souvent blob:)
    if (avatarUrl) return avatarUrl; // ✅ Supabase doit gagner
    if (
      avatarPath &&
      (avatarPath.startsWith("http") ||
        avatarPath.startsWith("data:") ||
        avatarPath.startsWith("blob:"))
    ) {
      return avatarPath;
    }
    if (avatarDataUrl && !dataUrlLooksHuge) return avatarDataUrl; // legacy ok si petit
    return null;
  }, [propDataUrl, avatarUrl, avatarPath, avatarDataUrl, dataUrlLooksHuge]);

  const [imgBroken, setImgBroken] = React.useState(false);

  React.useEffect(() => {
    setImgBroken(false);
  }, [rawImg]);

  const img = React.useMemo(() => {
    const normalized = normalizeSrc(rawImg);
    if (!normalized) return null;

    // salt stable-ish (évite cache hard quand supabase met à jour l'image)
    const salt = String(rawImg).slice(-24) || String(Date.now());
    return withCacheBust(normalized, salt);
  }, [rawImg]);

  const shouldShowImg = !!img && !imgBroken;

  // ---------- Dart set overlay ----------
  const [dartSet, setDartSet] = React.useState<DartSet | null>(null);

  React.useEffect(() => {
    const profileId = p?.id;

    if (!profileId || !showDartOverlay) {
      setDartSet(null);
      return;
    }

    try {
      const all = getDartSetsForProfile(profileId) || [];

      if (props.dartSetId) {
        const forced = all.find((s) => s.id === props.dartSetId);
        if (forced) {
          setDartSet(forced);
          return;
        }
      }

      const fav = getFavoriteDartSetForProfile(profileId);
      if (fav) {
        setDartSet(fav);
        return;
      }

      setDartSet(all[0] || null);
    } catch {
      setDartSet(null);
    }
  }, [showDartOverlay, p?.id, props.dartSetId]);

  const dartOverlaySize = size * 0.34;
  const dartOverlayOutsideOffset = dartOverlaySize * 0.35;

  return (
    <div
      className="relative avatar inline-block"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        overflow: "visible",
      }}
    >
      {shouldShowImg ? (
        <img
          key={img as string}
          src={img as string}
          alt={name ?? "avatar"}
          onError={() => setImgBroken(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
            display: "block",
            border: `2px solid ${ringColor}`,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: `2px solid ${ringColor}`,
            color: textColor,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            lineHeight: 1,
            userSelect: "none",
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,.10), rgba(0,0,0,.35))",
          }}
        >
          <div
            style={{
              fontSize: Math.max(10, size * 0.4),
              fontWeight: 900,
              letterSpacing: 0.5,
              transform: "translateY(1px)",
            }}
          >
            {(name ?? "P").trim().slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      {showStars && <ProfileStarRing avg3d={avg3D ?? 0} anchorSize={size} />}

      {showDartOverlay && dartSet?.thumbImageUrl && (
        <img
          src={dartSet.thumbImageUrl}
          alt="dart set"
          style={{
            position: "absolute",
            width: dartOverlaySize,
            height: dartOverlaySize,
            bottom: -dartOverlayOutsideOffset,
            right: -dartOverlayOutsideOffset,
            opacity: 0.96,
            pointerEvents: "none",
            transform: "rotate(18deg)",
            filter: "drop-shadow(0 0 10px rgba(0,0,0,.95))",
          }}
        />
      )}

      {showDartOverlay && !dartSet?.thumbImageUrl && dartSet && (
        <div
          style={{
            position: "absolute",
            width: dartOverlaySize,
            height: dartOverlaySize,
            bottom: -dartOverlayOutsideOffset,
            right: -dartOverlayOutsideOffset,
            borderRadius: "50%",
            background: (dartSet as any)?.bgColor || "#050509",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: dartOverlaySize * 0.55,
            transform: "rotate(20deg)",
            color: "rgba(255,255,255,.96)",
            pointerEvents: "none",
            boxShadow: "0 0 14px rgba(0,0,0,.95)",
            border: "1px solid rgba(245,195,91,.9)",
          }}
        >
          🎯
        </div>
      )}
    </div>
  );
}
