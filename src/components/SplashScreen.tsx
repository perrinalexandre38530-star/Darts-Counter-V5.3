// ============================================
// src/components/SplashScreen.tsx  (WEB / React)
// ✅ Durée configurable (peut être < 16s)
// ✅ Animation continue (breathe + glow + scanlines + pixels + glitch visuel)
// ✅ Audio: splash_jingle.mp3 (best-effort, autoplay parfois bloqué)
// ✅ Audio "débordant": NE COUPE PAS le son à la fin du splash (continue sur Home)
// ✅ Transition: fade-out visuel sur la fin
// ============================================

import React from "react";

// ⚠️ Depuis src/components -> ../assets
import AppLogo from "../assets/LOGO.png";
import SplashJingle from "../assets/audio/splash_jingle.mp3";

type Props = {
  onFinish: () => void;

  /**
   * durée totale du splash (ms)
   * - si tu veux court: 4500..8000
   * - défaut: 6500 (plus agréable + laisse le jingle dépasser sur Home)
   */
  durationMs?: number;

  /**
   * durée du fade-out visuel (ms) avant onFinish
   * (audio continue)
   */
  fadeOutMs?: number;

  /**
   * si true: l'audio continue après le splash
   * si false: on coupe le son à la fin
   */
  allowAudioOverflow?: boolean;
};

