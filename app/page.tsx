"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import MobileContainer from "@/components/layout/MobileContainer";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { generateQuestionOrder } from "@/lib/questionOrder";

// ─── Generátor knihovních jmen ────────────────────────────────────────────────
const ADJECTIVES = [
  "modrý", "zasněný", "mladý", "statečný", "chytrý", "milý", "tichý",
  "zvídavý", "tvořivý", "moudrý", "odvážný", "hravý", "laskavý",
  "bystrý", "klidný", "tajemný", "veselý", "pilný", "šikovný",
  "prozíravý", "nadaný", "zvědavý", "všímavý", "věrný", "romantický",
  "zvědavý", "tichý", "bledý", "ostrý", "bledý",
];
const NOUNS = [
  "knihomol", "čtenář", "hrdina", "badatel", "písař", "knihovník",
  "strážce", "kronikář", "vypravěč", "učitel", "mág", "poutník",
  "hledač", "svědek", "stopař", "kartograf", "alchymista", "básník",
  "detektiv", "luštitel", "archivář", "průzkumník", "učenec", "myslivec",
];

function genName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}_${n}`;
}


export default function Home() {
  const router = useRouter();
  const { setSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSolo = async () => {
    if (loading) return;
    setLoading(true);
    setStatus("Připravujeme tvé jméno…");

    let name = "";
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = genName();
      const { data: exists } = await supabase
        .from("groups")
        .select("id")
        .eq("name", candidate)
        .eq("is_solo", true)
        .maybeSingle();
      if (!exists) { name = candidate; break; }
    }
    if (!name) {
      name = `${genName()}_${Math.floor(Math.random() * 1000)}`;
    }

    setStatus("Vytváříme tvou hru…");

    const order = await generateQuestionOrder();
    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        class_id: null,
        name,
        question_order: order,
        total_points: 0,
        is_solo: true,
      })
      .select()
      .single();

    if (error || !group) {
      setStatus("Nepodařilo se spustit hru. Zkus to znovu.");
      setLoading(false);
      return;
    }

    setSession({
      mode: "solo",
      groupId: group.id,
      groupName: group.name,
      classId: null,
      questionOrder: order,
      currentQuestionIndex: 0,
    });

    router.push("/intro");
  };

  return (
    <MobileContainer bg="/backgrounds/bg1.webp" bgOpacity={20}>
      <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 animate-rise pb-5">
          <img src="/logo.svg" alt="" width={150} height={30} />
        </div>

        <h1 className="font-scribble text-5xl font-extrabold leading-tight">
          Zachraň
          <br />
          Gutenberga
        </h1>
        <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-xs">
          Zažij dobrodružství mezi knihami.
        </p>

        {loading && (
          <p className="mt-6 text-white/50 text-sm animate-pulse">{status}</p>
        )}
      </section>

      <section className="p-15 pb-25 flex flex-col gap-5">
        <Button onClick={handleSolo} disabled={loading}>
          {loading ? "…" : "HRÁT"}
        </Button>
        <Button onClick={() => router.push("/join")} variant="secondary" disabled={loading}>
          HRÁT JAKO TŘÍDA
        </Button>
      </section>
    </MobileContainer>
  );
}