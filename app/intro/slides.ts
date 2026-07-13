export type SlideData = {
  id: number;
  text: string;
  variant: 1 | 2 | 3 | 4 | 5;
  lockSeconds: number;
};

export const SLIDES: SlideData[] = [
  {
    id: 1,
    variant: 1,
    lockSeconds: 3,
    text: "Vítej... nevíš prosím? Kde? Nebo alespoň kdy, to jsem?",
  },
  {
    id: 2,
    variant: 2,
    lockSeconds: 3,
    text: "Jmenuji se pan Gutenberg. Před pár dny jsem vynalezl knihtisk. Je to úžasný stroj... ale... jsem teď nějaký zmatený...",
  },
  {
    id: 3,
    variant: 3,
    lockSeconds: 3,
    text: "Je tu toho tolik. Knihy, příběhy, informace... Vůbec to nepoznávám.",
  },
  {
    id: 4,
    variant: 4,
    lockSeconds: 3,
    text: "Je to krásné. Chtěl bych poznat každý kout tohoto místa. Nikdy se mi o tom ani nesnilo.",
  },
  {
    id: 5,
    variant: 5,
    lockSeconds: 3,
    text: "Myslíš, že by si byl tak laskavý a provedl mě? Moc by to pro mě znamenalo.",
  },
];
