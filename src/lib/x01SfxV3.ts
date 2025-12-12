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
// - ✅ Langue dynamique : la voix + u.lang suivent la langue app (fr/it/en/es/...)
//   -> via x01SfxV3Configure({ ttsLang: "fr" | "fr-FR" | "it" | "it-IT" ...})
// ============================================

export type DartLike = any;

export type SfxKey =
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

// ✅ langue TTS courante (doit suivre la langue app)
let TTS_LANG = "fr-FR";

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
      const AC =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = (window as any).__dcAudioCtx || new AC();
        (window as any).__dcAudioCtx = ctx;
        if (ctx.state === "suspended") ctx.resume?.();
      }

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

function normalizeLang(input?: string | null): string {
  const raw = (input || "").trim();
  if (!raw) return "fr-FR";

  const lower = raw.toLowerCase();

  const mapShort: Record<string, string> = {
    fr: "fr-FR",
    en: "en-US",
    it: "it-IT",
    es: "es-ES",
    de: "de-DE",
    nl: "nl-NL",
    pt: "pt-PT",
  };

  if (mapShort[lower]) return mapShort[lower];

  // si déjà au format "xx-YY"
  if (/^[a-z]{2}-[a-z]{2}$/i.test(raw)) return raw;

  return raw;
}

export function x01SfxV3Configure(opts: {
  enabled?: boolean;
  voiceEnabled?: boolean;
  volume?: number;
  ttsLang?: string; // ✅ NOUVEAU
}) {
  if (typeof opts.enabled === "boolean") ENABLED = opts.enabled;
  if (typeof opts.voiceEnabled === "boolean") VOICE_ENABLED = opts.voiceEnabled;
  if (typeof opts.volume === "number") VOLUME = clamp01(opts.volume);
  if (typeof opts.ttsLang === "string") TTS_LANG = normalizeLang(opts.ttsLang);
}

