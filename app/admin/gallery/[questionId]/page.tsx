"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Question = Database["public"]["Tables"]["questions"]["Row"];
type Answer = Database["public"]["Tables"]["answers"]["Row"];
type Group = Database["public"]["Tables"]["groups"]["Row"];

type PhotoAnswer = Answer & { group?: Group };

export default function GalleryPage() {
  const params = useParams();
  const questionId = parseInt(params.questionId as string);

  const [authed, setAuthed] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [photos, setPhotos] = useState<PhotoAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("admin_auth") === "1") setAuthed(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: q } = await supabase
      .from("questions").select("*").eq("id", questionId).single();
    setQuestion(q ?? null);

    // Jen sólo skupiny (is_solo = true)
    const { data: soloGroups } = await supabase
      .from("groups")
      .select("*")
      .eq("is_solo", true);
    const soloIds = (soloGroups ?? []).map((g) => g.id);
    const groupMap = new Map((soloGroups ?? []).map((g) => [g.id, g]));

    if (soloIds.length === 0) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    const { data: ans } = await supabase
      .from("answers")
      .select("*")
      .eq("question_id", questionId)
      .in("group_id", soloIds)
      .not("photo_url", "is", null)
      .order("completed_at", { ascending: false });

    setPhotos((ans ?? []).map((a) => ({ ...a, group: groupMap.get(a.group_id) })));
    setLoading(false);
  }, [questionId]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex items-center gap-3 px-6 py-4 bg-gray-950/80 backdrop-blur border-b border-white/10 sticky top-0 z-10">
        <a href="/admin" className="text-white/40 hover:text-white text-sm">← Admin</a>
        <span className="text-white/20">|</span>
        <span className="text-sm">
          🖼️ Fotogalerie — otázka #{question?.order_number ?? questionId}
        </span>
        <span className="text-white/40 text-xs ml-auto">{photos.length} fotek od sólo hráčů</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {photos.length === 0 ? (
          <p className="text-white/40 text-center py-16">
            Zatím žádné fotky od sólo hráčů pro tuhle otázku.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((p) => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photo_url!}
                  alt={p.group?.name ?? "Hráč"}
                  className="w-full aspect-square object-cover bg-black"
                />
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium truncate">{p.group?.name ?? "?"}</p>
                  <p className="text-white/30 text-[10px]">
                    {new Date(p.completed_at).toLocaleString("cs-CZ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
