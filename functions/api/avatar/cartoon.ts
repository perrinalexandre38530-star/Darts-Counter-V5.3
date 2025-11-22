// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature via Replicate + cache KV + QUOTA + CORS
// - Transforme une photo en cartoon humoristique
// - Limite à 100 générations / jour (pour éviter les coûts)
// - Cache par (hash de l'image + style) => pas de quota si déjà fait
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// --------- Limite quotidienne ---------
const DAILY_QUOTA_LIMIT = 100;

// --------- CORS ORIGINS AUTORISÉS ---------
const PAGES_ORIGIN = "https://darts-counter-v5-3.pages.dev";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === PAGES_ORIGIN) return true;
  // Dev depuis Stackblitz : sous-domaines *.webcontainer.io
  if (origin.endsWith(".webcontainer.io")) return true;
  return false;
}

function makeCorsHeaders(origin: string | null): HeadersInit {
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// --------- Utilitaires ---------
async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Petit helper pour attendre entre 2 polls Replicate
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------- PAGES FUNCTION --------------
export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const corsHeaders = makeCorsHeaders(origin);

  // Préflight CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // CORS strict
  if (!isAllowedOrigin(origin)) {
    return new Response("CORS blocked", {
      status: 403,
      headers: corsHeaders,
    });
  }

  try {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // ---------- Vérif clé Replicate ----------
    const replicateApiKey = env.REPLICATE_API_KEY as string | undefined;
    if (!replicateApiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "missing_replicate_key",
          message:
            "Variable REPLICATE_API_KEY manquante dans les variables Cloudflare.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const form = await request.formData();
    const file = form.get("image") as File | null;
    let style = (form.get("style") as string) || "realistic";

    if (!file) {
      return new Response(
        JSON.stringify({ ok: false, error: "no_image", message: "No image provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!["realistic", "comic", "flat", "exaggerated"].includes(style)) {
      style = "realistic";
    }
    const styleId = style as StyleId;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = bytesToBase64(bytes);
    // Data URL utilisée par Replicate (image-to-image)
    const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;

    // ---------------- CACHE + QUOTA (KV) ----------------
    let cacheKey = "";
    let quotaKey = "";
    let currentQuota = 0;

    if (env.AVATAR_CACHE) {
      // 1) Cache par hash de l'image + style
      const hash = await sha256Hex(bytes.buffer);
      cacheKey = `avatar:${styleId}:${hash}`;

      const cached = await env.AVATAR_CACHE.get(cacheKey);
      if (cached) {
        // ✅ Résultat déjà généré → pas de quota consommé
        return new Response(
          JSON.stringify({ ok: true, cartoonPng: cached, cached: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // 2) Quota journalier
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD en UTC
      quotaKey = `quota:${today}`;

      const rawQuota = await env.AVATAR_CACHE.get(quotaKey);
      currentQuota = rawQuota ? parseInt(rawQuota, 10) || 0 : 0;

      if (currentQuota >= DAILY_QUOTA_LIMIT) {
        // ❌ Quota dépassé → on NE fait PAS d'appel IA (donc pas de coût)
        return new Response(
          JSON.stringify({
            ok: false,
            error: "daily_quota_reached",
            message:
              "Le quota quotidien d’avatars IA a été atteint. Réessaie demain.",
            limit: DAILY_QUOTA_LIMIT,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      // Sinon, on laisse passer et on incrémentera après génération IA
    }

    // ---------------- APPEL REPLICATE ----------------
    // Modèle : flux-kontext-apps/cartoonify (photo -> cartoon)
    const apiUrl =
      "https://api.replicate.com/v1/models/flux-kontext-apps/cartoonify/predictions";

    // Petit prompt différent selon le style, pour influencer le rendu
    const stylePrompt: Record<StyleId, string> = {
      realistic:
        "realistic cartoon caricature portrait, warm colors, smooth shading, thick outlines, same identity, no text, plain background",
      comic:
        "comic-book style caricature portrait, bold lines, halftone shadows, vibrant colors, expressive face, same identity, no text, plain background",
      flat:
        "flat vector esport mascot portrait, minimal shading, clean shapes, neon colors, thick outline, same identity, no text, plain background",
      exaggerated:
        "highly exaggerated cartoon caricature, big facial features, humorous and expressive, same identity, clean background, no text",
    };

    const body = JSON.stringify({
      input: {
        image: dataUrl,
        prompt: stylePrompt[styleId],
      },
    });

    const createRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateApiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!createRes.ok) {
      const txt = await createRes.text().catch(() => "");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "replicate_request_failed",
          status: createRes.status,
          details: txt.slice(0, 500),
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let prediction: any = await createRes.json();

    // Si le résultat est déjà prêt (cas rare)
    let status: string = prediction.status;
    const getUrl: string | undefined = prediction?.urls?.get;

    // Poll si nécessaire
    let tries = 0;
    const MAX_TRIES = 20;

    while (
      (status === "starting" || status === "processing" || status === "queued") &&
      tries < MAX_TRIES &&
      getUrl
    ) {
      await sleep(1500);
      const pollRes = await fetch(getUrl, {
        headers: {
          Authorization: `Token ${replicateApiKey}`,
        },
      });
      prediction = await pollRes.json();
      status = prediction.status;
      tries++;
    }

    if (status !== "succeeded") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "replicate_failed",
          status,
          details: prediction?.error || null,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Pour cartoonify, output est en général une liste d'URLs d’images
    const output = prediction.output;
    let finalUrl: string | null = null;

    if (Array.isArray(output) && output.length > 0 && typeof output[0] === "string") {
      finalUrl = output[0] as string;
    } else if (typeof output === "string") {
      finalUrl = output;
    }

    if (!finalUrl) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "no_output_image",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Ici, on renvoie l’URL directe. Ton front l’utilise déjà comme src d’image,
    // donc pas besoin que ce soit un data: URL.
    const cartoonUrl = finalUrl;

    // ---------------- STOCKAGE CACHE + MAJ QUOTA ----------------
    if (env.AVATAR_CACHE && cacheKey) {
      await env.AVATAR_CACHE.put(cacheKey, cartoonUrl, {
        expirationTtl: 60 * 60 * 24 * 30, // 30 jours
      });

      if (quotaKey) {
        const newQuota = currentQuota + 1;
        await env.AVATAR_CACHE.put(quotaKey, String(newQuota), {
          expirationTtl: 60 * 60 * 48,
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, cartoonPng: cartoonUrl, cached: false }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "exception",
        message: err?.message ?? "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...makeCorsHeaders(request.headers.get("Origin")),
          "Content-Type": "application/json",
        },
      }
    );
  }
};
