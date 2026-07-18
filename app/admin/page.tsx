"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import QuestionQRDownload from "@/components/admin/QuestionQRDownload";

type Question = Database["public"]["Tables"]["questions"]["Row"];
type ClassRow = Database["public"]["Tables"]["classes"]["Row"];
type Group = Database["public"]["Tables"]["groups"]["Row"];
type Answer = Database["public"]["Tables"]["answers"]["Row"];

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "gutenberg2024";

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  const handleLogin = () => {
    if (pw === ADMIN_PASSWORD) {
      localStorage.setItem("admin_auth", "1");
      onLogin();
    } else {
      setErr(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center mb-4">Admin — Zachraň Gutenberga</h1>
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="Heslo"
          className={`w-full bg-white/10 border rounded-xl px-4 py-3 outline-none text-white
                      placeholder:text-white/40 ${err ? "border-red-500" : "border-white/20"}`}
        />
        {err && <p className="text-red-400 text-sm">Špatné heslo.</p>}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-bold"
        >
          Přihlásit se
        </button>
      </div>
    </div>
  );
}

// ─── Group detail modal ───────────────────────────────────────────────────────
function GroupDetailModal({
  group,
  questions,
  onClose,
  onUpdated,
}: {
  group: Group;
  questions: Question[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [answers, setAnswers] = useState<(Answer & { question?: Question })[]>([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { points: number; comment: string }>>({});

  const loadAnswers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("answers")
      .select("*")
      .eq("group_id", group.id)
      .order("completed_at", { ascending: true });
    const merged = (data ?? []).map((a) => ({
      ...a,
      question: questions.find((q) => q.id === a.question_id),
    }));
    setAnswers(merged);
    setLoading(false);
  }, [group.id, questions]);

  useEffect(() => { loadAnswers(); }, [loadAnswers]);

  const handleGrade = async (answerId: string, maxPoints: number) => {
    const input = gradeInputs[answerId];
    if (!input) return;
    const pts = Math.max(0, Math.min(maxPoints, input.points || 0));
    setGrading(answerId);

    const answer = answers.find((a) => a.id === answerId);
    if (!answer) { setGrading(null); return; }

    // 1) Ulož admin hodnocení
    const { error } = await supabase
      .from("answers")
      .update({
        admin_points: pts,
        admin_graded: true,
        admin_comment: input.comment || null,
        points_earned: pts,
      })
      .eq("id", answerId);

    if (error) { alert("Chyba: " + error.message); setGrading(null); return; }

    // 2) Přičti body ke skupině (nahradí 0 z původního vložení)
    const oldPoints = answer.points_earned ?? 0;
    const delta = pts - oldPoints;
    if (delta !== 0) {
      await supabase.rpc("increment_group_points", { gid: group.id, pts: delta });
    }

    setGrading(null);
    await loadAnswers();
    onUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-950/90 backdrop-blur py-3 -mx-4 px-4 z-10">
          <div>
            <h2 className="text-xl font-bold">{group.name}</h2>
            <p className="text-white/40 text-sm">{group.total_points} bodů celkem</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm">
            ← Zpět
          </button>
        </div>

        {loading ? (
          <p className="text-white/50 text-center py-8 animate-pulse">Načítám odpovědi…</p>
        ) : answers.length === 0 ? (
          <p className="text-white/40 text-center py-8">Tato skupina zatím neodpověděla na žádnou otázku.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {answers.map((a) => {
              const q = a.question;
              const isPhoto = q?.answer_mode === "photo";
              const isGraded = a.admin_graded;

              return (
                <div key={a.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600/50 text-xs px-2 py-0.5 rounded-full">
                      #{q?.order_number ?? "?"}
                    </span>
                    <span className="font-semibold text-sm flex-1 truncate">
                      {q?.question_text ?? `Otázka #${a.question_id}`}
                    </span>
                    {isPhoto && (
                      <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">
                        📷 foto
                      </span>
                    )}
                  </div>

                  {/* Text odpověď */}
                  {!isPhoto && (
                    <div className="bg-white/5 rounded-lg p-3 mb-2">
                      <p className="text-white/90 text-sm">{a.answer_text}</p>
                      <p className="text-white/40 text-xs mt-1">
                        {a.attempts} {a.attempts === 1 ? "pokus" : "pokusy"} · {a.points_earned} bodů
                      </p>
                    </div>
                  )}

                  {/* Foto odpověď */}
                  {isPhoto && a.photo_url && (
                    <div className="bg-white/5 rounded-lg p-2 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.photo_url}
                        alt="Odpověď skupiny"
                        className="w-full max-h-80 object-contain rounded-lg bg-black"
                      />
                    </div>
                  )}

                  {/* Admin hodnocení (jen pro foto, nebo pro text kde admin chce upravit body) */}
                  {(isPhoto || true) && (
                    <div className="border-t border-white/10 pt-3 mt-2">
                      {isGraded ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-400 text-sm font-semibold">
                              ✓ Zhodnoceno: {a.admin_points} bodů
                            </p>
                            {a.admin_comment && (
                              <p className="text-white/50 text-xs mt-1 italic">
                                „{a.admin_comment}"
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setGradeInputs((prev) => ({
                              ...prev,
                              [a.id]: { points: a.admin_points ?? 0, comment: a.admin_comment ?? "" },
                            }))}
                            className="text-white/40 hover:text-white text-xs"
                          >
                            Upravit
                          </button>
                        </div>
                      ) : null}

                      {(isPhoto || gradeInputs[a.id]) && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <label className="text-white/60 text-xs">Body (max {q?.max_points ?? 0}):</label>
                            <input
                              type="number"
                              min={0}
                              max={q?.max_points ?? 0}
                              value={gradeInputs[a.id]?.points ?? 0}
                              onChange={(e) => setGradeInputs((prev) => ({
                                ...prev,
                                [a.id]: {
                                  points: parseInt(e.target.value) || 0,
                                  comment: prev[a.id]?.comment ?? "",
                                },
                              }))}
                              className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-sm"
                            />
                            <button
                              onClick={() => handleGrade(a.id, q?.max_points ?? 10)}
                              disabled={grading === a.id}
                              className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 rounded-lg px-3 py-1 text-sm font-bold"
                            >
                              {isGraded ? "Uložit změnu" : "Uložit hodnocení"}
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Komentář (volitelný, např. pro žebříček)"
                            value={gradeInputs[a.id]?.comment ?? ""}
                            onChange={(e) => setGradeInputs((prev) => ({
                              ...prev,
                              [a.id]: { points: prev[a.id]?.points ?? 0, comment: e.target.value },
                            }))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-white/30"
                          />
                        </div>
                      )}

                      {isPhoto && !isGraded && !gradeInputs[a.id] && (
                        <button
                          onClick={() => setGradeInputs((prev) => ({
                            ...prev,
                            [a.id]: { points: q?.max_points ?? 5, comment: "" },
                          }))}
                          className="bg-purple-600 hover:bg-purple-500 rounded-lg px-3 py-1.5 text-sm font-bold mt-2"
                        >
                          ✏️ Zhodnotit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Questions tab ────────────────────────────────────────────────────────────
function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("questions").select("*").order("order_number");
    setQuestions(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      order_number: editing.order_number,
      teaser_text: editing.teaser_text,
      detail_text: editing.detail_text,
      question_text: editing.question_text,
      correct_answer: editing.correct_answer,
      qr_value: editing.qr_value,
      background_url: editing.background_url,
      max_points: editing.max_points,
      is_fixed_first: editing.is_fixed_first,
      is_fixed_last: editing.is_fixed_last,
      answer_mode: editing.answer_mode,
      auto_grade: editing.answer_mode === "photo" ? false : editing.auto_grade,
    };
    const { error } = editing.id
      ? await supabase.from("questions").update(payload).eq("id", editing.id)
      : await supabase.from("questions").insert(payload);

    setSaving(false);
    if (error) { setMsg("Chyba: " + error.message); return; }
    setMsg("Uloženo ✓");
    setEditing(null);
    load();
    setTimeout(() => setMsg(""), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Opravdu smazat otázku?")) return;
    await supabase.from("questions").delete().eq("id", id);
    load();
  };

  if (editing !== null) {
    const isPhoto = editing.answer_mode === "photo";
    const field = (key: keyof Question, label: string, multiline = false) => (
      <div key={key} className="flex flex-col gap-1">
        <label className="text-white/50 text-xs uppercase tracking-wider">{label}</label>
        {multiline ? (
          <textarea
            value={String(editing[key] ?? "")}
            onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
            rows={3}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white resize-none outline-none focus:border-white/50"
          />
        ) : (
          <input
            value={String(editing[key] ?? "")}
            onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white outline-none focus:border-white/50"
          />
        )}
      </div>
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(null)} className="text-white/50 hover:text-white">
            ← Zpět
          </button>
          <h2 className="font-bold text-lg">{editing.id ? `Upravit otázku #${editing.order_number}` : "Nová otázka"}</h2>
        </div>

        {/* Typ odpovědi */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Typ odpovědi</p>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing({ ...editing, answer_mode: "text" })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                !isPhoto ? "bg-blue-600 text-white" : "bg-white/10 text-white/60"
              }`}
            >
              ✏️ Textová (auto bodování)
            </button>
            <button
              onClick={() => setEditing({ ...editing, answer_mode: "photo", auto_grade: false })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                isPhoto ? "bg-purple-600 text-white" : "bg-white/10 text-white/60"
              }`}
            >
              📷 Fotka (ruční hodnocení)
            </button>
          </div>
        </div>

        {field("order_number", "Pořadí")}
        {field("teaser_text", "Teaser text", true)}
        {field("detail_text", "Detail text", true)}
        {field("question_text", isPhoto ? "Instrukce (co mají vyfotit)" : "Otázka", true)}

        {!isPhoto && field("correct_answer", "Správná odpověď (lowercase)")}
        {isPhoto && (
          <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl px-3 py-2 text-purple-200 text-sm">
            ℹ️ Tato otázka se neboduje automaticky. Body přidělí admin ručně po zhlédnutí fotek.
          </div>
        )}

        {field("qr_value", "QR kód hodnota (např. q1)")}
        {field("background_url", "URL obrázku (volitelné)")}
        {field("max_points", isPhoto ? "Max bodů (kolik může admin dát)" : "Max bodů")}

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={!!editing.is_fixed_first}
              onChange={(e) => setEditing({ ...editing, is_fixed_first: e.target.checked })}
            />
            Pevně první
          </label>
          <label className="flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={!!editing.is_fixed_last}
              onChange={(e) => setEditing({ ...editing, is_fixed_last: e.target.checked })}
            />
            Pevně poslední
          </label>
        </div>

        {msg && <p className="text-green-400 text-sm">{msg}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-xl py-2 font-bold"
          >
            {saving ? "Ukládám…" : "Uložit"}
          </button>
          <button onClick={() => setEditing(null)} className="flex-1 bg-white/10 rounded-xl py-2">
            Zrušit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Otázky ({questions.length})</h2>
        <button
          onClick={() => setEditing({
            id: 0, order_number: questions.length + 1, teaser_text: "", detail_text: "",
            question_text: "", correct_answer: "", qr_value: "", background_url: null,
            max_points: 10, is_fixed_first: false, is_fixed_last: false,
            answer_mode: "text", auto_grade: true,
          })}
          className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-bold"
        >
          + Nová otázka
        </button>
      </div>
      {msg && <p className="text-green-400 text-sm">{msg}</p>}
      {questions.map((q) => {
        const isPhoto = q.answer_mode === "photo";
        return (
          <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="bg-blue-600/50 text-xs px-2 py-0.5 rounded-full">#{q.order_number}</span>
                <span className="text-white/40 text-xs font-mono">{q.qr_value}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isPhoto ? "bg-purple-600/30 text-purple-300" : "bg-green-600/30 text-green-400"
                }`}>
                  {isPhoto ? "📷 foto" : "✏️ text"}
                </span>
                {q.is_fixed_first && <span className="text-xs bg-green-600/30 text-green-400 px-2 py-0.5 rounded-full">1.</span>}
                {q.is_fixed_last && <span className="text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded-full">poslední</span>}
              </div>
              <p className="text-white/80 text-sm truncate">{q.question_text}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {isPhoto ? "Max " : "Odpověď: " + q.correct_answer + " · "}
                {q.max_points} bodů
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => setEditing(q)} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">
                Upravit
              </button>
              <QuestionQRDownload qrValue={q.qr_value} origin={origin} />
              {isPhoto && (
                <a
                  href={`/admin/gallery/${q.id}`}
                  target="_blank"
                  rel="noopener"
                  className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg px-3 py-1.5 text-sm text-center"
                >
                  🖼️ Fotogalerie
                </a>
              )}
              <button onClick={() => handleDelete(q.id)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg px-3 py-1.5 text-sm">
                Smazat
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Classes tab ──────────────────────────────────────────────────────────────
function ClassesTab() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groups, setGroups] = useState<Record<string, Group[]>>({});
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [origin, setOrigin] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const loadClasses = useCallback(async () => {
    const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
    setClasses(data ?? []);
  }, []);

  const loadQuestions = useCallback(async () => {
    const { data } = await supabase.from("questions").select("*").order("order_number");
    setQuestions(data ?? []);
  }, []);

  useEffect(() => { loadClasses(); loadQuestions(); }, [loadClasses, loadQuestions]);

  const loadGroups = async (classId: string) => {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("class_id", classId)
      .order("total_points", { ascending: false });
    setGroups((prev) => ({ ...prev, [classId]: data ?? [] }));
  };

  const handleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    await loadGroups(id);
  };

  const handleCreate = async () => {
    if (!newClassName.trim()) {
      setMsg("Chyba: zadej název třídy");
      return;
    }
    setCreating(true);
    setMsg("");
    const pin = generatePin();
    const { error } = await supabase.from("classes").insert({ pin, name: newClassName.trim() });
    setCreating(false);
    if (error) { setMsg("Chyba: " + error.message); return; }
    setMsg(`Třída vytvořena · PIN: ${pin}`);
    setNewClassName("");
    loadClasses();
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Smazat třídu a všechny skupiny?")) return;
    await supabase.from("groups").delete().eq("class_id", id);
    await supabase.from("classes").delete().eq("id", id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const handleDeleteGroup = async (classId: string, groupId: string) => {
    if (!confirm("Smazat skupinu?")) return;
    await supabase.from("answers").delete().eq("group_id", groupId);
    await supabase.from("groups").delete().eq("id", groupId);
    setGroups((prev) => ({
      ...prev,
      [classId]: (prev[classId] ?? []).filter((g) => g.id !== groupId),
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-lg">Třídy</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="new-class-name" className="text-white/70 text-sm font-medium">
          Název nové třídy
        </label>
        <div className="flex gap-2">
          <input
            id="new-class-name"
            value={newClassName}
            onChange={(e) => { setNewClassName(e.target.value); setMsg(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="např. 7.B"
            className="flex-1 bg-white/15 border-2 border-white/40 rounded-xl px-4 py-3
                       text-white text-lg outline-none focus:border-blue-400
                       placeholder:text-white/50"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newClassName.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-white/10
                       disabled:text-white/30 rounded-xl px-5 py-3 font-bold
                       shrink-0 transition-colors"
          >
            {creating ? "…" : "+ Vytvořit"}
          </button>
        </div>
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-mono ${
            msg.startsWith("Chyba")
              ? "bg-red-600/20 border border-red-500/30 text-red-300"
              : "bg-green-600/20 border border-green-500/30 text-green-300"
          }`}>
            {msg}
          </div>
        )}
      </div>

      {classes.map((cls) => (
        <div key={cls.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5"
            onClick={() => handleExpand(cls.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{cls.name}</p>
              <p className="text-yellow-300 text-3xl font-mono font-bold tracking-widest mt-1 select-all">
                {cls.pin}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}
              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg px-3 py-1 text-xs"
            >
              Smazat
            </button>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              className={`transition-transform shrink-0 ${expanded === cls.id ? "rotate-180" : ""}`}
            >
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          {expanded === cls.id && (
            <div className="border-t border-white/10 px-4 py-4 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 bg-black/30 rounded-2xl p-4">
                <p className="text-white/70 text-xs uppercase tracking-wider text-center">
                  PIN pro žáky
                </p>
                <p className="text-yellow-300 text-5xl font-mono font-bold tracking-widest select-all">
                  {cls.pin}
                </p>
                <div className="bg-white p-3 rounded-2xl mt-2">
                  {origin ? (
                    <QRCodeSVG
                      value={`${origin}/join?pin=${cls.pin}`}
                      size={200}
                      level="M"
                    />
                  ) : (
                    <div style={{ width: 200, height: 200 }} className="bg-white/10" />
                  )}
                </div>
                <p className="text-white/50 text-xs text-center">
                  Naskenuj QR kód telefonem · PIN se vyplní sám
                </p>
                <p className="text-white/30 text-[10px] text-center font-mono break-all">
                  {origin}/join?pin={cls.pin}
                </p>
              </div>

              {questions.filter((q) => q.answer_mode === "photo").length > 0 && (
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                    Prezentace fotoodpovědí
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {questions
                      .filter((q) => q.answer_mode === "photo")
                      .map((q) => (
                        <a
                          key={q.id}
                          href={`/admin/present/${cls.id}/${q.id}`}
                          target="_blank"
                          rel="noopener"
                          className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg px-3 py-1.5 text-sm"
                        >
                          📺 Prezentace {q.order_number}. otázky
                        </a>
                      ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
                  Skupiny ({(groups[cls.id] ?? []).length})
                </p>
                {(groups[cls.id] ?? []).length === 0 ? (
                  <p className="text-white/30 text-sm">
                    Zatím žádné skupiny. Žáci se připojí přes /join s tímto PINem.
                  </p>
                ) : (
                  (groups[cls.id] ?? []).map((g) => (
                    <div key={g.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{g.name}</p>
                        <p className="text-white/40 text-xs">{g.total_points} bodů</p>
                      </div>
                      <button
                        onClick={() => setSelectedGroup(g)}
                        className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded-lg px-3 py-1 text-xs"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(cls.id, g.id)}
                        className="text-red-400/70 hover:text-red-400 text-xs shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {selectedGroup && (
        <GroupDetailModal
          group={selectedGroup}
          questions={questions}
          onClose={() => setSelectedGroup(null)}
          onUpdated={() => {
            // Přenačti skupiny, aby se projevily nové body
            if (expanded) loadGroups(expanded);
            loadClasses();
          }}
        />
      )}
    </div>
  );
}

// ─── Main Admin ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"questions" | "classes">("questions");

  useEffect(() => {
    if (localStorage.getItem("admin_auth") === "1") setAuthed(true);
  }, []);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-lg">Zachraň Gutenberga · Admin</h1>
        <button
          onClick={() => { localStorage.removeItem("admin_auth"); setAuthed(false); }}
          className="text-white/40 hover:text-white text-sm"
        >
          Odhlásit
        </button>
      </div>

      <div className="flex border-b border-white/10">
        {(["questions", "classes"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              tab === t ? "border-b-2 border-blue-500 text-blue-400" : "text-white/50 hover:text-white"
            }`}
          >
            {t === "questions" ? "Otázky" : "Třídy"}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {tab === "questions" ? <QuestionsTab /> : <ClassesTab />}
      </div>
    </div>
  );
}