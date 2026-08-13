"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Scrim = "none" | "full" | "bottom" | "top" | "both";

type Props = {
  children: React.ReactNode;
  /** Fotka na pozadí, např. "/backgrounds/home.webp". Bez ní zůstane jednobarevné pozadí. */
  bg?: string;
  /** Popis fotky pro čtečky. Dekorativní pozadí nech prázdné. */
  bgAlt?: string;
  /** Krytí fotky 0–100. 100 = plná fotka, 20 = jen jemný nádech pod barvou pozadí. */
  bgOpacity?: number;
  /** Ztmavení fotky, aby byl text čitelný. Výchozí "bottom". */
  scrim?: Scrim;
  /** Vrstva přes fotku – SVG, PNG, animace. Neklikatelná. */
  overlay?: React.ReactNode;
  /** Fotka na první obrazovce → načíst přednostně. */
  priority?: boolean;
  /** Fotky, které přijdou na řadu za chvíli – načtou se dopředu, ať sekvence neproblikne. */
  preload?: string[];
};

const SCRIMS: Record<Scrim, string> = {
  none: "",
  full: "bg-ink/55",
  bottom: "bg-gradient-to-b from-ink/25 via-ink/45 to-ink/95",
  top: "bg-gradient-to-t from-ink/25 via-ink/45 to-ink/95",
  both: "bg-[linear-gradient(to_bottom,var(--color-ink)_0%,transparent_28%,transparent_62%,var(--color-ink)_100%)] opacity-90",
};

export default function MobileContainer({
  children,
  bg,
  bgAlt = "",
  bgOpacity = 100,
  scrim = "bottom",
  overlay,
  priority = false,
  preload = [],
}: Props) {
  /* Při změně `bg` chvíli držíme starou i novou fotku, aby se prolnuly
     místo tvrdého střihu. Po dojetí přechodu starou vrstvu zahodíme. */
  const [layers, setLayers] = useState<{ src: string; key: number }[]>(
    bg ? [{ src: bg, key: 0 }] : []
  );

  useEffect(() => {
    if (!bg) {
      setLayers([]);
      return;
    }
    setLayers((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].src === bg) return prev;
      return [...prev.slice(-1), { src: bg, key: Date.now() }];
    });
    // Úklid staré vrstvy časovačem, ne přes animationend – uživatel může
    // mít vypnuté animace a pak by se event nikdy nespustil.
    const t = setTimeout(() => setLayers((l) => l.slice(-1)), 700);
    return () => clearTimeout(t);
  }, [bg]);

  return (
    /* Vnější vrstva drží fotku – roztažená přes celou šířku okna.
       Vnitřní sloupec drží obsah – vždy uprostřed, max-w-md. */
    <div className="relative min-h-screen w-full bg-ink text-paper flex justify-center overflow-hidden">
      {layers.length > 0 && (
        <div className="absolute inset-0 z-0" aria-hidden={bgAlt ? undefined : true}>
          {layers.map((layer, i) => {
            const isTop = i === layers.length - 1;
            return (
              <div
                key={layer.key}
                className={`absolute inset-0 ${isTop ? "animate-fade-in" : ""}`}
              >
                <Image
                  src={layer.src}
                  alt={isTop ? bgAlt : ""}
                  fill
                  priority={priority && layer.key === 0}
                  sizes="100vw"
                  className="object-cover"
                  style={{ opacity: bgOpacity / 100 }}
                />
              </div>
            );
          })}

          {scrim !== "none" && <div className={`absolute inset-0 ${SCRIMS[scrim]}`} />}
          {overlay && <div className="absolute inset-0 pointer-events-none">{overlay}</div>}
        </div>
      )}

      {/* Předem natažené fotky pro další obrazovky – nejsou vidět. */}
      {preload.map((src) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={1}
          height={1}
          sizes="100vw"
          aria-hidden="true"
          className="absolute opacity-0 pointer-events-none -z-10"
        />
      ))}

      <div className="relative z-10 w-full max-w-md min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
