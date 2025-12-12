// ============================================
// src/lib/x01SfxV3.ts
// X01 V3 - Sons (public/sounds) + Voix (TTS)
// Règles:
// - dart-hit: chaque dart validé
// - double / triple: dès qu'un dart D/T est validé
// - bull / dbull: dès qu'un dart touche 25 / 50
// - 180: fin de volée si score=180 avec 3 darts
// - bust: à chaque bust
// - victoire: fin de match + voix classement
// ============================================

export type DartLike = any;

type SfxKey =
  | "dart_hit"
  | "double"
  | "triple"
  | "bull"
  | "dbull"
  | "score_180"
  | "bust"
  | "victory";

const SFX_URL: Record<SfxKey, string> = {
  dart_hit: "/sounds/dart-hit.mp3",
  double: "/sounds/double.mp3",
  triple: "/sounds/triple.mp3",
  bull: "/sounds/bull.mp3",
  dbull: "/sounds/doublebull.mp3",
  score_180: "/sounds/180.mp3",
  bust: "/sounds/bust.mp3",
  victory: "/sounds/victory.mp3",
};

let ENABLED = true;
let VOICE_ENABLED = true;
let VOLUME = 0.9;

// anti-spam par clé
const last: Record<string, number> = {};
const cache: Partial<Record<SfxKey, HTMLAudioElement>> = {};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function getAudio(key: SfxKey) {
  if (cache[key]) return cache[key]!;
  const a = new Audio(SFX_URL[key]);
  a.preload = "auto";
  cache[key] = a;
  return a;
}

export function x01SfxV3Configure(opts: { enabled?: boolean; voiceEnabled?: boolean; volume?: number }) {
  if (typeof opts.enabled === "boolean") ENABLED = opts.enabled;
  if (typeof opts.voiceEnabled === "boolean") VOICE_ENABLED = opts.voiceEnabled;
  if (typeof opts.volume === "number") VOLUME = clamp01(opts.volume);
}

export function x01SfxV3Preload() {
  (Object.keys(SFX_URL) as SfxKey[]).forEach((k) => {
    try {
      getAudio(k);
    } catch {}
  });
}

export async function x01PlaySfxV3(key: SfxKey, opts?: { volume?: number; rateLimitMs?: number }) {
  if (!ENABLED) return;
  const now = Date.now();
  const rl = opts?.rateLimitMs ?? 80;
  if (last[key] && now - last[key] < rl) return;
  last[key] = now;

  try {
    const base = getAudio(key);
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = clamp01(opts?.volume ?? VOLUME);
    await node.play();
  } catch {
    // autoplay bloqué -> ignore
  }
}

// --------- Détection flexible (compatible avec plusieurs shapes) ---------

function normStr(x: any) {
  return (x ?? "").toString().trim().toUpperCase();
}

/**
 * Déduit (mult, value) depuis plusieurs formats possibles :
 * - { mult: "S"|"D"|"T", num: 20 } ou { number:20, multiplier:3 }
 * - { segment:"T20" } / "D25" etc
 * - { ring:"T", value:20 } ...
 */
export function parseDart(d: DartLike): { mult: "S" | "D" | "T"; value: number } {
  // 1) format direct mult/num
  const mult1 = normStr(d?.mult || d?.ring || d?.m);
  const num1 = Number(d?.num ?? d?.number ?? d?.value);

  if ((mult1 === "S" || mult1 === "D" || mult1 === "T") && Number.isFinite(num1)) {
    return { mult: mult1 as any, value: num1 };
  }

  // 2) multiplier 1/2/3
  const mul = Number(d?.multiplier);
  if ((mul === 1 || mul === 2 || mul === 3) && Number.isFinite(num1)) {
    return { mult: mul === 3 ? "T" : mul === 2 ? "D" : "S", value: num1 };
  }

  // 3) segment string "T20", "D16", "S25", "DBULL", etc
  const seg = normStr(d?.segment || d?.seg || d?.code);
  if (seg) {
    if (seg === "DBULL" || seg === "DOUBLEBULL") return { mult: "D", value: 25 }; // 50
    if (seg === "BULL" || seg === "SBULL") return { mult: "S", value: 25 };
    const m = seg[0];
    const rest = Number(seg.slice(1));
    if ((m === "S" || m === "D" || m === "T") && Number.isFinite(rest)) {
      return { mult: m as any, value: rest };
    }
  }

  // fallback
  return { mult: "S", value: Number.isFinite(num1) ? num1 : 0 };
}

export function isBull(d: DartLike) {
  const p = parseDart(d);
  // bull simple = 25 (S)
  // dbull = 50 (D25)
  return p.value === 25 && p.mult === "S";
}
export function isDBull(d: DartLike) {
  const p = parseDart(d);
  return p.value === 25 && p.mult === "D";
}
export function isDouble(d: DartLike) {
  return parseDart(d).mult === "D";
}
export function isTriple(d: DartLike) {
  return parseDart(d).mult === "T";
}

// --------- Voix (TTS) ---------

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const fr =
    voices.find((v) => /fr/i.test(v.lang) && /google|microsoft|apple|siri/i.test(v.name)) ||
    voices.find((v) => /fr/i.test(v.lang)) ||
    null;
  return fr;
}

export function x01SpeakV3(text: string, opts?: { rate?: number; pitch?: number; volume?: number }) {
  if (!VOICE_ENABLED) return;
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = pickFrenchVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || "fr-FR";
    u.rate = opts?.rate ?? 1.02;
    u.pitch = opts?.pitch ?? 1.0;
    u.volume = clamp01(opts?.volume ?? VOLUME);

    // évite empilement de phrases
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {}
}

export function announceVisit(playerName: string, visitScore: number) {
  const n = (playerName || "").trim();
  if (!n) return;
  x01SpeakV3(`${n}, ${visitScore}`);
}

export function announceEndGame(opts: {
  winnerName: string;
  rankingNames: string[]; // ["Alice","Bob","Chris"]
  extra?: string; // ex: "Score final deux sets à un"
}) {
  const w = (opts.winnerName || "").trim();
  const rk = (opts.rankingNames || []).filter(Boolean);

  const parts: string[] = [];
  if (w) parts.push(`Victoire de ${w}.`);
  if (opts.extra) parts.push(opts.extra);

  if (rk.length) {
    const places = rk
      .slice(0, 6)
      .map((name, i) => `${i + 1}, ${name}`)
      .join(". ");
    parts.push(`Classement. ${places}.`);
  }

  const text = parts.join(" ");
  if (text.trim()) x01SpeakV3(text);
}
