"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type SessionData = {
  mode: "solo" | "group";
  groupId?: string;
  groupName?: string;
  classId?: string | null;
  questionOrder?: string[];
  currentQuestionIndex?: number;
  // ❌ SMAŽ: lastScannedQR?: string;
  // ❌ SMAŽ: userEmail?: string;
};

type SessionCtx = {
  session: SessionData | null;
  loaded: boolean;
  setSession: (s: SessionData) => void;
  clearSession: () => void;
  advanceQuestion: () => void;
  // ❌ SMAŽ: setLastScannedQR: (qr: string) => void;
};

const Ctx = createContext<SessionCtx | null>(null);
const KEY = "zg_session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setSessionState(JSON.parse(raw));
    } catch {
    } finally {
      setLoaded(true);
    }
  }, []);

  const setSession = (s: SessionData) => {
    setSessionState(s);
    sessionStorage.setItem(KEY, JSON.stringify(s));
  };

  const clearSession = () => {
    setSessionState(null);
    sessionStorage.removeItem(KEY);
  };

  const advanceQuestion = () => {
    setSessionState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, currentQuestionIndex: (prev.currentQuestionIndex ?? 0) + 1 };
      sessionStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };
  
  return (
    <Ctx.Provider value={{ session, loaded, setSession, clearSession, advanceQuestion }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}