export default function SplashScreen({
  onFinish,
  durationMs = 6500,
  fadeOutMs = 700,
  allowAudioOverflow = true,
}: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const aliveRef = React.useRef(true);

  const [glitchOn, setGlitchOn] = React.useState(false);
  const [pixelSeed, setPixelSeed] = React.useState(0);

  // ✅ fade-out visuel en fin de splash
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    aliveRef.current = true;

    // 🔊 Play jingle (best effort)
    const a = audioRef.current;
    if (a) {
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
      } catch {}
    }

    // 🎞️ Glitch visuel régulier + refresh particules
    const loopGlitch = () => {
      if (!aliveRef.current) return;

      setPixelSeed((x) => (x + 1) % 1000000);

      // toutes les ~1.0..1.7s : petit glitch
      const jitter = 900 + Math.random() * 800;
      window.setTimeout(() => {
        if (!aliveRef.current) return;
        setGlitchOn(true);
        window.setTimeout(() => {
          if (!aliveRef.current) return;
          setGlitchOn(false);
        }, 160);
        loopGlitch();
      }, jitter);
    };
    loopGlitch();

    const total = Math.max(1200, Number(durationMs) || 0);
    const fade = Math.max(0, Math.min(1500, Number(fadeOutMs) || 0));
    const startFadeAt = Math.max(0, total - fade);

    // ✅ déclenche le fade visuel
    const tFade = window.setTimeout(() => {
      if (!aliveRef.current) return;
      setLeaving(true);
    }, startFadeAt);

    // ✅ fin splash
    const tDone = window.setTimeout(() => {
      if (!aliveRef.current) return;
      onFinish();
    }, total);

    return () => {
      aliveRef.current = false;
      window.clearTimeout(tFade);
      window.clearTimeout(tDone);

      // ✅ IMPORTANT: si allowAudioOverflow = true, on NE coupe PAS le son
      if (!allowAudioOverflow) {
        try {
          const aa = audioRef.current;
          if (aa) {
            aa.pause();
            aa.currentTime = 0;
          }
        } catch {}
      }
    };
  }, [onFinish, durationMs, fadeOutMs, allowAudioOverflow]);

  // ✨ Particules “pixels” (24 petits carrés qui montent en boucle)
  const pixels = React.useMemo(() => {
    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    return new Array(24).fill(0).map((_, i) => {
      const left = rand(10, 90); // %
      const size = rand(3, 7); // px
      const delay = rand(0, 2.8); // s
      const dur = rand(2.6, 5.2); // s
      const drift = rand(-30, 30); // px
      const op = rand(0.06, 0.18);
      return { i, left, size, delay, dur, drift, op };
    });
  }, [pixelSeed]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1200px 700px at 50% 35%, rgba(255,70,200,.12), rgba(0,0,0,0) 60%), linear-gradient(180deg, #07070b, #0b0b12 45%, #07070b)",
        overflow: "hidden",
        position: "relative",

        // ✅ fade-out visuel
        opacity: leaving ? 0 : 1,
        transform: leaving ? "scale(1.03)" : "scale(1.0)",
        filter: leaving ? "blur(1.2px)" : "none",
        transition: `opacity ${fadeOutMs}ms ease, transform ${fadeOutMs}ms ease, filter ${fadeOutMs}ms ease`,
      }}
    >
      {/* 🔊 Audio (ton fichier existant) */}
      <audio ref={audioRef} src={SplashJingle} preload="auto" />

      {/* Scanlines */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(180deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)",
          opacity: 0.08,
          mixBlendMode: "overlay",
        }}
      />

      {/* Overlay “glitch” */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity: glitchOn ? 1 : 0,
          transition: "opacity 120ms ease-out",
          background:
            "linear-gradient(90deg, rgba(255,0,180,.18), rgba(0,255,220,.10), rgba(255,180,0,.14))",
          mixBlendMode: "overlay",
          filter: "contrast(1.2) saturate(1.2)",
        }}
      />

      {/* Particules pixels derrière le logo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {pixels.map((p) => (
          <div
            key={p.i}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              bottom: -20,
              width: p.size,
              height: p.size,
              borderRadius: 2,
              background: "rgba(255,255,255,1)",
              opacity: p.op,
              filter: "blur(.15px)",
              transform: `translateX(${p.drift}px)`,
              animation: `dcPixelFloat ${p.dur}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Wrapper Logo */}
      <div
        style={{
          position: "relative",
          width: 260,
          height: 260,
          transform: glitchOn ? "translateX(-2px) skewX(-2deg)" : "translateX(0) skewX(0)",
          transition: "transform 120ms ease-out",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            inset: -46,
            borderRadius: "999px",
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,180,0,.20), rgba(255,70,200,.12), rgba(0,0,0,0) 62%)",
            filter: "blur(14px)",
            animation: "dcGlowBreath 2.8s ease-in-out infinite",
            opacity: 0.75,
          }}
        />

        {/* Halo ring */}
        <div
          style={{
            position: "absolute",
            inset: -16,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: "0 0 22px rgba(255,180,0,.12), 0 0 28px rgba(255,70,200,.10)",
            animation: "dcRingBreath 2.8s ease-in-out infinite",
            opacity: 0.85,
          }}
        />

        {/* Logo */}
        <img
          src={AppLogo}
          alt="Darts Counter"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            userSelect: "none",
            WebkitUserSelect: "none",
            filter: glitchOn
              ? "drop-shadow(0 16px 40px rgba(0,0,0,.60)) hue-rotate(12deg) saturate(1.12)"
              : "drop-shadow(0 16px 40px rgba(0,0,0,.60))",
            animation: "dcLogoBreath 2.8s ease-in-out infinite",
          }}
        />

        {/* Spark center */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 10,
            height: 10,
            borderRadius: 999,
            transform: "translate(-50%,-50%)",
            boxShadow: "0 0 0 0 rgba(255,200,80,0), 0 0 0 0 rgba(255,80,210,0)",
            animation: "dcSparkPulse 2.8s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 12.5,
          letterSpacing: 0.6,
          opacity: 0.72,
          color: "rgba(255,255,255,.92)",
          textShadow: "0 2px 18px rgba(0,0,0,.65)",
        }}
      >
        Chargement…
      </div>

      {/* Keyframes */}
      <style>
        {`
          @keyframes dcLogoBreath {
            0%   { transform: scale(0.98); opacity: .96; }
            50%  { transform: scale(1.02); opacity: 1; }
            100% { transform: scale(0.98); opacity: .96; }
          }

          @keyframes dcGlowBreath {
            0%   { transform: scale(0.96); opacity: .55; }
            50%  { transform: scale(1.04); opacity: .92; }
            100% { transform: scale(0.96); opacity: .55; }
          }

          @keyframes dcRingBreath {
            0%   { transform: scale(0.98); opacity: .55; }
            50%  { transform: scale(1.02); opacity: .95; }
            100% { transform: scale(0.98); opacity: .55; }
          }

          @keyframes dcSparkPulse {
            0%   { opacity: .15; box-shadow: 0 0 0 6px rgba(255,200,80,.06), 0 0 0 10px rgba(255,80,210,.04); }
            50%  { opacity: .70; box-shadow: 0 0 0 16px rgba(255,200,80,.10), 0 0 0 24px rgba(255,80,210,.08); }
            100% { opacity: .15; box-shadow: 0 0 0 6px rgba(255,200,80,.06), 0 0 0 10px rgba(255,80,210,.04); }
          }

          @keyframes dcPixelFloat {
            0%   { transform: translateY(0) translateX(0); opacity: .0; }
            10%  { opacity: 1; }
            70%  { opacity: 1; }
            100% { transform: translateY(-120vh) translateX(0); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}
