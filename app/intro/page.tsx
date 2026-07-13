"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";
import TypeWriter from "./components/TypeWriter";
import BooksAnim from "./components/slides/BooksAnim";
import { SLIDES } from "./slides";

export default function IntroPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [locked, setLocked] = useState(true);
  const [textDone, setTextDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  useEffect(() => {
    setLocked(true);
    setTextDone(false);
    setExiting(false);

    lockTimer.current = setTimeout(() => {
      setLocked(false);
    }, slide.lockSeconds * 1000);

    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [current, slide.lockSeconds]);

  const advance = useCallback(() => {
    if (locked || !textDone) return;

    setExiting(true);
    setTimeout(() => {
      if (isLast) {
        router.push("/story");
      } else {
        setCurrent((c) => c + 1);
      }
    }, 350);
  }, [locked, textDone, isLast, router]);

  const handleTextDone = useCallback(() => {
    setTextDone(true);
  }, []);

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col select-none" onClick={advance}>

        <div className="flex justify-center gap-2 pt-6 pb-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-500 ${
                i === current
                  ? "w-5 h-2 bg-white"
                  : i < current
                  ? "w-2 h-2 bg-white/60"
                  : "w-2 h-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        <div
          className={`flex-1 flex items-center justify-center px-4 transition-opacity duration-300 ${
            exiting ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="w-full max-w-[280px] aspect-square">
            <BooksAnim variant={slide.variant} />
          </div>
        </div>

        <div
          className={`px-6 pb-10 min-h-[160px] flex flex-col justify-end transition-opacity duration-300 ${
            exiting ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="text-white text-lg leading-relaxed font-medium mb-6 min-h-[72px]">
            <TypeWriter
              key={current}
              text={slide.text}
              speed={36}
              onDone={handleTextDone}
            />
          </p>

          <div
            className={`flex items-center justify-between transition-all duration-500 ${
              !locked && textDone
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          >
            <span className="text-white/50 text-sm">
              {isLast ? "Začít hru" : "Pokračovat"}
            </span>
            <div className="flex items-center gap-1 text-white/70">
              <span className="text-sm">{isLast ? "Spustit" : "Dál"}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10h12M11 5l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {locked && (
            <div className="flex items-center gap-2 text-white/30">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4.5 6V4a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <span className="text-xs">Počkej chvilku…</span>
            </div>
          )}
        </div>
      </div>
    </MobileContainer>
  );
}
