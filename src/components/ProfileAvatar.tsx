// ============================================
// src/components/ProfileAvatar.tsx
// Avatar + couronne d’étoiles dorées (moy. 3-darts)
// - Accepte EITHER {dataUrl,label,size,avg3D,showStars[,ringColor,textColor]}
//   OR      {profile,size,avg3D,showStars[,ringColor,textColor]}
// - NEW : overlay fléchette (set préféré ou set imposé via dartSetId)
// ✅ FIX PRIORITY : Supabase avatarUrl > legacy avatarDataUrl (base64)
// ✅ FIX PERF : ignore base64 énorme (évite RAM + latence)
// ✅ CLEAN : suppression logs/DEBUG + pas de cercle rouge
// ✅ NEW GLOBAL FIX : si profile "lite" (id/name) => auto-resolve via loadStore() (sans modifier tous les setups)
// ✅ FIX ASSETS : accepte /assets/... + chemins relatifs + import png {default: "..."} (bots PRO)
// ============================================

import React from "react";
import ProfileStarRing from "./ProfileStarRing";
import {
  type DartSet,
  getFavoriteDartSetForProfile,
  getDartSetsForProfile,
} from "../lib/dartSetsStore";
import { loadStore } from "../lib/storage";

type ProfileLike = {
  id?: string;
  name?: string;
  avatarDataUrl?: any | null; // ⚠️ peut être string OU import png (object {default})
  avatarUrl?: any | null;     // idem
  avatarPath?: any | null;
  avatarUpdatedAt?: number | null; // (optionnel) si tu l’utilises ailleurs
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
      dataUrl?: any;   // string OU import
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

// ✅ import png peut être string OU {default: string}
function normalizeImport(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  if (typeof v === "object") {
    const d = (v as any).default;
    if (typeof d === "string") {
      const s = d.trim();
      return s ? s : null;
    }
  }
  return null;
}

// ✅ cache bust pour http(s) MAIS AUSSI /assets + relatifs
function withCacheBust(src: string, salt: string) {
  if (!src) return src;

  // pas besoin pour data/blob
  if (/^data:|^blob:/i.test(src)) return src;

  const hasQ = src.includes("?");
  return `${src}${hasQ ? "&" : "?"}v=${encodeURIComponent(salt)}`;
}

// ✅ accepte data/blob/http(s) + /assets + chemins relatifs + fichiers .png/.jpg...
function normalizeSrc(raw: any): string | null {
  const s = normalizeImport(raw);
  if (!s) return null;

  // OK: data:, blob:
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;

  // OK: http(s)
  if (s.startsWith("http://") || s.startsWith("https://")) {
    return s.replace(/ /g, "%20");
  }

  // ✅ OK: assets Vite (/assets/xxxx.png)
  if (s.startsWith("/assets/")) return s.replace(/ /g, "%20");

  // ✅ OK: chemins relatifs (./ ../) ou fichier direct (xxx.png)
  if (s.startsWith("./") || s.startsWith("../")) return s.replace(/ /g, "%20");
  if (/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(s)) return s.replace(/ /g, "%20");

  // sinon: inconnu (ex: "avatars/bot1" sans extension)
  return null;
}

/* ============================================================
   ✅ GLOBAL PROFILE RESOLVER (1 seul endroit)
   - Cache Map id -> ProfileLike (pour éviter 100 appels)
   - loadStore() une seule fois (promise partagée)
============================================================ */
let _storePromise: Promise<any | null> | null = null;
let _profilesCache: Map<string, ProfileLike> | null = null;

async function getProfileByIdFromStore(profileId: string): Promise<ProfileLike | null> {
  try {
    if (_profilesCache?.has(profileId)) return _profilesCache.get(profileId) || null;

    if (!_storePromise) _storePromise = loadStore<any>();
    const store = await _storePromise;
    if (!store) return null;

    const arr: any[] = Array.isArray(store.profiles) ? store.profiles : [];
    const map = new Map<string, ProfileLike>();

    for (const pr of arr) {
      const id = pr?.id;
      if (!id) continue;
      map.set(String(id), {
        id: String(id),
        name: pr?.name,
        avatarUrl: pr?.avatarUrl ?? null,
        avatarDataUrl: pr?.avatarDataUrl ?? null,
        avatarPath: pr?.avatarPath ?? null,
        avatarUpdatedAt: (pr as any)?.avatarUpdatedAt ?? null,
        stats: pr?.stats ?? null,
      });
    }

    _profilesCache = map;
    return map.get(profileId) || null;
  } catch {
    return null;
  }
}

function isLiteProfile(p: ProfileLike | null): boolean {
  if (!p?.id) return false;
  const hasAny =
    (normalizeImport(p.avatarUrl) || "") ||
    (normalizeImport(p.avatarDataUrl) || "") ||
    (normalizeImport(p.avatarPath) || "");
  return !hasAny;
}

export default function ProfileAvatar(props: Props) {
  const size = props.size ?? 56;
  const showStars = props.showStars ?? true;
  const showDartOverlay = props.showDartOverlay === true;

  const inputProfile: ProfileLike | null =
    ("profile" in props ? props.profile : null) ?? null;

  // ✅ profil résolu (si on reçoit un profil "lite")
  const [resolvedProfile, setResolvedProfile] = React.useState<ProfileLike | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const run = async () => {
      const p = inputProfile;
      const id = p?.id ? String(p.id) : "";
      if (!id) {
        if (mounted) setResolvedProfile(null);
        return;
      }

      if (!isLiteProfile(p)) {
        if (mounted) setResolvedProfile(null);
        return;
      }

      const full = await getProfileByIdFromStore(id);
      if (!mounted) return;

      if (full) {
        setResolvedProfile({
          ...full,
          ...p,
          avatarUrl: normalizeImport(p?.avatarUrl) ? p?.avatarUrl : full.avatarUrl,
          avatarPath: normalizeImport(p?.avatarPath) ? p?.avatarPath : full.avatarPath,
          avatarDataUrl: normalizeImport(p?.avatarDataUrl) ? p?.avatarDataUrl : full.avatarDataUrl,
          stats: p?.stats ?? full.stats ?? null,
          name: p?.name ?? full.name,
        });
      } else {
        setResolvedProfile(null);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [inputProfile?.id, inputProfile?.avatarUrl, inputProfile?.avatarPath, inputProfile?.avatarDataUrl]);

  // le profil effectif (résolu si dispo)
  const p: ProfileLike | null = resolvedProfile ?? inputProfile;

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
  // - dataUrl (props) = preview explicite -> PRIORITÉ
  // - avatarUrl (Supabase publicUrl) -> PRIORITÉ
  // - avatarPath (si déjà un vrai src résolvable) -> ok
  // - avatarDataUrl (legacy base64) -> EN DERNIER, et ignoré si énorme
  // ============================================================
  const propDataUrl = "dataUrl" in props ? normalizeImport(props.dataUrl) ?? "" : "";

  const avatarUrl = normalizeImport(p?.avatarUrl) ?? "";
  const avatarPath = normalizeImport(p?.avatarPath) ?? "";
  const avatarDataUrl = normalizeImport(p?.avatarDataUrl) ?? "";

  const dataUrlLooksHuge =
    avatarDataUrl.startsWith("data:image/") && avatarDataUrl.length > 200_000;

  const rawImg = React.useMemo(() => {
    if (propDataUrl) return propDataUrl; // preview explicite (souvent blob:)
    if (avatarUrl) return avatarUrl;     // ✅ Supabase doit gagner
    if (avatarPath) return avatarPath;   // peut être /assets/... ou relatif maintenant
    if (avatarDataUrl && !dataUrlLooksHuge) return avatarDataUrl;
    return null;
  }, [propDataUrl, avatarUrl, avatarPath, avatarDataUrl, dataUrlLooksHuge]);

  const [imgBroken, setImgBroken] = React.useState(false);

  React.useEffect(() => {
    setImgBroken(false);
  }, [rawImg]);

  const img = React.useMemo(() => {
    const normalized = normalizeSrc(rawImg);
    if (!normalized) return null;

    // ✅ salt stable si avatarUpdatedAt existe
    const salt =
      (p && typeof (p as any).avatarUpdatedAt === "number" && String((p as any).avatarUpdatedAt)) ||
      (typeof rawImg === "string" ? String(rawImg).slice(-24) : "") ||
      String(Date.now());

    return withCacheBust(normalized, salt);
  }, [rawImg, p]);

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
      const all = getDartSetsForProfile(String(profileId)) || [];

      if (props.dartSetId) {
        const forced = all.find((s) => s.id === props.dartSetId);
        if (forced) {
          setDartSet(forced);
          return;
        }
      }

      const fav = getFavoriteDartSetForProfile(String(profileId));
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
