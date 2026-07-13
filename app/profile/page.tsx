"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileContainer from "@/components/layout/MobileContainer";
import BottomNav from "@/components/layout/BottomNav";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

const ADJECTIVES = [
  "modrý", "zasněný", "mladý", "statečný", "chytrý", "milý", "tichý",
  "zvídavý", "tvořivý", "moudrý", "odvážný", "hravý", "laskavý",
  "bystrý", "klidný", "tajemný", "veselý", "pilný", "šikovný",
];
const NOUNS = [
  "knihomol", "čtenář", "hrdina", "badatel", "písař", "knihovník",
  "strážce", "kronikář", "vypravěč", "učitel", "mág", "poutník",
  "hledač", "svědek", "stopař", "kartograf", "alchymista", "básník",
];

function gen(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}_${n}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { session, setSession, clearSession } = useSession();
  const [className, setClassName] = useState<string>("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [authUser, setAuthUser] = useState<{ email: string; avatar?: string; name?: string } | null>(null);

  useEffect(() => {
    if (!session) { router.replace("/"); return; }
    setNewName(session.groupName ?? "");

    (async () => {
      if (session.classId) {
        const { data: cls } = await supabase
          .from("classes").select("name").eq("id", session.classId).single();
        setClassName(cls?.name ?? "");
      }

      const { count: qCount } = await supabase
        .from("questions").select("*", { count: "exact", head: true });
      setTotalQuestions(qCount ?? 0);

      if (session.groupId) {
        const { count: aCount } = await supabase
          .from("answers").select("*", { count: "exact", head: true }).eq("group_id", session.groupId);
        setAnsweredCount(aCount ?? 0);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthUser({
          email: user.email ?? "",
          avatar: user.user_metadata?.avatar_url,
          name: user.user_metadata?.full_name,
        });
      }
    })();
  }, [session, router]);

  const handleRename = async () => {
    if (!session?.groupId) return;
    const trimmed = newName.trim().toLowerCase();
    if (!/^[a-zá-ž0-9_]+$/.test(trimmed)) {
      setError("Jen písmena, čísla a podtržítko.");
      return;
    }
    if (trimmed === session.groupName) { setEditing(false); return; }

    // unikátnost (kromě svého vlastního jména)
    const { data: exists } = await supabase
      .from("groups")
      .select("id")
      .eq("name", trimmed)
      .eq(session.mode === "solo" ? "is_solo" : "class_id",
          session.mode === "solo" ? true : session.classId ?? "")
      .neq("id", session.groupId)
      .maybeSingle();

    if (exists) {
      setError("Toto jméno už někdo používá.");
      return;
    }

    const { error: upErr } = await supabase
      .from("groups").update({ name: trimmed }).eq("id", session.groupId);
    if (upErr) { setError(upErr.message); return; }

    setSession({ ...session, groupName: trimmed });
    setEditing(false);
    setError("");
  };

  const handleSignInGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    if (error) setError(error.message);
  };

  const handleSignInFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    if (error) setError(error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  };

  const handleLeaveGame = () => {
    if (!confirm("Opravdu chceš opustit hru? Tvoje odpovědi zůstanou v žebříčku.")) return;
    clearSession();
    router.push("/");
  };

  if (!session) return null;
  const remaining = totalQuestions - answeredCount;

  return (
    <MobileContainer>
      <div className="flex items-center justify-between px-4 pt-4">
        <button onClick={() => router.back()} className="text-white/60 text-sm">← Zpět</button>
        <h1 className="font-bold text-lg">Profil</h1>
        <div className="w-12" />
      </div>

      <div className="flex-1 px-6 pt-6 flex flex-col gap-6">
        {/* avatar + jméno */}
        <div className="flex flex-col items-center gap-3">
          {authUser?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={authUser.avatar} alt="" className="w-24 h-24 rounded-full border-4 border-white/20" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center text-4xl">
              {session.mode === "solo" ? "🎲" : "👥"}
            </div>
          )}

          {editing ? (
            <div className="w-full flex gap-2">
              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setError(""); }}
                className="flex-1 bg-white/10 border-2 border-white/30 rounded-xl px-3 py-2 text-white text-center font-mono"
                maxLength={30}
              />
              <button onClick={handleRename} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-3 py-2 text-sm font-bold">Uložit</button>
              <button onClick={() => { setEditing(false); setNewName(session.groupName ?? ""); }} className="bg-white/10 rounded-xl px-3 py-2 text-sm">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold">{session.groupName}</h2>
              {session.mode === "solo" && (
                <button
                  onClick={() => setEditing(true)}
                  className="bg-white/10 hover:bg-white/20 rounded-lg w-7 h-7 text-sm"
                  title="Změnit jméno"
                >
                  ✏️
                </button>
              )}
              {session.mode === "solo" && (
                <button
                  onClick={() => { setNewName(gen()); setEditing(true); }}
                  className="bg-white/10 hover:bg-white/20 rounded-lg w-7 h-7 text-sm"
                  title="Vygenerovat nové"
                >
                  🎲
                </button>
              )}
            </div>
          )}

          {session.mode === "group" && className && (
            <p className="text-white/60 text-sm">Třída <span className="font-bold text-white">{className}</span></p>
          )}
          {session.mode === "solo" && (
            <p className="text-white/60 text-sm">Sólo hráč</p>
          )}
          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        {/* statistiky */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-3xl font-extrabold text-yellow-300">{answeredCount}</p>
            <p className="text-white/50 text-xs uppercase tracking-wider mt-1">Zodpovězeno</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-3xl font-extrabold text-blue-300">{remaining}</p>
            <p className="text-white/50 text-xs uppercase tracking-wider mt-1">Zbývá</p>
          </div>
        </div>

                {/* OAuth – pouze pro sólo hráče */}
        {session.mode === "solo" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Účet</p>
            {authUser ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{authUser.name ?? authUser.email}</p>
                  <p className="text-white/50 text-xs truncate">{authUser.email}</p>
                </div>
                <button onClick={handleSignOut} className="text-white/40 hover:text-white text-xs">
                  Odhlásit
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSignInGoogle}
                  className="bg-white text-black rounded-xl py-2.5 font-bold flex items-center justify-center gap-2"
                >
                  🔵 Přihlásit se přes Google
                </button>
                <button
                  onClick={handleSignInFacebook}
                  className="bg-[#1877F2] text-white rounded-xl py-2.5 font-bold"
                >
                  f Přihlásit se přes Facebook
                </button>
                <p className="text-white/40 text-xs text-center mt-1">
                  Přihlášení ti umožní uložit progress a vrátit se ke hře.
                </p>
              </div>
            )}
          </div>
        )}

        <Button variant="secondary" onClick={handleLeaveGame}>
          Opustit hru
        </Button>
      </div>

      <BottomNav showQR={false} />
      <div className="pb-8" />
    </MobileContainer>
  );
}