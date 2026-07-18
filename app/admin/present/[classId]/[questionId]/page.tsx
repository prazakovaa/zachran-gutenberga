"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Question = Database["public"]["Tables"]["questions"]["Row"];
type Answer = Database["public"]["Tables"]["answers"]["Row"];
type Group = Database["public"]["Tables"]["groups"]["Row"];
type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

type PhotoAnswer = Answer & { group?: Group };

export default function ClassPresentPage() {
  const params = useParams();
  const classId = params.classId as string;
  const questionId = parseInt(params.questionId as string);

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [photos, setPhotos] = useState<PhotoAnswer[]>([]);
  const [idx, setIdx] = useState(0);
  const [pointsInput, setPointsInput] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [phase, setPhase] = useState<"review" | "leaderboard">("review");
  const [leaderboard, setLeaderboard] = useState<Group[]>([]);

  useEffect(() => {
    if (localStorage.getItem("admin_auth") === "1") setAuthed(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: q }, { data: c }, { data: grp }] = await Promise.all([
      supabase.from("questions").select("*").eq("id", questionId).single(),
      supabase.from("classes").select("*").eq("id", classId).single(),
      supabase.from("groups").select("*").eq("class_id", classId),
    ]);
    setQuestion(q ?? null);
    setCls(c ?? null);

    const groupIds = (grp ?? []).map((g) => g.id);
    const groupMap = new Map((grp ?? []).map((g) => [g.id, g]));

    if (groupIds.length === 0) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    const { data: ans } = await supabase
      .from("answers")
      .select("*")
      .eq("question_id", questionId)
      .in("group_id", groupIds)
      .not("photo_url", "is", null)
      .order("completed_at", { ascending: true });

    setPhotos((ans ?? []).map((a) => ({ ...a, group: groupMap.get(a.group_id) })));
    setLoading(false);
  }, [classId, questionId]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  // Při přechodu na jinou fotku předvyplň bodové pole
  useEffect(() => {
    const current = photos[idx];
    if (!current) return;
    setPointsInput(current.admin_points ?? question?.max_points ?? 0);
    setSavedFlash(false);
  }, [idx, photos, question]);

  const current = photos[idx];

  const handleSave = async () => {
    if (!current || !question) return;
    const maxPoints = question.max_points ?? 0;
    const pts = Math.max(0, Math.min(maxPoints, pointsInput || 0));
    setSaving(true);

    const { error } = await supabase
      .from("answers")
      .update({
        admin_points: pts,
        admin_graded: true,
        points_earned: pts,
      })
      .eq("id", current.id);

    if (error) {
      alert("Chyba při ukládání: " + error.message);
      setSaving(false);
      return;
    }

    const oldPoints = current.points_earned ?? 0;
    const delta = pts - oldPoints;
    if (delta !== 0) {
      await supabase.rpc("increment_group_points", { gid: current.group_id, pts: delta });
    }

    // Aktualizuj lokální stav, ať se to nemusí znovu natahovat z DB
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === current.id ? { ...p, admin_points: pts, admin_graded: true, points_earned: pts } : p
      )
    );
    setSaving(false);
    setSavedFlash(true);
  };

  const goToLeaderboard = async () => {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("class_id", classId)
      .order("total_points", { ascending: false });
    setLeaderboard(data ?? []);
    setPhase("leaderboard");
  };

  const handleNext = () => {
    if (idx < photos.length - 1) {
      setIdx((i) => i + 1);
      return;
    }
    // Poslední fotka -> potvrzení a přechod na žebříček
    if (window.confirm("Přejete si uložit hodnocení?")) {
      goToLeaderboard();
    }
  };

  const handlePrev = () => {
    setIdx((i) => Math.max(0, i - 1));
  };

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

  // ── Žebříček na konci ──
  if (phase === "leaderboard") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center px-4 py-10">
        <h1 className="text-2xl font-bold mb-1">🏆 Žebříček — {cls?.name}</h1>
        <p className="text-white/40 text-sm mb-8">Hodnocení uloženo</p>
        <div className="w-full max-w-md flex flex-col gap-2">
          {leaderboard.map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                i === 0 ? "bg-yellow-500/20 border border-yellow-500/40" :
                i === 1 ? "bg-white/10 border border-white/20" :
                i === 2 ? "bg-orange-700/20 border border-orange-600/30" :
                "bg-white/5"
              }`}
            >
              <span className="w-6 text-center font-bold text-white/60">{i + 1}.</span>
              <span className="flex-1 font-medium truncate">{g.name}</span>
              <span className="font-bold">{g.total_points ?? 0} b.</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-white/40 text-center py-8">Tato třída zatím nemá žádné skupiny.</p>
          )}
        </div>
        <a href="/admin" className="text-blue-400 underline text-sm mt-8">← Zpět do adminu</a>
      </div>
    );
  }

  if (!question) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Otázka nenalezena.</div>;
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-2xl">📷 Žádné fotky zatím</p>
        <p className="text-white/50">Až skupiny z téhle třídy odpoví, objeví se tady.</p>
        <a href="/admin" className="text-blue-400 underline text-sm">← Zpět do adminu</a>
      </div>
    );
  }

  const maxPoints = question.max_points ?? 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-950/80 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/admin" className="text-white/40 hover:text-white text-sm shrink-0">← Admin</a>
          <span className="text-white/20 shrink-0">|</span>
          <span className="text-sm truncate">{cls?.name} · otázka #{question.order_number}</span>
        </div>
        <div className="text-sm text-white/60 shrink-0">
          {idx + 1} / {photos.length}
        </div>
      </div>

      {/* Hlavní fotka */}
      <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.photo_url!}
          alt={`${current.group?.name ?? "Skupina"} – fotka`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Jméno skupiny + stav */}
      <div className="text-center px-6">
        <p className="text-2xl font-bold">{current.group?.name ?? "?"}</p>
        <p className="text-white/50 text-sm">
          {current.admin_graded
            ? `✓ Zhodnoceno: ${current.admin_points ?? 0} bodů`
            : "⏳ Čeká na hodnocení"}
        </p>
      </div>

      {/* Bodování */}
      <div className="bg-gray-950/90 backdrop-blur border-t border-white/10 px-6 py-4">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <label className="text-white/60 text-sm">Body (max {maxPoints}):</label>
          <input
            type="number"
            min={0}
            max={maxPoints}
            value={pointsInput}
            onChange={(e) => setPointsInput(parseInt(e.target.value) || 0)}
            className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-center"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 rounded-lg px-4 py-2 text-sm font-bold"
          >
            {saving ? "Ukládám…" : "Odeslat"}
          </button>
          {savedFlash && <span className="text-green-400 text-sm">✓ Uloženo</span>}
        </div>
      </div>

      {/* Navigace mezi fotkami */}
      <div className="bg-gray-950 border-t border-white/10 px-6 py-4 flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          disabled={idx === 0}
          className="bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full w-14 h-14 text-2xl"
        >
          ←
        </button>
        <span className="text-white/30 text-xs w-40 text-center">
          {idx === photos.length - 1 ? "Poslední fotka" : "Další skupina"}
        </span>
        <button
          onClick={handleNext}
          className="bg-white/10 hover:bg-white/20 rounded-full w-14 h-14 text-2xl"
        >
          →
        </button>
      </div>
    </div>
  );
}
