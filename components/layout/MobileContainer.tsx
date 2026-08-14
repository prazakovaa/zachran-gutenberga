"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Scrim = "none" | "soft" | "full" | "bottom" | "top" | "both";

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
  /** Poměr stran fotek na pozadí. Musí sedět s reálným poměrem souborů,
   *  jinak by se SVG vrstva vůči fotce posouvala. */
  bgRatio?: string;
  /** Vrstva ukotvená k fotce, NAD scrimem – ztmavení se jí netýká. */
  overlay?: React.ReactNode;
  /** Vrstva ukotvená k fotce, POD scrimem – ztmaví se spolu s fotkou. */
  overlayBehind?: React.ReactNode;
  /** Fotka na první obrazovce → načíst přednostně. */
  priority?: boolean;
  /** Fotky, které přijdou na řadu za chvíli – načtou se dopředu, ať sekvence neproblikne. */
  preload?: string[];
};

const SCRIMS: Record<Scrim, string> = {
  none: "",
  soft: "bg-ink/30",
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
  bgRatio = "1 / 2",
  scrim = "bottom",
  overlay,
  overlayBehind,
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

  /* Stránky často opakují stejnou fotku – duplicity zahodíme a aktuální
     fotku předem tahat nemusíme, tu už kontejner vykresluje. */
  const preloadList = Array.from(new Set(preload)).filter((src) => src !== bg);

  return (
    /* Vnější vrstva drží fotku – roztažená přes celou šířku okna.
       Vnitřní sloupec drží obsah – vždy uprostřed, max-w-md. */
    <div className="relative min-h-screen w-full bg-ink text-paper flex justify-center overflow-hidden">
      {(layers.length > 0 || overlay || overlayBehind) && (
        <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden={bgAlt ? undefined : true}>
          {/* SCÉNA: box s poměrem stran fotky, zvětšený tak, aby pokryl okno.
              Fotka i SVG vrstvy žijí uvnitř, takže % souřadnice odkazují
              vždy na stejné místo fotky – na mobilu i na desktopu. */}
          <Stage ratio={bgRatio}>
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

            {/* Vrstva, která má zapadnout do fotky → ztmaví se s ní. */}
            {overlayBehind && (
              <div className="absolute inset-0 pointer-events-none">{overlayBehind}</div>
            )}
          </Stage>

          {/* Scrim leží přes celé okno, ne jen přes scénu. */}
          {scrim !== "none" && <div className={`absolute inset-0 ${SCRIMS[scrim]}`} />}

          {/* Druhá scéna nad scrimem – stejná souřadná soustava, ale plné barvy. */}
          {overlay && (
            <Stage ratio={bgRatio}>
              <div className="absolute inset-0 pointer-events-none">{overlay}</div>
            </Stage>
          )}
        </div>
      )}

      {/* Předem natažené fotky pro další obrazovky – nejsou vidět. */}
      {preloadList.map((src) => (
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

/** Box s pevným poměrem stran, zvětšený tak, aby pokryl okno.
    Díky němu odkazují % souřadnice uvnitř vždy na stejné místo fotky. */
function Stage({ ratio, children }: { ratio: string; children: React.ReactNode }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full"
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  );
}
