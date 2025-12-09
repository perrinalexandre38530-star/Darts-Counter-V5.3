// =============================================================
// src/lib/dartScannerApi.ts
// API client pour le scanner de fléchettes
// - Envoie une photo brute au backend
// - Retourne une image détourée + cartoon (fond uni)
// - Retourne aussi une miniature pour overlay avatar
// =============================================================

export type DartScanOptions = {
    bgColor?: string;            // couleur de fond souhaitée (hex)
    targetAngleDeg?: number;     // ex: 48° ~ "1h37"
    cartoonLevel?: number;       // 0-1 intensité du style cartoon
  };
  
  export type DartScanResult = {
    mainImageUrl: string;        // grande image fléchette (fond uni)
    thumbImageUrl: string;       // miniature pour overlay avatar
    bgColor?: string;            // fond réellement appliqué (optionnel)
  };
  
  const DART_SCANNER_ENDPOINT =
    import.meta.env.VITE_DART_SCANNER_ENDPOINT ||
    "https://your-worker-domain.example.com/dart-scan";
  
  /**
   * Envoie un fichier image au backend de scan fléchettes.
   * Le backend doit:
   * - Détourer la fléchette (supprimer l'arrière-plan)
   * - La placer sur un fond uni (bgColor)
   * - L'orienter à l'angle targetAngleDeg
   * - Appliquer un filtre cartoon
   * - Retourner des URLs (main + thumb)
   */
  export async function scanDartImage(
    file: File,
    options: DartScanOptions = {}
  ): Promise<DartScanResult> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append(
      "options",
      JSON.stringify({
        bgColor: options.bgColor || "#101020",
        targetAngleDeg: options.targetAngleDeg ?? 48, // ≈ 1h37
        cartoonLevel: options.cartoonLevel ?? 0.8,
      })
    );
  
    const res = await fetch(DART_SCANNER_ENDPOINT, {
      method: "POST",
      body: formData,
    });
  
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Dart scan failed (${res.status}) ${text ? " - " + text : ""}`
      );
    }
  
    const json = await res.json();
  
    // On attend: { mainImageUrl, thumbImageUrl, bgColor? }
    if (!json.mainImageUrl || !json.thumbImageUrl) {
      throw new Error("Réponse scanner invalide (mainImageUrl manquant)");
    }
  
    return {
      mainImageUrl: json.mainImageUrl,
      thumbImageUrl: json.thumbImageUrl,
      bgColor: json.bgColor,
    };
  }
  