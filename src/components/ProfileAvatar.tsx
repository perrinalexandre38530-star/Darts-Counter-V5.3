// ============================================
// src/components/ProfileAvatar.tsx
// Avatar + couronne d’étoiles dorées (moy. 3-darts)
// - Accepte EITHER {dataUrl,label,size,avg3D,showStars[,ringColor,textColor]}
//   OR      {profile,size,avg3D,showStars[,ringColor,textColor]}
// - Aucun accès direct non-sécurisé à profile.*
// - NEW : overlay fléchette (set préféré ou plus tard set imposé)
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
  stats?: { avg3D?: number | null; avg3?: number | null } | null;
};

/** Options visuelles communes */
type VisualOpts = {
  ringColor?: string;
  textColor?: string;
  dartSetId?: string | null; // set forcé (match X01)
  showDartOverlay?: boolean; // activer/désactiver overlay
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
      avg3D?: number | null; // force/override
      showStars?: boolean;
      dataUrl?: never;
      label?: never;
    });

export default function ProfileAvatar(props: Props) {
  const size = props.size ?? 56;
  const showStars = props.showStars ?? true;
  const showDartOverlay = props.showDartOverlay !== false;

  // -------- Normalisation des données --------
  const p: ProfileLike | null =
    ("profile" in props ? props.profile : null) ?? null;

  // Priorité des images : dataUrl explicite > avatarDataUrl > avatarUrl
  const img =
    ("dataUrl" in props ? props.dataUrl : undefined) ??
    p?.avatarDataUrl ??
    p?.avatarUrl ??
    null;

  const name =
    ("label" in props ? props.label : undefined) ?? p?.name ?? "P";

  // Moyenne 3-darts pour la couronne
  const avg3D =
    ("avg3D" in props ? props.avg3D : undefined) ??
    p?.stats?.avg3D ??
    p?.stats?.avg3 ??
    null;

  // Options couleurs
  const ringColor = props.ringColor ?? "rgba(255,255,255,0.28)";
  const textColor = props.textColor ?? "#f5f5ff";

  // ---------- Dart set overlay ----------
  const [dartSet, setDartSet] = React.useState<DartSet | null>(null);

  React.useEffect(() => {
    const profileId = p?.id;

    if (!profileId || !showDartOverlay) {
      setDartSet(null);
      return;
    }

    try {
      // Liste de tous les sets du profil
      const all = getDartSetsForProfile(profileId) || [];

      // 1) Si un set est imposé (en match X01 / Cricket) — plus tard
      if (props.dartSetId) {
        const forced = all.find((s) => s.id === props.dartSetId);
        if (forced) {
          setDartSet(forced);
          return;
        }
      }

      // 2) Sinon → jeu préféré du profil
      const fav = getFavoriteDartSetForProfile(profileId);
      if (fav) {
        setDartSet(fav);
        return;
      }

      // 3) Fallback : premier set si aucun préféré explicitement défini
      setDartSet(all[0] || null);
    } catch (e) {
      console.warn("[ProfileAvatar] dartSet overlay error:", e);
      setDartSet(null);
    }
  }, [showDartOverlay, p?.id, props.dartSetId]);

  // Badge fléchettes – taille & offsets (objet qui “frotte” le médaillon)
  const dartOverlaySize = size * 0.34; // ~34% du diamètre
  const dartOverlayOutsideOffset = dartOverlaySize * 0.35;

  // ---------- Rendu ----------
  return (
    <div
      className="relative avatar inline-block"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative", // indispensable pour l’overlay
        overflow: "visible", // permet au badge de déborder comme le flag
      }}
    >
      {/* Image avatar */}
      {img ? (
        <img
          src={img}
          alt={name ?? "avatar"}
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
          className="flex items-center justify-center bg-gray-700 rounded-full"
          style={{
            width: "100%",
            height: "100%",
            fontSize: Math.max(10, size * 0.4),
            fontWeight: 700,
            borderRadius: "50%",
            border: `2px solid ${ringColor}`,
            color: textColor,
          }}
        >
          {(name ?? "P").slice(0, 1).toUpperCase()}
        </div>
      )}

      {/* Couronne d’étoiles */}
      {showStars && (
        <ProfileStarRing avg3d={avg3D ?? 0} anchorSize={size} />
      )}

      {/* ---------- Overlay fléchettes (extérieur du médaillon, image) ---------- */}
      {dartSet?.thumbImageUrl && (
        <img
          src={dartSet.thumbImageUrl}
          alt="dart set"
          style={{
            position: "absolute",
            width: dartOverlaySize,
            height: dartOverlaySize,
            bottom: -dartOverlayOutsideOffset, // sort du cercle
            right: -dartOverlayOutsideOffset, // sort du cercle
            opacity: 0.96,
            pointerEvents: "none",
            transform: "rotate(18deg)",
            filter: "drop-shadow(0 0 10px rgba(0,0,0,.95))",
          }}
        />
      )}

      {/* ---------- Overlay fléchettes (extérieur du médaillon, fallback 🎯) ---------- */}
      {!dartSet?.thumbImageUrl && dartSet && (
        <div
          style={{
            position: "absolute",
            width: dartOverlaySize,
            height: dartOverlaySize,
            bottom: -dartOverlayOutsideOffset,
            right: -dartOverlayOutsideOffset,
            borderRadius: "50%",
            background: dartSet.bgColor || "#050509",
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
