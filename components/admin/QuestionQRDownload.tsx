"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

// ─────────────────────────────────────────────────────────────────────────
// Rozměry a umístění vycházejí z /public/qr-template.png (1080×1350):
// bílá karta je cca x:82–998, y:96–1254, postava (a text pod ní) začíná
// kolem y≈896. QR kód je proto vycentrovaný nad postavou v prázdném bílém
// prostoru nahoře karty.
// ─────────────────────────────────────────────────────────────────────────
const TEMPLATE_SIZE = { width: 1080, height: 1350 };
const QR_BOX = { x: 240, y: 196, size: 600 }; // 600×600, vycentrováno nad postavou
const QR_COLOR = "#3F4767";

type Props = {
  qrValue: string; // např. "q1"
  origin: string; // např. https://zachrangutenberga.cz
};

export default function QuestionQRDownload({ qrValue, origin }: Props) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const qrContent = origin ? `${origin}/${qrValue}` : qrValue;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const qrCanvas = qrRef.current?.querySelector("canvas");
      if (!qrCanvas) throw new Error("QR kód se nepodařilo vykreslit.");

      const template = new Image();
      template.src = "/qr-template.png";
      await new Promise<void>((resolve, reject) => {
        template.onload = () => resolve();
        template.onerror = () => reject(new Error("Šablonu se nepodařilo načíst."));
      });

      const canvas = document.createElement("canvas");
      canvas.width = TEMPLATE_SIZE.width;
      canvas.height = TEMPLATE_SIZE.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas není podporován.");

      ctx.drawImage(template, 0, 0, TEMPLATE_SIZE.width, TEMPLATE_SIZE.height);
      ctx.drawImage(qrCanvas, QR_BOX.x, QR_BOX.y, QR_BOX.size, QR_BOX.size);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("Export se nepodařil.");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${qrValue}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Stažení QR kódu selhalo.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Skrytý zdrojový QR kód, ze kterého se skládá finální obrázek */}
      <div ref={qrRef} className="hidden">
        <QRCodeCanvas value={qrContent} size={QR_BOX.size} fgColor={QR_COLOR} bgColor="#FFFFFF" level="M" />
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading || !origin}
        className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
        title={qrContent}
      >
        {downloading ? "…" : "⬇ QR"}
      </button>
    </>
  );
}