export function x01SfxV3Preload() {
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
 * - { mult:"S"|"D"|"T", num:20 } ou { number:20, multiplier:3 }
 * - { segment:"T20" } / "D25" etc
 * - { ring:"T", value:20 } ...
 */
export function parseDart(
  d: DartLike
): { mult: "S" | "D" | "T"; value: number } {
  const mult1 = normStr(d?.mult || d?.ring || d?.m);
  const num1 = Number(d?.num ?? d?.number ?? d?.value);

  if (
    (mult1 === "S" || mult1 === "D" || mult1 === "T") &&
    Number.isFinite(num1)
  ) {
    return { mult: mult1 as any, value: num1 };
  }

  const mul = Number(d?.multiplier);
  if ((mul === 1 || mul === 2 || mul === 3) && Number.isFinite(num1)) {
    return { mult: mul === 3 ? "T" : mul === 2 ? "D" : "S", value: num1 };
  }

  const seg = normStr(d?.segment || d?.seg || d?.code);
  if (seg) {
    if (seg === "DBULL" || seg === "DOUBLEBULL") return { mult: "D", value: 25 };
    if (seg === "BULL" || seg === "SBULL") return { mult: "S", value: 25 };
    const m = seg[0];
    const rest = Number(seg.slice(1));
    if ((m === "S" || m === "D" || m === "T") && Number.isFinite(rest)) {
      return { mult: m as any, value: rest };
    }
  }

  return { mult: "S", value: Number.isFinite(num1) ? num1 : 0 };
}

export function isBull(d: DartLike) {
  const p = parseDart(d);
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
// Voix (TTS) — support voiceId + langue dynamique
// =====================================================

function dcPickSpeechVoice(
  voiceId?: string,
  lang?: string
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const synth = window.speechSynthesis;
  const voices = synth?.getVoices?.() || [];
  if (!voices.length) return null;

  const wanted = normalizeLang(lang || TTS_LANG);
  const base = wanted.split("-")[0].toLowerCase(); // "fr", "it", "en", ...

  const idRaw = (voiceId || "").toString().trim().toLowerCase();

  const wantRobot = /robot|android|cyborg|synthetic|synth/i.test(idRaw);
  const wantMale =
    /(^|\W)(male|man|homme|masc|masculin|uomo|hombre|varón|männlich|mann|maschio|erkek|muž|férfi|bărbat|муж|男)(\W|$)/i.test(
      idRaw
    );
  const wantFemale =
    /(^|\W)(female|woman|femme|fem|féminin|donna|mujer|weiblich|frau|femmina|kadın|žena|nő|femeie|жен|女)(\W|$)/i.test(
      idRaw
    );

  // 1) ✅ PRIORITÉ ABSOLUE : match exact (voiceURI / name)
  if (idRaw) {
    const exact =
      voices.find((v) => (v.voiceURI || "").toLowerCase() === idRaw) ||
      voices.find((v) => (v.name || "").toLowerCase() === idRaw);
    if (exact) return exact;
  }

  // 2) ✅ Filtrer par langue (on privilégie "base", puis fallback sur "wanted" complet)
  const langVoices = voices.filter((v) =>
    (v.lang || "").toLowerCase().startsWith(base)
  );

  const pool = langVoices.length ? langVoices : voices;

  // 3) ✅ Heuristiques multi-langues (mots-clés + prénoms fréquents)
  const femaleKeywords = [
    "female", "woman", "femme", "mujer", "donna", "frau", "weiblich",
    "femmina", "kadın", "žena", "nő", "femeie", "жен", "女",
  ];
  const maleKeywords = [
    "male", "man", "homme", "hombre", "uomo", "mann", "männlich",
    "maschio", "erkek", "muž", "férfi", "bărbat", "муж", "男",
  ];
  const robotKeywords = ["robot", "android", "cyborg", "synthetic", "synth", "tts"];

  // Mini-dicos de prénoms “souvent présents dans les noms de voix”.
  // (Ça ne doit pas être parfait : c’est juste un bonus de score)
  const maleNamesByLang: Record<string, string[]> = {
    en: ["alex", "daniel", "thomas", "john", "michael", "david", "mark"],
    fr: ["thomas", "nicolas", "pierre", "jean", "paul", "michel", "antoine"],
    it: ["diego", "luca", "marco", "paolo", "giovanni", "alessandro"],
    es: ["carlos", "jorge", "juan", "pablo", "diego", "miguel"],
    de: ["hans", "peter", "wolfgang", "markus", "thomas", "johann"],
    pt: ["joão", "joao", "miguel", "carlos", "pedro"],
    nl: ["daan", "jan", "pieter", "willem"],
    ru: ["алекс", "алексей", "иван", "сергей", "dmitry", "dimitri"],
    tr: ["mehmet", "ali", "ahmet"],
    pl: ["jan", "piotr", "adam"],
    // autres langues : pas grave si vide -> pas de bonus prénoms
  };

  const femaleNamesByLang: Record<string, string[]> = {
    en: ["samantha", "victoria", "emma", "susan", "kate", "lily", "olivia"],
    fr: ["julie", "marie", "sophie", "camille", "léa", "lea", "emma"],
    it: ["elsa", "giulia", "sofia", "chiara", "francesca"],
    es: ["lucia", "sofia", "carmen", "maria", "maría", "laura"],
    de: ["anna", "lena", "sophie", "julia", "maria"],
    pt: ["maria", "ana", "joana", "sofia"],
    nl: ["emma", "sophie", "lisa"],
    ru: ["анна", "мария", "елена", "olga", "irina"],
    tr: ["ayşe", "ayse", "fatma", "elif"],
    pl: ["anna", "katarzyna", "magda"],
  };

  const bonusMaleNames = maleNamesByLang[base] || [];
  const bonusFemaleNames = femaleNamesByLang[base] || [];

  const scoreVoice = (v: SpeechSynthesisVoice) => {
    const name = (v.name || "").toLowerCase();
    const uri = (v.voiceURI || "").toLowerCase();
    const vLang = (v.lang || "").toLowerCase();

    let s = 0;

    // Langue : gros poids
    if (vLang.startsWith(base)) s += 120;
    if (vLang === wanted.toLowerCase()) s += 25;

    // Qualité
    if (/google|microsoft|apple|siri|nuance|ivona|amazon/i.test(name)) s += 10;

    // Robot
    if (wantRobot) {
      if (robotKeywords.some((k) => name.includes(k) || uri.includes(k))) s += 30;
    }

    // Genre demandé
    if (wantMale || wantFemale) {
      const hasMale =
        maleKeywords.some((k) => name.includes(k) || uri.includes(k)) ||
        bonusMaleNames.some((n) => name.includes(n));
      const hasFemale =
        femaleKeywords.some((k) => name.includes(k) || uri.includes(k)) ||
        bonusFemaleNames.some((n) => name.includes(n));

      if (wantMale) {
        if (hasMale) s += 60;
        if (hasFemale) s -= 60;
      }
      if (wantFemale) {
        if (hasFemale) s += 60;
        if (hasMale) s -= 60;
      }
    }

    return s;
  };

  // 4) ✅ Best score
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;

  for (const v of pool) {
    const sc = scoreVoice(v);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }

  return best || pool[0] || null;
}

function dcSpeak(
  text: string,
  opts?: {
    voiceId?: string;
    robot?: boolean;
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string; // ✅ NOUVEAU
  }
) {
  if (!VOICE_ENABLED) return;
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  if (!synth) return;

  try {
    synth.cancel();
  } catch {}

  try {
    const u = new SpeechSynthesisUtterance(text);

    const chosenLang = normalizeLang(opts?.lang || TTS_LANG);
    const v = dcPickSpeechVoice(opts?.voiceId, chosenLang);
    if (v) u.voice = v;

    // ✅ IMPORTANT : lang = langue app
    u.lang = chosenLang;

    const isRobot =
      !!opts?.robot ||
      (!!opts?.voiceId && String(opts.voiceId).toLowerCase().includes("robot"));

    u.rate = opts?.rate ?? (isRobot ? 0.95 : 1.02);
    u.pitch = opts?.pitch ?? (isRobot ? 0.65 : 1.0);
    u.volume = clamp01(opts?.volume ?? VOLUME);

    synth.speak(u);
  } catch {}
}

// API publique
export function x01SpeakV3(
  text: string,
  opts?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceId?: string;
    robot?: boolean;
    lang?: string; // ✅ NOUVEAU
  }
) {
  dcSpeak(text, {
    voiceId: opts?.voiceId,
    robot: opts?.robot,
    rate: opts?.rate,
    pitch: opts?.pitch,
    volume: opts?.volume,
    lang: opts?.lang,
  });
}

export function announceVisit(
  playerName: string,
  visitScore: number,
  options?: { voiceId?: string; lang?: string }
) {
  const n = (playerName || "").trim();
  if (!n) return;
  const vid = options?.voiceId;

  dcSpeak(`${n}, ${visitScore}`, {
    voiceId: vid,
    robot: !!vid && String(vid).toLowerCase().includes("robot"),
    lang: options?.lang,
  });
}

export function announceEndGame(
  data: {
    winnerName: string;
    rankingNames: string[];
    extra?: string;
  },
  options?: { voiceId?: string; lang?: string }
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
    lang: options?.lang,
  });
}
