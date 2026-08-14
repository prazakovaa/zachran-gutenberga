import type { SceneArtItem } from "@/components/layout/SceneArt";

export type SlideData = {
  id: number;
  text: string;
  variant: 1 | 2 | 3 | 4 | 5;
  lockSeconds: number;
  bg: string;
  bgOpacity?: number;
  scrim?: "none" | "soft" | "full" | "bottom" | "top" | "both";
  art?: SceneArtItem[];
  flash?: "black" | "white" | "none";
};

export const SLIDES: SlideData[] = [
  {
    id: 1,
    variant: 1,
    art: [
      { src: "hidden.svg", x: 80, y: 45, w: 40, anim: "none", behindScrim: true },
    ],
    lockSeconds: 3,
    bg: "/backgrounds/bg3.webp",
    scrim: "bottom",
    text: "Vítej... nevíš prosím? Kde? Nebo alespoň kdy, to jsem?",
  },
  {
    id: 2,
    variant: 2,
    art: [
      { src: "hidden.svg", x: 80, y: 45, w: 40, anim: "none", behindScrim: true },
    ],
    lockSeconds: 3,
    bg: "/backgrounds/bg3.webp",
    scrim: "bottom",
    text: "Je tu toho tolik. Knihy, příběhy, informace... Vůbec to nepoznávám.",
  },
  {
    id: 3,
    variant: 3,
    art: [
      { src: "gutenberg.svg", x: 70, y: 52, w: 50, anim: "none" },
    ],
    lockSeconds: 3,
    bg: "/backgrounds/bg3.webp",
    scrim: "bottom",
    flash: "white",
    text: "Jejda! Já se ani nepředstavil. Jmenuji se pan Gutenberg. Před pár dny jsem vynalezl knihtisk. Je to úžasný stroj.",
  },
  {
    id: 4,
    variant: 4,
    art: [
      { src: "gutenberg.svg", x: 70, y: 52, w: 50, anim: "none" },
    ],
    lockSeconds: 3,
    bg: "/backgrounds/bg3.webp",
    scrim: "bottom",
    text: "tady je to také úžasné! Chtěl bych poznat každý kout tohoto místa. Nikdy se mi o tom ani nesnilo.",
  },
  {
    id: 5,
    variant: 5,
    art: [
      { src: "gutenberg.svg", x: 70, y: 52, w: 50, anim: "none" },
    ],
    lockSeconds: 3,
    bg: "/backgrounds/bg3.webp",
    scrim: "bottom",
    text: "Myslíš, že by si byl tak laskavý a pomohl bys mi to tu prozkoumat? Moc by to pro mě znamenalo.",
  },
];
