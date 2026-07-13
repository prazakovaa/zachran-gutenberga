"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";
import BottomNav from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import type { Database } from "@/types/database";

type Question = Database["public"]["Tables"]["questions"]["Row"];

// ─── QR scanner overlay ───────────────────────────────────────────────────────
function QRScanner({
  onResult,
  onClose,
}: {
  onResult: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          tick();
        }
      } catch {
        setError("Kamera není dostupná.");
      }
    };

    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          import("jsqr").then(({ default: jsQR }) => {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              onResult(code.data);
              return;
            }
          }).catch(() => {});
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full max-w-md aspect-square">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-2/3 h-2/3 border-2 border-white/80 rounded-xl relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/40 animate-pulse" />
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

      <p className="text-white/60 mt-6 text-sm px-8 text-center">
        Namiř kameru na QR kód u stanoviště
      </p>

      <button
        onClick={onClose}
        className="mt-6 px-8 py-3 rounded-2xl border border-white/30 text-white/70 text-sm"
      >
        Zrušit
      </button>
    </div>
  );
}

// ─── Bodový odznak ────────────────────────────────────────────────────────────
function PointsBadge({ points, max }: { points: number; max: number }) {
  return (
    <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <polygon points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2" fill="currentColor" opacity="0.8"/>
      </svg>
      <span className="text-xs font-bold">{points}/{max} bodů</span>
    </div>
  );
}

