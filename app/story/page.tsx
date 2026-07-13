"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import MobileContainer from "@/components/layout/MobileContainer";

export default function StoryPage() {
  const router = useRouter();
  const { session } = useSession();

  useEffect(() => {
    if (!session) {
      router.replace("/");
      return;
    }

    const order = session.questionOrder ?? ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];
    const idx = session.currentQuestionIndex ?? 0;
    const qrValue = order[idx];

    router.replace(`/story/questions/${qrValue}`)
  }, [session, router]);

  return (
    <MobileContainer>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/60 text-lg animate-pulse">Načítání…</div>
      </div>
    </MobileContainer>
  );
}
