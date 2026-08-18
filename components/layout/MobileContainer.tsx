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
  /** Jak se fotka vejde do okna.
   *  "frame"  – na mobilu vyplní, na širokých obrazovkách se vejde celá
   *             a po stranách je rozostřený dotisk. Výchozí.
   *  "cover"  – vždy vyplní celou plochu (na desktopu hodně ořízne). */
  bgFit?: "frame" | "cover";
  /** Poměr stran scény. Necháš-li prázdné, změří se z první načtené fotky,
   *  takže sedí vždycky. Vyplň jen když chceš scénu záměrně jinou. */
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
  bgRatio,
  bgFit = "frame",
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
  /* Poměr stran scény se bere z fotky samotné – jinak by se široký snímek
     narval do svislé scény a ořízl se na pruh. Do prvního načtení držíme
     rozumný odhad. */
  const [measured, setMeasured] = useState<number | null>(null);
  const ratio = parseRatio(bgRatio) ?? measured ?? 1.5;

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
          {/* Rozostřený dotisk do stran – jen tam, kde se fotka nevejde na celou šířku. */}
          {bgFit === "frame" && layers.length > 0 && (
            <div className="hidden md:block absolute inset-0">
              <Image
                src={layers[layers.length - 1].src}
                alt=""
                fill
                sizes="100vw"
                className="object-cover blur-3xl scale-110 opacity-50"
              />
            </div>
          )}

          <Stage ratio={ratio} fit={bgFit}>
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
                    sizes={bgFit === "frame" ? "(min-width: 768px) 70vw, 100vw" : "100vw"}
                    className="object-cover"
                    style={{ opacity: bgOpacity / 100 }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (isTop && img.naturalWidth && img.naturalHeight) {
                        setMeasured(img.naturalWidth / img.naturalHeight);
                      }
                    }}
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
            <Stage ratio={ratio} fit={bgFit}>
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

/** Poměr stran jako číslo. Bere "16/9", "16 / 9" i "1.78". */
function parseRatio(value?: string): number | null {
  if (!value) return null;
  const [w, h] = value.split("/").map((part) => parseFloat(part.trim()));
  if (!w || Number.isNaN(w)) return null;
  if (h === undefined) return w;          // už je to hotové číslo
  if (!h || Number.isNaN(h)) return null;
  return w / h;
}

/** Box s pevným poměrem stran. Rozměr počítáme přímo z okna, takže
    "cover" i "contain" vychází přesně a nemůže se složit na nulu.
    Díky němu odkazují % souřadnice uvnitř vždy na stejné místo fotky. */
function Stage({
  ratio,
  fit,
  children,
}: {
  ratio: number;
  fit: "frame" | "cover";
  children: React.ReactNode;
}) {
  /* cover  = větší z obou rozměrů → scéna vždy přeteče okno
     contain = menší z obou rozměrů → scéna se do okna vejde celá
     V režimu "frame" držíme na mobilu cover (fotka vyplní displej)
     a od md šířky přepneme na contain, aby nebyla přiblížená. */
  const cover = {
    width: `max(100vw, calc(100dvh * ${ratio}))`,
    height: `max(100dvh, calc(100vw / ${ratio}))`,
  };
  const contain = {
    width: `min(100vw, calc(100dvh * ${ratio}))`,
    height: `min(100dvh, calc(100vw / ${ratio}))`,
  };

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [--fit-w:var(--cover-w)] [--fit-h:var(--cover-h)] w-[var(--fit-w)] h-[var(--fit-h)]"
      style={
        {
          "--cover-w": cover.width,
          "--cover-h": cover.height,
          "--contain-w": fit === "frame" ? contain.width : cover.width,
          "--contain-h": fit === "frame" ? contain.height : cover.height,
        } as React.CSSProperties
      }
      data-fit={fit}
    >
      {children}
    </div>
  );
}
