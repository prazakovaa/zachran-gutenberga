"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { generateQuestionOrder } from "@/lib/questionOrder";

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useSession();
  const [pin, setPin] = useState("");
  const [groupName, setGroupName] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingPin, setCheckingPin] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const handlePinChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
    setClassId(null);
    setError("");
    if (cleaned.length === 6) {
      setCheckingPin(true);
      const { data, error: dbErr } = await supabase
        .from("classes").select("id, name").eq("pin", cleaned).single();
      setCheckingPin(false);
      if (dbErr || !data) setError("PIN třídy nenalezen.");
      else setClassId(data.id);
    }
  };

  useEffect(() => {
    const urlPin = searchParams.get("pin");
    if (urlPin && /^\d{6}$/.test(urlPin) && !autoFilled) {
      setAutoFilled(true);
      handlePinChange(urlPin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleJoin = async () => {
    if (!classId || !groupName.trim()) return;
    setLoading(true);
    setError("");
    const order = await generateQuestionOrder();
    const { data: group, error: dbErr } = await supabase
      .from("groups").insert({
        class_id: classId,
        name: groupName.trim(),
        question_order: order,
        total_points: 0,
        is_solo: false,
      }).select().single();

    if (dbErr || !group) {
      setError("Nepodařilo se vytvořit skupinu. Zkus to znovu.");
      setLoading(false);
      return;
    }

    setSession({
      mode: "group",
      groupId: group.id,
      groupName: group.name,
      classId,
      questionOrder: order,
      currentQuestionIndex: 0,
    });
    router.push("/intro");
  };

  const pinValid = classId !== null;

  return (
    <MobileContainer>
      <section className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <h1 className="text-3xl font-extrabold text-center mb-2">Zadej PIN třídy</h1>

        <div className="w-full relative">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            className={`w-full text-center text-4xl font-mono tracking-widest
                       bg-white/10 border-2 rounded-2xl py-4 text-white
                       placeholder:text-white/40 outline-none transition-all
                       ${pinValid ? "border-green-400" : error ? "border-red-400" : "border-white"}`}
            placeholder="000000"
          />
          {checkingPin && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-sm animate-pulse">…</span>
          )}
        </div>

        {error && <p className="text-red-300 text-sm font-medium">{error}</p>}

        {autoFilled && pinValid && (
          <p className="text-green-300 text-sm font-medium">✓ PIN načten z QR kódu</p>
        )}

        <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${
          pinValid ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}>
          <input
            type="text"
            maxLength={30}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full text-center text-2xl font-semibold
                       bg-white/10 border-2 border-white rounded-2xl py-4 text-white
                       placeholder:text-white/40 outline-none mt-1"
            placeholder="Název skupiny"
            autoFocus={pinValid}
          />
        </div>
      </section>

      <section className="p-6 pb-8 flex flex-col gap-3">
        <Button onClick={handleJoin} disabled={!pinValid || !groupName.trim() || loading}>
          {loading ? "Připojování…" : "ZAČÍT HRÁT"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/")}>
          ← Zpět na výběr
        </Button>
      </section>
    </MobileContainer>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  );
}