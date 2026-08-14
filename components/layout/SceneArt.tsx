export type SceneArtItem = {
  /** Cesta k SVG/PNG v public/, např. "/art/kniha.svg" */
  src: string;
  /** Vodorovná pozice STŘEDU prvku v % šířky fotky (0 = levý okraj, 100 = pravý) */
  x: number;
  /** Svislá pozice STŘEDU prvku v % výšky fotky (0 = horní okraj, 100 = spodní) */
  y: number;
  /** Šířka prvku v % šířky fotky. Výška dopočítá sama podle poměru SVG. */
  w: number;
  /** Pohyb prvku. Výchozí "drift". */
  anim?: "drift" | "sway" | "breathe" | "glow" | "none";
  /** Posun startu animace v sekundách – ať se prvky nehýbou synchronně. */
  delay?: number;
  /** Natočení ve stupních. */
  rotate?: number;
  /** Krytí 0–100. */
  opacity?: number;
  /** Jestli se má vykreslit pod scrimem (tmavým ztmavením fotky). */
  behindScrim?: boolean;
};

const ANIMS = {
  drift: "animate-drift",
  sway: "animate-sway",
  breathe: "animate-breathe",
  glow: "animate-glow",
  none: "",
} as const;

/**
 * Vykreslí SVG/PNG ukotvená k fotce na pozadí.
 * Souřadnice jsou v % scény, takže prvek sedí na stejném místě fotky
 * na mobilu i na desktopu.
 */
export default function SceneArt({ items }: { items?: SceneArtItem[] }) {
  if (!items?.length) return null;

  return (
    <>
      {items.map((a, i) => (
        <div
          key={`${a.src}-${i}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%` }}
        >
          {/* Vnější div polohuje, vnitřní animuje – jinak by si transformy lezly do zelí. */}
          <div
            className={ANIMS[a.anim ?? "drift"]}
            style={{ animationDelay: `${a.delay ?? 0}s` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.src}
              alt=""
              aria-hidden="true"
              className="w-full h-auto block"
              style={{
                transform: a.rotate ? `rotate(${a.rotate}deg)` : undefined,
                opacity: (a.opacity ?? 100) / 100,
              }}
            />
          </div>
        </div>
      ))}
    </>
  );
}
