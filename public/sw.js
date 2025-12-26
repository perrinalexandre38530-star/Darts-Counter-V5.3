// /public/sw.js — PWA stable + auto-update + purge des vieux caches
// ✅ FIX CRASH: NE PAS CACHER .js/.css (chunks Vite hashés) via SW runtime cache
// -> évite "Aïe aïe aïe" quand un vieux chunk est servi après déploiement

const VERSION = "v2025-12-26-01"; // 🔁 INCRÉMENTE à chaque déploiement
const CACHE_STATIC = `dc-v5-static-${VERSION}`;

// 🔹 Shell/Assets à pré-cacher (icônes uniquement)
const ASSETS = ["/app-192.png", "/app-512.png"];

// Installe instantanément + pré-cache des assets statiques
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
});

// Prend le contrôle + purge TOUTES les anciennes versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_STATIC).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Permet de forcer l’activation dès qu’une nouvelle build est dispo
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Stratégies de réponse
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // On ne gère que le même origin
  if (url.origin !== self.location.origin) return;

  // ✅ IMPORTANT: laisser Vite/Cloudflare servir les chunks hashés (PAS de cache SW runtime)
  // - /assets/* = chunks Vite (js/css) + parfois images buildées
  if (url.pathname.startsWith("/assets/")) return;

  // ✅ Pareil: ne jamais intercepter les .js / .css (évite vieux bundles)
  if (/\.(js|css)$/i.test(url.pathname)) return;

  // 🔸 Navigation / HTML : NETWORK-FIRST (toujours la dernière build)
  const isDoc = req.mode === "navigate" || req.destination === "document";
  if (isDoc) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 🔸 Images / fonts / sons PUBLIC : cache-first OK (safe)
  const isMedia = /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i.test(url.pathname);
  const isSound = url.pathname.startsWith("/sounds/");

  if (isMedia || isSound) {
    event.respondWith(cacheFirstStatic(req));
    return;
  }

  // défaut : réseau direct (fallback cache si offline)
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

async function networkFirst(req) {
  try {
    return await fetch(req);
  } catch {
    // fallback offline minimal
    const cached = await caches.match(req);
    return cached || new Response("", { status: 503 });
  }
}

// cache-first uniquement dans CACHE_STATIC (icônes + médias publics)
async function cacheFirstStatic(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const net = await fetch(req);
  try {
    const clone = net.clone();
    const cache = await caches.open(CACHE_STATIC);
    cache.put(req, clone);
  } catch {}

  return net;
}
