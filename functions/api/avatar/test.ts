// ===============================================
// /functions/api/avatar/test.ts
// Petit endpoint de DEBUG Workers AI
// - Appelle le même MODEL_ID que cartoon.ts
// - Renvoie le type de résultat + quelques clés
// ===============================================

export interface Env {
  AI: any;
}

// ⚠️ DOIT ÊTRE IDENTIQUE à celui de cartoon.ts
// Exemple : "@cf/runwayml/stable-diffusion-v1-5-img2img"
const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";

function toJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    // Petite image de test 256x256 noire en PNG encodée en base64
    // (tu peux changer pour autre chose si tu veux)
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAAAA3NCSVQICAjb4U/gAAACN0lEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgC8G0m4AAbvpBqoAAAAASUVORK5CYII=";

    // @ts-ignore atob dispo dans Workers
    const binary = atob(base64Png);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const input: any = {
      prompt:
        "Cartoon caricature portrait of a darts player, warm colors, dark background, no text.",
      image: bytes.buffer,
      strength: 0.65,
    };

    let result: any;
    try {
      result = await env.AI.run(MODEL_ID, input);
    } catch (e: any) {
      return toJson(
        {
          ok: false,
          error: "ai_run_failed",
          message: String(e?.message || e),
        },
        500
      );
    }

    const summary =
      result && typeof result === "object"
        ? {
            typeofResult: typeof result,
            isArrayBuffer: result instanceof ArrayBuffer,
            isArray: Array.isArray(result),
            keys: Object.keys(result),
          }
        : {
            typeofResult: typeof result,
            isArrayBuffer: result instanceof ArrayBuffer,
            isArray: Array.isArray(result),
          };

    return toJson({
      ok: true,
      model: MODEL_ID,
      summary,
      // ⚠️ on ne renvoie PAS tout le résultat (souvent énorme),
      // juste un petit extrait utile pour le debug.
    });
  } catch (e: any) {
    return toJson(
      {
        ok: false,
        error: "unexpected_error",
        message: String(e?.message || e),
      },
      500
    );
  }
};
