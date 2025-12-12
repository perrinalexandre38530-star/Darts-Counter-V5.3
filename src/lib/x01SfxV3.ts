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
//
// FIXES intégrés :
// - Unlock audio (autoplay mobile/Chrome) : x01EnsureAudioUnlocked()
// - Voix réellement sélectionnable via voiceId (female/male/robot ou name/voiceURI)
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

// =====================================================
// 🔓 UNLOCK AUDIO (autoplay policies)
// =====================================================

let __dcAudioUnlocked = false;

export function x01EnsureAudioUnlocked() {
  if (typeof window === "undefined") return;
  if (__dcAudioUnlocked) return;

  const unlock = () => {
    try {
      // Déverrouille WebAudio si utilisé ailleurs (au cas où)
      const AC =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = (window as any).__dcAudioCtx || new AC();
        (window as any).__dcAudioCtx = ctx;
        if (ctx.state === "suspended") ctx.resume?.();
      }

      // Déverrouille aussi HTMLAudio (iOS/Chrome)
      const a = new Audio();
      a.muted = true;
      a.play().catch(() => {});
      a.pause();
    } catch {}

    __dcAudioUnlocked = true;

    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("mousedown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  // 1er geste user = unlock
  window.addEventListener("pointerdown", unlock, { once: true } as any);
  window.addEventListener("touchstart", unlock, { once: true } as any);
  window.addEventListener("mousedown", unlock, { once: true } as any);
  window.addEventListener("keydown", unlock, { once: true } as any);
}

// =====================================================
// SFX
// =====================================================

function getAudio(key: SfxKey) {
  if (cache[key]) return cache[key]!;
  const a = new Audio(SFX_URL[key]);
  a.preload = "auto";
  cache[key] = a;
  return a;
}

export function x01SfxV3Configure(opts: {
  enabled?: boolean;
  voiceEnabled?: boolean;
  volume?: number;
}) {
  if (typeof opts.enabled === "boolean") ENABLED = opts.enabled;
  if (typeof opts.voiceEnabled === "boolean") VOICE_ENABLED = opts.voiceEnabled;
  if (typeof opts.volume === "number") VOLUME = clamp01(opts.volume);
}

export function x01SfxV3Preload() {
  // 🔓 important : prépare l’unlock au 1er geste user
  x01EnsureAudioUnlocked();

  // ✅ warm-up voices (Chrome parfois vide au premier call)
  try {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.getVoices?.();
    }
  } catch {}

  (Object.keys(SFX_URL) as SfxKey[]).forEach((k) => {
    try {
      getAudio(k);
    } catch {}
  });
}

