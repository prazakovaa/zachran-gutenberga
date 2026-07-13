"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

export default function EndPage() {
  const router = useRouter();
  const { session, clearSession } = useSession();
  const [totalPoints, setTotalPoints] = useState<number | null>(null);

  useEffect(() => {
    if (session?.groupId) {
      supabase
        .from("groups")
        .select("total_points")
        .eq("id", session.groupId)
        .single()
        .then(({ data }) => {
          if (data) setTotalPoints(data.total_points);
        });
    }
  }, [session]);

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div className="text-6xl mb-2">📚</div>
        <h1 className="text-4xl font-extrabold">Gratulujeme!</h1>
        <p className="text-white/70 text-lg leading-relaxed max-w-xs">
          Pomohl jsi Gutenbergovi poznat celou knihovnu. Výborná práce!
        </p>

        {session?.mode === "group" && totalPoints !== null && (
          <div className="bg-white/10 rounded-2xl px-8 py-5 mt-2">
            <p className="text-white/60 text-sm uppercase tracking-wider mb-1">Celkem bodů</p>
            <p className="text-5xl font-extrabold text-yellow-300">{totalPoints}</p>
            <p className="text-white/60 text-sm mt-1">{session.groupName}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full mt-4">
          {session?.mode === "group" && (
            <button
              onClick={() => router.push("/leaderboard")}
              className="w-full bg-white text-[#0B5ED7] rounded-3xl font-black text-xl py-5 shadow-xl"
            >
              ŽEBŘÍČEK
            </button>
          )}
          <button
            onClick={() => {
              clearSession();
              router.push("/");
            }}
            className="w-full border-2 border-white text-white rounded-3xl font-black text-xl py-5"
          >
            HRÁT ZNOVU
          </button>
        </div>
      </div>
    </MobileContainer>
  );
}
