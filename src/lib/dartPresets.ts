// =============================================================
// src/lib/dartPresets.ts
// Bibliothèque de sets de fléchettes "cartoon" pré-définis
// - Utilisés par DartSetSelector (onglet "Presets")
// =============================================================

export type DartPresetTheme =
  | "gold"
  | "green"
  | "pink"
  | "blue"
  | "red"
  | "purple";

export type DartPreset = {
  id: string;
  name: string;
  imgUrlMain: string;   // 1024x1024
  imgUrlThumb: string;  // 256x256
  theme: DartPresetTheme;
};

export const dartPresets: DartPreset[] = [
  {
    id: "target-exo03",
    name: "Target Exo 03",
    imgUrlMain: "/images/darts/target-exo03-1024.png",
    imgUrlThumb: "/images/darts/target-exo03-256.png",
    theme: "white",
  },
  {
    id: "classic-gold",
    name: "Classic Gold",
    imgUrlMain: "/images/darts/classic-gold-1024.png",
    imgUrlThumb: "/images/darts/classic-gold-256.png",
    theme: "gold",
  },
  {
    id: "neon-green",
    name: "Neon Green",
    imgUrlMain: "/images/darts/neon-green-1024.png",
    imgUrlThumb: "/images/darts/neon-green-256.png",
    theme: "green",
  },
  {
    id: "pink-stinger",
    name: "Pink Stinger",
    imgUrlMain: "/images/darts/pink-stinger-1024.png",
    imgUrlThumb: "/images/darts/pink-stinger-256.png",
    theme: "pink",
  },
  {
    id: "blue-ice",
    name: "Blue Ice",
    imgUrlMain: "/images/darts/blue-ice-1024.png",
    imgUrlThumb: "/images/darts/blue-ice-256.png",
    theme: "blue",
  },
  {
    id: "red-blaze",
    name: "Red Blaze",
    imgUrlMain: "/images/darts/red-blaze-1024.png",
    imgUrlThumb: "/images/darts/red-blaze-256.png",
    theme: "red",
  },
  {
    id: "purple-shadow",
    name: "Purple Shadow",
    imgUrlMain: "/images/darts/purple-shadow-1024.png",
    imgUrlThumb: "/images/darts/purple-shadow-256.png",
    theme: "purple",
  },
  // ➜ Tu peux en rajouter autant que tu veux
];
