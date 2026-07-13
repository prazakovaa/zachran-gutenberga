"use client";

import { useEffect, useState } from "react";

type Props = {
  text: string;
  speed?: number;
  onDone?: () => void;
};

export default function TypeWriter({ text, speed = 38, onDone }: Props) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayed("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index >= text.length) {
      onDone?.();
      return;
    }
    const timeout = setTimeout(() => {
      setDisplayed((prev) => prev + text[index]);
      setIndex((i) => i + 1);
    }, speed);
    return () => clearTimeout(timeout);
  }, [index, text, speed, onDone]);

  return (
    <span>
      {displayed}
      {index < text.length && (
        <span className="inline-block w-[2px] h-[1.1em] bg-white align-middle ml-[1px] animate-pulse" />
      )}
    </span>
  );
}
