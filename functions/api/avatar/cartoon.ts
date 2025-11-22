// ================================================
// Cloudflare Pages Function
// /api/avatar/cartoon
// IA caricature réaliste (Playground v2.5)
// ================================================

export const config = {
    runtime: "edge",
  };
  
  export default {
    async fetch(request: Request, env: any) {
      try {
        if (request.method !== "POST") {
          return new Response("Only POST allowed", { status: 405 });
        }
  
        // --- Lire la photo envoyée ---
        const formData = await request.formData();
        const file = formData.get("image") as File;
  
        if (!file) {
          return new Response(JSON.stringify({ error: "No image provided" }), {
            status: 400,
          });
        }
  
        const bytes = await file.arrayBuffer();
  
        // --- Appel Workers AI ---
        const aiResponse = await env.AI.run(
          "@cf/lykon/playground-v2.5", 
          {
            prompt: `
              Create a hand-drawn caricature portrait.
              Style: realistic cartoon, warm colors, thick outlines, visible brush strokes.
              Emphasize facial expression and humor without distorting identity.
              Stay faithful to overall facial structure.
              High quality illustration. Clean. No artifacts.
            `,
            image: [...new Uint8Array(bytes)],
            strength: 0.65,
            seed: Math.floor(Math.random() * 999999),
          }
        );
  
        if (!aiResponse || !aiResponse.image) {
          return new Response(JSON.stringify({ error: "AI generation failed" }), {
            status: 500,
          });
        }
  
        const base64 = aiResponse.image;
  
        return new Response(
          JSON.stringify({
            ok: true,
            cartoonPng: `data:image/png;base64,${base64}`,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message ?? "Unknown error" }),
          { status: 500 }
        );
      }
    },
  };
  