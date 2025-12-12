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
    id: "gold-darts",
    name: "Gold",
    imgUrlMain: "/images/darts/gold-darts-1024.png",
    imgUrlThumb: "/images/darts/gold-darts-256.png",
    theme: "gold",
  },
  {
    id: "rose-kuli-us",
    name: "Rose Kuli US",
    imgUrlMain: "/images/darts/rose-kuli-us-1024.png",
    imgUrlThumb: "/images/darts/rose-kuli-us-256.png",
    theme: "red",
  },
  {
    id: "rose-kuli-red",
    name: "Rose Kuli Red",
    imgUrlMain: "/images/darts/rose-kuli-red-1024.png",
    imgUrlThumb: "/images/darts/rose-kuli-red-256.png",
    theme: "red",
  },
  {
    id: "winmau-xenon",
    name: "Winmau Xenon",
    imgUrlMain: "/images/darts/winmau-xenon-1024.png",
    imgUrlThumb: "/images/darts/winmau-xenon-256.png",
    theme: "white",
  },
  {
    id: "winmau-neutron",
    name: "Winmau Neutron",
    imgUrlMain: "/images/darts/winmau-neutron-1024.png",
    imgUrlThumb: "/images/darts/winmau-neutron-256.png",
    theme: "white",
  },
  {
    id: "target-exo03",
    name: "Target Exo",
    imgUrlMain: "/images/darts/target-exo03-1024.png",
    imgUrlThumb: "/images/darts/target-exo03-256.png",
    theme: "white",
  },
  {
    id: "harrows-ryan-searle",
    name: "Harrows Ryan Searle",
    imgUrlMain: "/images/darts/harrows-ryan-searle-1024.png",
    imgUrlThumb: "/images/darts/harrows-ryan-searle-256.png",
    theme: "pink",
  },
];
