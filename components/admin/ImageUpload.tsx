"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "gutenberg-photos";
const FOLDER = "backgrounds";
const MAX_WIDTH = 2000;

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

/** Zmenší a překóduje fotku ještě v prohlížeči – z foťáku chodí snímky
    přes 5 MB, což by se na mobilních datech ve škole načítalo věčnost. */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Nepodařilo se zpracovat obrázek.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Převod se nezdařil."))),
      "image/webp",
      0.82
    );
  });
}

function safeName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .slice(0, 40)
    .toLowerCase();
}

export default function ImageUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [manual, setManual] = useState(false);

  const handleFile = async (file: File) => {
    setErr("");
    setBusy(true);
    try {
      const blob = await downscale(file);
      const path = `${FOLDER}/${Date.now()}-${safeName(file.name)}.webp`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nahrání se nezdařilo.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-white/50 text-xs uppercase tracking-wider">
        Fotografie do pozadí
      </label>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Náhled pozadí" className="w-full h-40 object-cover" />
          <button
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-xs rounded-lg px-3 py-1.5"
          >
            Odebrat
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border-2 border-dashed border-white/25 hover:border-white/50 rounded-xl py-8 text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
        >
          {busy ? "Nahrávám…" : "Vybrat fotku ze zařízení"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {value && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="self-start text-white/50 hover:text-white text-xs underline disabled:opacity-50"
        >
          {busy ? "Nahrávám…" : "Nahradit jinou fotkou"}
        </button>
      )}

      {err && <p className="text-red-400 text-xs">{err}</p>}

      <p className="text-white/35 text-xs leading-relaxed">
        Nejlépe snímek na šířku. Fotka se před odesláním sama zmenší na{" "}
        {MAX_WIDTH} px a převede do WebP, takže se nemusíš starat o velikost souboru.
      </p>

      {manual ? (
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="https://…"
          className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-white/50 placeholder:text-white/25"
        />
      ) : (
        <button
          onClick={() => setManual(true)}
          className="self-start text-white/35 hover:text-white/70 text-xs"
        >
          Zadat URL ručně
        </button>
      )}
    </div>
  );
}
