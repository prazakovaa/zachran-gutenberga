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

    /* Hráči bez jediného bodu se v žebříčku neukazují – jinak by seznam
       zaplnily prázdné účty. Výjimkou je ten, kdo se dívá: svoje místo
       má vidět vždycky, i s nulou. */
    const visible = (data ?? []).filter(
      (g) => (g.total_points ?? 0) > 0 || g.id === session.groupId
    );

    setRows(
      visible.map((g, i) => ({
        id: g.id,
        name: g.name,
        total_points: g.total_points ?? 0,
        rank: i + 1,
        isYou: g.id === session.groupId,
      }))
    );

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

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!session) return null;

  const yourRow = rows.find((r) => r.isYou);
  const total = rows.length;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <MobileContainer scrim="none">
      <div className="flex items-center justify-between px-4 pt-4">
        <button onClick={() => router.back()} className="text-paper/60 text-sm">
          ← Zpět
        </button>
        <div className="text-[11px] text-paper/60 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          LIVE
        </div>
      </div>

      <h2 className="text-center text-2xl font-extrabold tracking-[0.12em] uppercase pt-4 pb-2">
        Žebříček
      </h2>
      {session.mode === "group" && yourClassName && (
        <p className="text-center text-paper/50 text-xs -mt-1">třída {yourClassName}</p>
      )}

      {loading ? (
        <p className="text-paper/40 text-center mt-10 animate-pulse text-sm">Načítám…</p>
      ) : rows.length === 0 ? (
        <p className="text-paper/40 text-center mt-10 text-sm">Zatím nikdo nemá body.</p>
      ) : (
        <>
          {/* Stupně vítězů – druhý, první, třetí */}
          <div className="flex items-start justify-center gap-2 pt-6 px-4">
            {podium[1] && <PodiumItem row={podium[1]} place={2} />}
            {podium[0] && <PodiumItem row={podium[0]} place={1} />}
            {podium[2] && <PodiumItem row={podium[2]} place={3} />}
          </div>

          {/* Pruh s vlastním umístěním */}
          {yourRow && (
            <div
              className="mt-6 bg-ink/50 py-4 text-center"
              style={{ clipPath: "polygon(0 0, 50% 12px, 100% 0, 100% 100%, 0 100%)" }}
            >
              <p className="text-paper/70 text-sm pt-1">
                Jsi na <span className="text-paper font-bold">{yourRow.rank}. místě</span> z{" "}
                {total} {total === 1 ? "hráče" : "hráčů"}.
              </p>
            </div>
          )}

          {/* Zbytek pořadí */}
          <div className="flex flex-col gap-2 px-4 pt-4 pb-6">
            {rest.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${
                  r.isYou
                    ? "bg-gold/15 border border-gold/50"
                    : "bg-ink-soft/50 border border-paper/10"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-paper/10 text-paper/60 flex items-center justify-center text-xs font-bold shrink-0">
                  {r.rank}
                </div>
                <p className={`flex-1 min-w-0 truncate text-sm font-semibold ${r.isYou ? "text-gold" : "text-paper"}`}>
                  {r.isYou ? "Vy" : r.name}
                </p>
                <div className="text-right shrink-0 leading-none">
                  <p className="font-bold text-base">{r.total_points}</p>
                  <p className="text-paper/40 text-[10px] mt-0.5">bodů</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex-1" />
      <BottomNav showQR={false} />
      <div className="pb-24" />
    </MobileContainer>
  );
}

/* Medaile s praporkem. Praporky jsou hotová SVG v public/detail/. */
function PodiumItem({ row, place }: { row: LeaderRow; place: 1 | 2 | 3 }) {
  const flag =
    place === 1 ? "/detail/gold.svg" : place === 2 ? "/detail/silver.svg" : "/detail/bronze.svg";

  const medal =
    place === 1
      ? "bg-[#d9c531] text-ink"
      : place === 2
      ? "bg-[#d6d6d6] text-ink"
      : "bg-[#a5682a] text-ink";

  return (
    <div className={`flex flex-col items-center w-[104px] ${place === 1 ? "" : "mt-7"}`}>
      <div
        className={`relative z-10 w-[73px] h-[73px] rounded-full flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-ink/50 ${medal}`}
      >
        {place}
      </div>

      <div className="relative w-18 -mt-7">
        <img src={flag} alt="" aria-hidden="true" className="w-full h-auto" />
        <div className="absolute inset-x-0 top-[34%] px-2 text-center">
          <p className="text-[11px] font-bold uppercase truncate leading-tight">
            {row.isYou ? "Vy" : row.name}
          </p>
          <p className="text-[12px] leading-tight">{row.total_points} bodů</p>
        </div>
      </div>
    </div>
  );
}