export async function x01PlaySfxV3(
  key: SfxKey,
  opts?: { volume?: number; rateLimitMs?: number }
) {
  // 🔓 important : s’assure que l’audio est déverrouillé
  x01EnsureAudioUnlocked();

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

  if (
    (mult1 === "S" || mult1 === "D" || mult1 === "T") &&
    Number.isFinite(num1)
  ) {
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
    if (seg === "DBULL" || seg === "DOUBLEBULL")
      return { mult: "D", value: 25 }; // 50
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

// =====================================================
// Voix (TTS) — support voiceId (female/male/robot ou name/voiceURI)
// =====================================================

function dcPickSpeechVoice(voiceId?: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  const voices = synth?.getVoices?.() || [];
  if (!voices.length) return null;

  if (!voiceId) {
    // fallback FR si pas de voiceId
    const fr =
      voices.find(
        (v) =>
          /fr/i.test(v.lang) &&
          /google|microsoft|apple|siri/i.test(v.name || "")
      ) ||
      voices.find((v) => /fr/i.test(v.lang)) ||
      null;
    return fr;
  }

  const id = String(voiceId).toLowerCase().trim();

  // match exact voiceURI / name
  const exact =
    voices.find((v) => (v.voiceURI || "").toLowerCase() === id) ||
    voices.find((v) => (v.name || "").toLowerCase() === id);
  if (exact) return exact;

  // heuristiques “femme/homme/robot”
  const isFemale =
    id.includes("female") || id.includes("femme") || id.includes("woman");
  const isMale = id.includes("male") || id.includes("homme") || id.includes("man");
  const isRobot = id.includes("robot");

  if (isFemale) {
    return (
      voices.find((v) => /female|woman|fem/i.test(v.name || "")) ||
      voices.find((v) => /fr/i.test(v.lang)) ||
      voices[0] ||
      null
    );
  }
  if (isMale) {
    return (
      voices.find((v) => /male|man/i.test(v.name || "")) ||
      voices.find((v) => /fr/i.test(v.lang)) ||
      voices[0] ||
      null
    );
  }

  // robot : on garde une voix FR si possible, mais le rendu “robot” se fait via pitch/rate
  if (isRobot) {
    return voices.find((v) => /fr/i.test(v.lang)) || voices[0] || null;
  }

  // défaut
  return voices.find((v) => /fr/i.test(v.lang)) || voices[0] || null;
}

function dcSpeak(
  text: string,
  opts?: { voiceId?: string; robot?: boolean; rate?: number; pitch?: number; volume?: number }
) {
  if (!VOICE_ENABLED) return;
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  if (!synth) return;

  try {
    // évite que le navigateur garde une ancienne voix
    synth.cancel();
  } catch {}

  try {
    const u = new SpeechSynthesisUtterance(text);

    const v = dcPickSpeechVoice(opts?.voiceId);
    if (v) u.voice = v;

    u.lang = v?.lang || "fr-FR";

    const isRobot = !!opts?.robot || (!!opts?.voiceId && String(opts.voiceId).toLowerCase().includes("robot"));

    // réglages
    u.rate = opts?.rate ?? (isRobot ? 0.95 : 1.02);
    u.pitch = opts?.pitch ?? (isRobot ? 0.65 : 1.0);
    u.volume = clamp01(opts?.volume ?? VOLUME);

    synth.speak(u);
  } catch {}
}

// API publique (si tu veux parler directement)
export function x01SpeakV3(
  text: string,
  opts?: { rate?: number; pitch?: number; volume?: number; voiceId?: string; robot?: boolean }
) {
  dcSpeak(text, {
    voiceId: opts?.voiceId,
    robot: opts?.robot,
    rate: opts?.rate,
    pitch: opts?.pitch,
    volume: opts?.volume,
  });
}

// ✅ annonceVisit supporte options.voiceId
export function announceVisit(
  playerName: string,
  visitScore: number,
  options?: { voiceId?: string }
) {
  const n = (playerName || "").trim();
  if (!n) return;
  const vid = options?.voiceId;

  dcSpeak(`${n}, ${visitScore}`, {
    voiceId: vid,
    robot: !!vid && String(vid).toLowerCase().includes("robot"),
  });
}

// ✅ announceEndGame supporte options.voiceId
export function announceEndGame(
  data: {
    winnerName: string;
    rankingNames: string[]; // ["Alice","Bob","Chris"]
    extra?: string; // ex: "Score final deux sets à un"
  },
  options?: { voiceId?: string }
) {
  const w = (data.winnerName || "").trim();
  const rk = (data.rankingNames || []).filter(Boolean);

  const parts: string[] = [];
  if (w) parts.push(`Victoire de ${w}.`);
  if (data.extra) parts.push(data.extra);

  if (rk.length) {
    const places = rk
      .slice(0, 6)
      .map((name, i) => `${i + 1}, ${name}`)
      .join(". ");
    parts.push(`Classement. ${places}.`);
  }

  const text = parts.join(" ").trim();
  if (!text) return;

  const vid = options?.voiceId;

  dcSpeak(text, {
    voiceId: vid,
    robot: !!vid && String(vid).toLowerCase().includes("robot"),
  });
}