// ─── Hlavní stránka otázky ────────────────────────────────────────────────────
export default function QuestionPage({
  params,
}: {
  params: Promise<{ qrcode: string }>;
}) {
  const { qrcode } = use(params);
  const router = useRouter();
  const { session, loaded, advanceQuestion } = useSession();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"teaser" | "scanning" | "answering" | "correct" | "wrongQR">("teaser");
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [wrongMsg, setWrongMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const MAX_ATTEMPTS = 3;

  const [loadError, setLoadError] = useState<string | null>(null);

  // Načti otázku z DB podle qr_value z URL
  useEffect(() => {
    if (!loaded || !session) return;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("qr_value", qrcode)
        .single();
      if (error) {
        console.error("Chyba při načítání otázky:", error);
        setLoadError(error.message);
      }
      setQuestion(data ?? null);
      setLoading(false);
    };
    load();
  }, [qrcode, loaded, session]);

  const currentPoints = useCallback(() => {
    if (!question) return 0;
    const lost = attempts * Math.floor(question.max_points / MAX_ATTEMPTS);
    return Math.max(1, question.max_points - lost);
  }, [question, attempts]);

  // Z "https://www.zachrangutenberga.cz/q5" vytáhne "q5"
  const extractQRValue = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed.includes("/")) return trimmed;
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] ?? trimmed;
    } catch {
      const parts = trimmed.split("/").filter(Boolean);
      return parts[parts.length - 1] ?? trimmed;
    }
  };

  const handleQRResult = useCallback(
    (value: string) => {
      if (!question) return;
      const scanned = extractQRValue(value);
      if (scanned === question.qr_value) {
        setPhase("answering");
      } else {
        setPhase("wrongQR");
      }
    },
    [question]
  );

  const handleSubmitAnswer = async () => {
    if (!question || submitting) return;
    const normalised = answer.trim().toLowerCase();
    const correct = question.correct_answer.trim().toLowerCase();

    if (normalised !== correct) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setWrongMsg(`Špatně. Správná odpověď je: ${question.correct_answer}`);
      } else {
        setWrongMsg(`Špatně! Máš ještě ${MAX_ATTEMPTS - newAttempts} ${MAX_ATTEMPTS - newAttempts === 1 ? "pokus" : "pokusy"}.`);
      }
      return;
    }

    setSubmitting(true);
    const pts = currentPoints();

    if (session?.groupId) {
      await supabase.from("answers").insert({
        group_id: session.groupId,
        question_id: question.id,
        answer_text: answer.trim(),
        points_earned: pts,
        attempts: attempts + 1,
      });
      await supabase.rpc("increment_group_points", { gid: session.groupId, pts });
    }

    setSubmitting(false);
    setPhase("correct");
    setWrongMsg("");
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoSubmit = async () => {
    if (!photoFile || !question || !session?.groupId) return;
    setUploadingPhoto(true);
    try {
      const ext = photoFile.name.split(".").pop() ?? "jpg";
      const fileName = `${session.groupId}/${question.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("gutenberg-photos")
        .upload(fileName, photoFile, { contentType: photoFile.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("gutenberg-photos")
        .getPublicUrl(fileName);

      const { error: dbErr } = await supabase.from("answers").insert({
        group_id: session.groupId,
        question_id: question.id,
        answer_text: "(foto)",
        points_earned: 0,
        attempts: 1,
        photo_url: pub.publicUrl,
        admin_graded: false,
      });
      if (dbErr) throw dbErr;

      setPhase("correct");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Nepodařilo se nahrát fotku: " + msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleContinue = () => {
    if (!session) { router.push("/"); return; }
    const order = session.questionOrder ?? ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];
    const nextIdx = (session.currentQuestionIndex ?? 0) + 1;
    if (nextIdx >= order.length) {
      router.push("/story/end");
      return;
    }
    advanceQuestion();
    const nextQR = order[nextIdx];
    router.push(`/story/questions/${nextQR}`);
  };

  // Počkáme na session (hydratace ze sessionStorage)
  if (!loaded || !session) return null;

  if (loading) {
    return (
      <MobileContainer>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white/60 animate-pulse">Načítání otázky…</div>
        </div>
      </MobileContainer>
    );
  }

  // Špatný QR overlay
  if (phase === "wrongQR") {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <div className="text-6xl">🚫</div>
          <h2 className="text-2xl font-bold">Toto není QR kód pro toto stanoviště</h2>
          <p className="text-white/60">Jdi hledat jinam – správný QR kód tě pustí dál.</p>
          <button
            onClick={() => setPhase("teaser")}
            className="bg-white text-[#0B5ED7] rounded-2xl px-6 py-3 font-bold"
          >
            Zkusit znovu
          </button>
        </div>
        <BottomNav showQR={false} />
      </MobileContainer>
    );
  }

  if (!question) {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <div className="text-5xl">📍</div>
          <h2 className="text-2xl font-bold">Nesprávné stanoviště</h2>
          <p className="text-white/60">QR kód patří jiné otázce nebo je neplatný.</p>
          {loadError && (
            <p className="text-red-400/80 text-xs font-mono break-all">
              Chyba DB: {loadError}
            </p>
          )}
          <button onClick={() => router.back()} className="text-white/60 underline text-sm">Zpět</button>
        </div>
      </MobileContainer>
    );
  }

  if (phase === "scanning") {
    return <QRScanner onResult={handleQRResult} onClose={() => setPhase("teaser")} />;
  }

  const isPhoto = question.answer_mode === "photo";

  // ── CORRECT – obrazovka po správné odpovědi / nahrání fotky ──
  if (phase === "correct") {
    return (
      <MobileContainer>
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <div className="w-20 h-20 rounded-full bg-green-400/20 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M10 20l7 7 13-13" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-green-400">
              {isPhoto ? "Hotovo! 📷" : "Správně!"}
            </h2>
            <p className="text-white/70 mt-2 text-lg">
              {isPhoto
                ? "Admin tvou fotku zhodnotí později."
                : <>Získáváš <span className="text-white font-bold">{currentPoints()} bodů</span></>}
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="mt-4 w-full bg-white text-[#0B5ED7] rounded-3xl font-black text-xl py-5 shadow-xl"
          >
            DALŠÍ STANOVIŠTĚ →
          </button>
        </div>
        <BottomNav showQR={false} />
      </MobileContainer>
    );
  }

  // ── ANSWERING – druhá část otázky (po QR scanu) ──
  if (phase === "answering") {
    if (isPhoto) {
      return (
        <MobileContainer>
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="bg-purple-600/30 text-purple-200 text-xs px-3 py-1 rounded-full">
              📷 Foto odpověď
            </div>
          </div>

          <div className="flex-1 flex flex-col px-6 pt-4 gap-4">
            {question.background_url && (
              <div className="w-full h-40 rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={question.background_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Detail</p>
              <p className="text-white leading-relaxed">{question.detail_text}</p>
            </div>

            <div className="bg-purple-600/15 border border-purple-500/30 rounded-2xl p-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Tvůj úkol</p>
              <p className="text-white font-semibold text-lg leading-snug">{question.question_text}</p>
            </div>

            {photoPreview ? (
              <div className="flex flex-col gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Náhled" className="w-full rounded-2xl bg-black max-h-96 object-contain" />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="flex-1 bg-white/10 rounded-2xl py-3 font-bold"
                  >
                    📷 Vyfotit znovu
                  </button>
                  <button
                    onClick={handlePhotoSubmit}
                    disabled={uploadingPhoto}
                    className="flex-1 bg-white text-[#0B5ED7] rounded-2xl font-black py-3 disabled:opacity-40"
                  >
                    {uploadingPhoto ? "Odesílám…" : "ODESLAT"}
                  </button>
                </div>
              </div>
            ) : (
              <label className="block">
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                <div className="w-full bg-white text-[#0B5ED7] rounded-3xl font-black text-xl py-5 shadow-xl text-center cursor-pointer">
                  📷 VYFOTIT
                </div>
              </label>
            )}
          </div>

          <BottomNav showQR={false} />
          <div className="pb-8" />
        </MobileContainer>
      );
    }

    // Text answering
    const attemptsLeft = MAX_ATTEMPTS - attempts;
    const isOutOfAttempts = attempts >= MAX_ATTEMPTS;

    return (
      <MobileContainer>
        <div className="flex items-center justify-between px-4 pt-4">
          <PointsBadge points={currentPoints()} max={question.max_points} />
        </div>

        <div className="flex-1 flex flex-col px-6 pt-6 gap-4">
          {question.background_url && (
            <div className="w-full h-48 rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={question.background_url} alt="Otázka" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Detail</p>
            <p className="text-white leading-relaxed">{question.detail_text}</p>
          </div>

          <div className="bg-white/15 rounded-2xl p-4 border border-white/20">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Otázka</p>
            <p className="text-white font-semibold text-lg leading-snug">{question.question_text}</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => { setAnswer(e.target.value); setWrongMsg(""); }}
              disabled={isOutOfAttempts}
              onKeyDown={(e) => e.key === "Enter" && handleSubmitAnswer()}
              placeholder="Tvoje odpověď…"
              className="flex-1 bg-white/10 border-2 border-white/30 rounded-2xl px-4 py-3
                         text-white placeholder:text-white/40 outline-none focus:border-white
                         disabled:opacity-50"
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || submitting || isOutOfAttempts}
              className="bg-white text-[#0B5ED7] rounded-2xl px-5 font-bold disabled:opacity-40"
            >
              →
            </button>
          </div>

          {wrongMsg && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              isOutOfAttempts ? "bg-orange-400/20 text-orange-300" : "bg-red-400/20 text-red-300"
            }`}>
              {wrongMsg}
              {isOutOfAttempts && (
                <button onClick={handleContinue} className="block mt-2 text-white/60 underline text-xs">
                  Pokračovat bez bodů →
                </button>
              )}
            </div>
          )}

          {!isOutOfAttempts && attempts > 0 && !wrongMsg && (
            <p className="text-white/40 text-xs text-center">
              Zbývá {attemptsLeft} {attemptsLeft === 1 ? "pokus" : "pokusy"}
            </p>
          )}
        </div>

        <BottomNav showQR={false} />
        <div className="pb-8" />
      </MobileContainer>
    );
  }

  // ── TEASER – výchozí stav (první část otázky, s lištou dole) ──
  return (
    <MobileContainer>
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="text-white/50 text-sm font-medium">
          Stanoviště {qrcode.replace("q", "")}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {question.background_url && (
          <div className="w-full h-52 relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={question.background_url} alt="Stanoviště" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B5ED7]" />
          </div>
        )}

        <div className="px-6 pt-4 flex-1 flex flex-col gap-4">
          <div className="bg-white/10 rounded-2xl p-5">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Příběh</p>
            <p className="text-white text-lg leading-relaxed font-medium">{question.teaser_text}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Detail</p>
            <p className="text-white leading-relaxed">{question.detail_text}</p>
          </div>
          {isPhoto && (
            <div className="bg-purple-600/20 border border-purple-500/30 rounded-2xl p-3 text-purple-100 text-sm text-center">
              📷 Na tomto stanovišti budeš fotit
            </div>
          )}
        </div>
      </div>

      <div className="h-24" />

      <BottomNav onQRClick={() => setPhase("scanning")} />
    </MobileContainer>
  );
}