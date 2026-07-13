"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Question = Database["public"]["Tables"]["questions"]["Row"];
type Answer = Database["public"]["Tables"]["answers"]["Row"];
type Group = Database["public"]["Tables"]["groups"]["Row"];

type PhotoAnswer = Answer & { group?: Group };

export default function PresentPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = parseInt(params.questionId as string);

  const [authed, setAuthed] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [photos, setPhotos] = useState<PhotoAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "1") setAuthed(true);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data: q } = await supabase
      .from("questions").select("*").eq("id", questionId).single();
    setQuestion(q ?? null);

    const { data: ans } = await supabase
      .from("answers")
      .select("*")
      .eq("question_id", questionId)
      .not("photo_url", "is", null);

    const { data: grp } = await supabase.from("groups").select("*");
    const groupMap = new Map((grp ?? []).map((g) => [g.id, g]));

    setPhotos((ans ?? []).map((a) => ({ ...a, group: groupMap.get(a.group_id) })));
    setLoading(false);
  }, [questionId]);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, loadAll]);

  // Auto-refresh každých 10 s — kdyby se fotky během prezentace přibraly
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(loadAll, 10000);
    return () => clearInterval(t);
  }, [authed, loadAll]);

  const shuffle = () => {
    setPhotos((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setShuffled(true);
    setIdx(0);
  };

  const next = () => setIdx((i) => Math.min(photos.length - 1, i + 1));
  const prev = () => setIdx((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (!authed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") router.push("/admin");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, photos.length]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <a href="/admin" className="text-blue-400 underline">Přihlas se v adminu</a>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center animate-pulse">Načítám…</div>;
  }

  if (!question) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Otázka nenalezena.</div>;
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-2xl">📷 Žádné fotky zatím</p>
        <p className="text-white/50">Až žáci odpoví, objeví se tady.</p>
        <a href="/admin" className="text-blue-400 underline text-sm">← Zpět do adminu</a>
      </div>
    );
  }

  const current = photos[idx];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-950/80 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-white/40 hover:text-white text-sm">← Admin</a>
          <span className="text-white/20">|</span>
          <span className="text-sm">Otázka #{question.order_number}</span>
        </div>
        <div className="text-sm text-white/60">
          {idx + 1} / {photos.length}
        </div>
      </div>

      {/* Hlavní fotka */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.photo_url!}
          alt={`${current.group?.name ?? "Skupina"} – fotka`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Spodní lišta s informacemi */}
      <div className="bg-gray-950/90 backdrop-blur border-t border-white/10 px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full w-12 h-12 text-2xl"
        >
          ←
        </button>

        <div className="flex-1 text-center">
          <p className="text-2xl font-bold">{current.group?.name ?? "?"}</p>
          <p className="text-white/50 text-sm">
            {current.admin_graded
              ? `✓ Zhodnoceno: ${current.admin_points ?? 0} bodů`
              : "⏳ Čeká na hodnocení"}
          </p>
          {current.admin_comment && (
            <p className="text-white/40 text-xs italic mt-1">„{current.admin_comment}"</p>
          )}
        </div>

        <button
          onClick={next}
          disabled={idx === photos.length - 1}
          className="bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full w-12 h-12 text-2xl"
        >
          →
        </button>
      </div>

      {/* Ovládací prvky */}
      <div className="bg-gray-950 border-t border-white/10 px-6 py-3 flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={shuffle}
          className="bg-purple-600 hover:bg-purple-500 rounded-xl px-4 py-2 text-sm font-bold"
        >
          🔀 Zamíchat pořadí {shuffled && "✓"}
        </button>
        <span className="text-white/30 text-xs">Šipkami / mezerníkem</span>
        <button
          onClick={() => window.document.documentElement.requestFullscreen?.()}
          className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-bold"
        >
          ⛶ Fullscreen
        </button>
      </div>
    </div>
  );
}