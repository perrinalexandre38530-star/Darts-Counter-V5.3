// ============================================
// src/lib/sfx.ts — Gestion centralisée des sons
// SONS DE BASE servis depuis /public/sounds (Vite)
// + Shanghai servis depuis src/assets/sounds (Vite import)
// + Cache/pool Audio + unlock autoplay
// + ✅ UI clicks (click / soft / confirm) servis depuis /public/sounds
// ============================================

let SFX_ENABLED = true;

export function setSfxEnabled(v: boolean) {
  SFX_ENABLED = !!v;
}

// ✅ Shanghai: fichiers DANS src/assets/sounds/
import shanghaiIntroUrl from "../assets/sounds/shanghai.mp3";
import shanghaiMissUrl from "../assets/sounds/shanghai-miss.mp3";

// 🔊 URLs publiques (public/sounds) + URLs assets (import)
const SFX = {
  // Base (public/sounds)
  hit: "/sounds/dart-hit.mp3",
  bust: "/sounds/bust.mp3",
  "180": "/sounds/180.mp3",
  dble: "/sounds/double.mp3",
  trpl: "/sounds/triple.mp3",
  bull: "/sounds/bull.mp3",
  dbull: "/sounds/double-bull.mp3",

  // ✅ UI clicks (public/sounds)
  uiClick: "/sounds/ui-click.mp3",
  uiClickSoft: "/sounds/ui-click-soft.mp3",
  uiConfirm: "/sounds/ui-confirm.mp3",

  // Shanghai (assets import)
  shanghai: shanghaiIntroUrl,
  shanghaiMiss: shanghaiMissUrl,
} as const;

type SfxKey = keyof typeof SFX;

/**
 * ✅ Petit pool Audio pour éviter le lag et permettre chevauchements légers.
 * - On garde plusieurs instances par son
 * - On recycle la première qui est libre, sinon on clone
 */
const POOL_MAX_PER_URL = 4;
const pool = new Map<string, HTMLAudioElement[]>();

function getFromPool(url: string) {
  let list = pool.get(url);
  if (!list) {
    list = [];
    pool.set(url, list);
  }

  // 1) si une instance est disponible (paused/ended), on la reprend
  for (const a of list) {
    if (a.paused || a.ended) return a;
  }

  // 2) sinon on clone si on peut
  if (list.length < POOL_MAX_PER_URL) {
    const a = new Audio(url);
    a.preload = "auto";
    a.volume = 0.9;
    list.push(a);
    return a;
  }

  // 3) sinon on recycle la première
  return list[0];
}

/**
 * ✅ IMPORTANT (autoplay mobile):
 * appelle ça sur un vrai geste utilisateur (clic "LANCER LA PARTIE").
 * Ça "débloque" souvent l'audio HTML5.
 */
export async function unlockAudio() {
  if (!SFX_ENABLED) return;

  try {
    // On tente un play ultra court en muet, puis pause.
    const url = SFX.hit; // un son garanti en public
    const a = getFromPool(url);
    a.muted = true;
    a.currentTime = 0;

    const p = a.play();
    if (p && typeof (p as any).then === "function") {
      await p;
    }

    a.pause();
    a.currentTime = 0;
    a.muted = false;
  } catch {
    // Si le navigateur refuse encore, pas grave : ça se débloquera au 1er vrai play après geste.
  }
}

function playSafeUrl(url?: string, vol = 0.9) {
  if (!url || !SFX_ENABLED) return;

  try {
    const a = getFromPool(url);
    a.volume = vol;
    a.currentTime = 0;

    const p = a.play();
    if (p && typeof (p as any).catch === "function") {
      p.catch(() => {});
    }
  } catch {
    // ignore
  }
}

/** Joue un son par clé */
export function playSfx(key: SfxKey) {
  playSafeUrl(SFX[key]);
}

/** Son d'impact standard (TOUS MODES) */
export function playThrowSound(dart: { mult: number; value: number }) {
  const { mult, value } = dart;
  if (value === 25 && mult === 2) return playSfx("dbull");
  if (value === 25 && mult === 1) return playSfx("bull");
  if (mult === 3) return playSfx("trpl");
  if (mult === 2) return playSfx("dble");
  return playSfx("hit");
}

/** Utilitaire safe depuis UIDart */
export function playImpactFromDart(
  dart?: { mult?: number; value?: number } | null
) {
  if (!dart) return;
  playThrowSound({
    mult: Number(dart.mult ?? 1),
    value: Number(dart.value ?? 0),
  });
}

/** Son MISS (Shanghai uniquement) */
export function playShanghaiMiss() {
  playSfx("shanghaiMiss");
}

/** Son ambiance au début de Shanghai */
export function playShanghaiIntro() {
  playSfx("shanghai");
}

/** Son spécial 180 */
export function playOneEighty(total: number) {
  if (total === 180) playSfx("180");
}

/** Son de bust */
export function playBust(isBust: boolean) {
  if (isBust) playSfx("bust");
}

/* ============================================================
   ✅ UI CLICKS — centralisés dans le même moteur/pool
   Utilise-les dans tes boutons/cards/pills/keypad
============================================================ */

/** Click standard (bouton principal, CTA) */
export function playUiClick() {
  // un peu plus bas que les impacts
  playSafeUrl(SFX.uiClick, 0.55);
}

/** Click soft (pills / toggles / chips) */
export function playUiClickSoft() {
  playSafeUrl(SFX.uiClickSoft, 0.45);
}

/** Confirm (validation / save / quitter) */
export function playUiConfirm() {
  playSafeUrl(SFX.uiConfirm, 0.65);
}

/** Alias pratique (si tu veux importer un objet) */
export const UISfx = {
  click: playUiClick,
  soft: playUiClickSoft,
  confirm: playUiConfirm,
};
