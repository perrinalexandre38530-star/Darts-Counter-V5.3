// ============================================
// src/main.tsx — Entrée principale Cloudflare + React + Tailwind
// - PROD : enregistre uniquement /sw.js (non-module), auto-update + auto-reload
// - DEV  : désenregistre tous les Service Workers + purge caches
// ✅ NEW: BOOT CRASH SCREEN (capture crash avant rendu React)
// ============================================
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// ✅ Mode Online : Provider d'auth globale
import { AuthOnlineProvider } from "./hooks/useAuthOnline";

/* ============================================================
   ✅ BOOT CRASH SCREEN (avant React)
============================================================ */
function bootCrashScreen(payload: any) {
  const format = (e: any) => {
    try {
      if (!e) return "Erreur inconnue";
      if (typeof e === "string") return e;
      if (e?.stack) return String(e.stack);
      if (e?.message) return String(e.message);
      return JSON.stringify(e, null, 2);
    } catch {
      return String(e);
    }
  };

  const msg = format(payload);

  try {
    localStorage.setItem(
      "dc_last_boot_crash_v1",
      JSON.stringify({ at: Date.now(), msg }, null, 2)
    );
  } catch {}

  const el = document.getElementById("root") || document.body;
  el.innerHTML = `
    <div style="
      min-height:100vh;
      padding:14px;
      background:#0b0b10;
      color:#fff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
      <div style="font-size:18px;font-weight:900;margin-bottom:10px;">💥 CRASH CAPTURÉ (BOOT)</div>
      <div style="opacity:.85;font-size:13px;margin-bottom:10px;">Fais une capture de cet écran et envoie-la.</div>
      <pre style="
        white-space:pre-wrap;
        word-break:break-word;
        background:rgba(255,255,255,.06);
        padding:12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.12);">${msg}</pre>
      <button onclick="location.reload()" style="
        margin-top:10px;
        border-radius:999px;
        padding:10px 12px;
        border:none;
        font-weight:900;
        background:linear-gradient(180deg,#ffc63a,#ffaf00);
        color:#1b1508;
        cursor:pointer;">Recharger</button>
    </div>
  `;
}

function installGlobalHandlers() {
  window.addEventListener("error", (e: any) => {
    // On log, mais on n’écrase pas l’UI ici (React peut gérer ensuite)
    console.error("[window.error]", e?.error || e);
  });

  window.addEventListener("unhandledrejection", (e: any) => {
    console.error("[unhandledrejection]", e?.reason || e);
  });
}

installGlobalHandlers();

/* ---------- Service Worker policy ---------- */
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    // Production (Cloudflare Pages) — enregistre /sw.js
    window.addEventListener("load", async () => {
      try {
        // 1) Désenregistre tout SW hérité (ex: /service-worker.js)
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs
            .filter((r) => !r.active?.scriptURL.endsWith("/sw.js"))
            .map((r) => r.unregister().catch(() => {}))
        );

        // 2) Enregistre le SW unique
        const reg = await navigator.serviceWorker.register("/sw.js"); // chemin ABSOLU

        // 3) Si une nouvelle version est trouvée → on force skipWaiting
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw?.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              reg.waiting?.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // 4) Quand le contrôleur change (nouvelle version active) → reload
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });

        console.log("✅ Service Worker enregistré :", reg.scope);
      } catch (err) {
        console.warn("⚠️ SW register error", err);
      }
    });
  } else {
    // Développement / StackBlitz — jamais de SW persistant
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
    if (typeof caches !== "undefined" && (caches as any).keys) {
      (caches as any).keys().then((keys: string[]) => keys.forEach((k) => caches.delete(k)));
    }
  }

  // ===== DEBUG: exposer un dump du store dans la console =====
  (async () => {
    (window as any).dumpStore = async () => {
      const { loadStore } = await import("./lib/storage");
      const s = await loadStore<any>();
      console.log("STORE =", s);
      console.log("statsByPlayer =", s?.statsByPlayer);
      console.log(
        "Dernier summary =",
        Array.isArray(s?.history) ? s.history[s.history.length - 1]?.summary : undefined
      );
      return s;
    };
  })();
}

/* ---------- Point d’entrée React (✅ import dynamique pour catch crash) ---------- */
(async () => {
  try {
    const container = document.getElementById("root");
    if (!container) throw new Error("❌ Élément #root introuvable dans index.html");

    // IMPORTANT: import dynamique => si ./App plante à l’import, on catch ici
    const mod = await import("./App");
    const AppRoot = mod.default;

    createRoot(container).render(
      <React.StrictMode>
        {/* 🌐 Contexte Mode Online pour toute l'app */}
        <AuthOnlineProvider>
          <AppRoot />
        </AuthOnlineProvider>
      </React.StrictMode>
    );
  } catch (e) {
    console.error("[BOOT CRASH]", e);
    bootCrashScreen(e);
  }
})();
