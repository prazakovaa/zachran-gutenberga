"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";
import BottomNav from "@/components/layout/BottomNav";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

type LeaderRow = {
  id: string;
  name: string;
  total_points: number;
  rank: number;
  isYou: boolean;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const { session, loaded } = useSession();
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [yourClassName, setYourClassName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;

    // Pokud jsme sólo, načti sólo hráče. Pokud skupina, načti skupiny v naší třídě.
    let query = supabase
      .from("groups")
      .select("id, name, total_points, class_id, is_solo")
      .order("total_points", { ascending: false });

    if (session.mode === "group" && session.classId) {
      query = query.eq("class_id", session.classId);
    } else if (session.mode === "solo") {
      query = query.eq("is_solo", true);
    }

    const { data } = await query;

    const mapped: LeaderRow[] = (data ?? []).map((g, i) => ({
      id: g.id,
      name: g.name,
      total_points: g.total_points ?? 0,
      rank: i + 1,
      isYou: g.id === session.groupId,
    }));
    setRows(mapped);

    if (session.classId) {
      const { data: cls } = await supabase
        .from("classes")
        .select("name")
        .eq("id", session.classId)
        .single();
      setYourClassName(cls?.name ?? "");
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!loaded) return;
    if (!session) { router.replace("/"); return; }
    load();
  }, [loaded, session, load, router]);

  // Live: refetch každých 5 s
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!session) return null;

  const yourRow = rows.find((r) => r.isYou);
  const totalInList = rows.length;
  const headline = session.mode === "solo"
    ? "Žebříček sólo hráčů"
    : `Žebříček třídy ${yourClassName || "?"}`;

  return (
    <MobileContainer>
      <div className="flex items-center justify-between px-4 pt-4">
        <button onClick={() => router.back()} className="text-white/60 text-sm">← Zpět</button>
        <div className="text-xs text-green-300 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </div>
      </div>

      <div className="px-6 pt-4">
        <h1 className="text-2xl font-extrabold">{headline}</h1>
        {yourRow && (
          <p className="text-white/60 text-sm mt-1">
            Jsi na <span className="text-white font-bold">{yourRow.rank}. místě</span>{" "}
            z {totalInList} {totalInList === 1 ? "hráče" : totalInList < 5 ? "hráčů" : "hráčů"}.
          </p>
        )}
      </div>

      <div className="flex-1 px-6 pt-4 pb-6">
        {loading ? (
          <p className="text-white/40 text-center mt-8 animate-pulse">Načítám…</p>
        ) : rows.length === 0 ? (
          <p className="text-white/40 text-center mt-8">Zatím žádní hráči.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                  r.isYou
                    ? "bg-blue-500/30 border-2 border-blue-400"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  r.rank === 1 ? "bg-yellow-400 text-black" :
                  r.rank === 2 ? "bg-gray-300 text-black" :
                  r.rank === 3 ? "bg-amber-600 text-white" :
                  "bg-white/10 text-white/60"
                }`}>
                  {r.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${r.isYou ? "text-blue-100" : "text-white"}`}>
                    {r.isYou ? "Vy" : r.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg">{r.total_points}</p>
                  <p className="text-white/40 text-xs">bodů</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav showQR={false} />
      <div className="pb-8" />
    </MobileContainer>
  );
}