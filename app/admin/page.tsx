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
                        Foto odpověď
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
                          Zhodnotit
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
    const isPhoto = editing.answer_mode === "photo";
    const orderNum = Number(editing.order_number);

    // ── kontroly před uložením ──
    if (!Number.isFinite(orderNum) || orderNum < 1) {
      setMsg("Chyba: pořadí musí být celé číslo od 1 výš.");
      return;
    }
    const collision = questions.find(
      (q) => q.id !== editing.id && q.order_number === orderNum
    );
    if (collision) {
      setMsg(`Chyba: pořadí ${orderNum} už používá otázka „${collision.question_text.slice(0, 40)}…". Zvol jiné číslo.`);
      return;
    }
    if (!editing.qr_value.trim()) {
      setMsg("Chyba: vyplň hodnotu QR kódu.");
      return;
    }
    if (editing.is_fixed_first && editing.is_fixed_last) {
      setMsg("Chyba: otázka nemůže být zároveň pevně první i pevně poslední.");
      return;
    }

    setSaving(true);

    const payload = {
      order_number: orderNum,
      legend_text: editing.legend_text ?? "",
      question_text: editing.question_text,
      correct_answer: isPhoto ? "" : (editing.correct_answer ?? ""),
      gutenberg_note: editing.gutenberg_note?.trim() ? editing.gutenberg_note : null,
      qr_value: editing.qr_value.trim(),
      background_url: editing.background_url,
      max_points: Number(editing.max_points) || 0,
      is_fixed_first: !!editing.is_fixed_first,
      is_fixed_last: !!editing.is_fixed_last,
      answer_mode: editing.answer_mode,
      auto_grade: isPhoto ? false : editing.auto_grade,
    };

    // Pevně první / poslední smí být jen jedna otázka → ostatním to sebereme
    // JEŠTĚ PŘED uložením (jinak by narazila unikátní podmínka v DB).
    if (payload.is_fixed_first) {
      await supabase.from("questions").update({ is_fixed_first: false }).eq("is_fixed_first", true);
    }
    if (payload.is_fixed_last) {
      await supabase.from("questions").update({ is_fixed_last: false }).eq("is_fixed_last", true);
    }

    const { error } = editing.id
      ? await supabase.from("questions").update(payload).eq("id", editing.id)
      : await supabase.from("questions").insert(payload);

    setSaving(false);
    if (error) {
      const friendly = error.message.includes("order_number")
        ? `Pořadí ${orderNum} už je obsazené jinou otázkou.`
        : error.message.includes("qr_value")
        ? `QR hodnota „${payload.qr_value}" už patří jiné otázce.`
        : error.message;
      setMsg("Chyba: " + friendly);
      load();
      return;
    }
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

  // ── EDITOR OTÁZKY ────────────────────────────────────────────────────────
  if (editing !== null) {
    const isPhoto = editing.answer_mode === "photo";
    const others = questions.filter((q) => q.id !== editing.id);
    const orderNum = Number(editing.order_number);
    const orderCollision = others.find((q) => q.order_number === orderNum) ?? null;

    const usedOrders = new Set(others.map((q) => q.order_number));
    let freeOrder = 1;
    while (usedOrders.has(freeOrder)) freeOrder++;

    const otherFirst = others.find((q) => q.is_fixed_first) ?? null;
    const otherLast = others.find((q) => q.is_fixed_last) ?? null;

    const label = (text: string) => (
      <label className="text-white/50 text-xs uppercase tracking-wider">{text}</label>
    );

    const field = (
      key: keyof Question,
      labelText: string,
      opts: { multiline?: boolean; rows?: number; hint?: string; placeholder?: string } = {}
    ) => (
      <div key={String(key)} className="flex flex-col gap-1">
        {label(labelText)}
        {opts.multiline ? (
          <textarea
            value={String(editing[key] ?? "")}
            onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
            rows={opts.rows ?? 3}
            placeholder={opts.placeholder}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white resize-y outline-none focus:border-white/50 placeholder:text-white/25"
          />
        ) : (
          <input
            value={String(editing[key] ?? "")}
            onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
            placeholder={opts.placeholder}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white outline-none focus:border-white/50 placeholder:text-white/25"
          />
        )}
        {opts.hint && <p className="text-white/35 text-xs leading-relaxed">{opts.hint}</p>}
      </div>
    );

    const numberField = (key: "order_number" | "max_points", labelText: string) => (
      <input
        type="number"
        min={key === "order_number" ? 1 : 0}
        value={String(editing[key] ?? "")}
        onChange={(e) =>
          setEditing({ ...editing, [key]: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })
        }
        aria-label={labelText}
        className={`w-28 bg-white/10 border rounded-xl px-3 py-2 text-white outline-none ${
          key === "order_number" && orderCollision
            ? "border-orange-400 focus:border-orange-400"
            : "border-white/20 focus:border-white/50"
        }`}
      />
    );

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditing(null); setMsg(""); }} className="text-white/50 hover:text-white">
            ← Zpět
          </button>
          <h2 className="font-bold text-lg">
            {editing.id ? `Upravit otázku #${editing.order_number}` : "Nová otázka"}
          </h2>
        </div>

        {/* Typ odpovědi */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Typ odpovědi</p>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing({ ...editing, answer_mode: "text", auto_grade: true })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                !isPhoto ? "bg-blue-600 text-white" : "bg-white/10 text-white/60"
              }`}
            >
              Textová odpověď
            </button>
            <button
              onClick={() => setEditing({ ...editing, answer_mode: "photo", auto_grade: false })}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                isPhoto ? "bg-purple-600 text-white" : "bg-white/10 text-white/60"
              }`}
            >
              Foto odpověď
            </button>
          </div>
          <p className="text-white/35 text-xs mt-2">
            {isPhoto
              ? "Hráč nahraje fotku, slovní odpověď se nezadává. Body přiděluje admin ručně."
              : "Hráč píše odpověď, hra ji porovná se správnou odpovědí a boduje automaticky."}
          </p>
        </div>

        {/* Pořadí + vysvětlení */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              {label("Pořadí")}
              {numberField("order_number", "Pořadí")}
            </div>
            {orderCollision && (
              <button
                onClick={() => setEditing({ ...editing, order_number: freeOrder })}
                className="bg-orange-500/20 hover:bg-orange-500/35 text-orange-200 rounded-xl px-3 py-2 text-sm mb-0"
              >
                Použít volné #{freeOrder}
              </button>
            )}
          </div>

          {orderCollision && (
            <div className="bg-orange-500/15 border border-orange-400/40 rounded-xl px-3 py-2 text-orange-200 text-sm">
              <strong>Pořadí {orderNum} je už obsazené.</strong> Používá ho otázka „
              {orderCollision.question_text.slice(0, 60)}
              {orderCollision.question_text.length > 60 ? "…" : ""}". Každé číslo smí patřit
              jen jedné otázce — jinak se otázka neuloží.
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-400/25 rounded-xl px-3 py-2 text-blue-100/80 text-xs leading-relaxed">
            <p className="font-semibold text-blue-100 mb-1">Jak pořadí funguje</p>
            Číslo určuje, jak otázky <strong>navazují v řadě</strong> — sedmička jde vždy za
            šestkou a před osmičkou. Neurčuje ale, kolikátá se hráči zobrazí: každá skupina
            začíná na jiné otázce z řady a pokračuje dokola.
            <br />
            Pevné místo mají jen otázky označené <em>pevně první</em> a <em>pevně poslední</em>.
            <br />
            <span className="text-blue-200/60">
              Např.: skupina A → 1, 5, 6, 7, 8, 9, 2, 3, 4, 10 · skupina B → 1, 3, 4, 5, 6, 7, 8, 9, 2, 10
            </span>
            <br />
            <strong>Každé číslo použij jen jednou</strong> — obsazené je: {" "}
            {others.length
              ? others.map((q) => q.order_number).sort((a, b) => a - b).join(", ")
              : "zatím nic"}.
          </div>
        </div>

        {field("legend_text", "Legenda", {
          multiline: true,
          rows: 6,
          hint: "Úvod i doplňující text dohromady. Odstavce odděl prázdným řádkem.",
          placeholder: "Pan Gutenberg vchází do čítárny…\n\nNa stole leží výtisky denního tisku.",
        })}

        {field("question_text", isPhoto ? "Znění úkolu (co mají vyfotit)" : "Znění otázky", {
          multiline: true,
          rows: 3,
        })}

        {!isPhoto &&
          field("correct_answer", "Správná odpověď", {
            hint: "Porovnává se bez ohledu na velká/malá písmena a mezery na krajích.",
          })}

        {isPhoto && (
          <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl px-3 py-2 text-purple-200 text-sm">
            U foto odpovědi se správná odpověď nezadává — body přidělí admin ručně po zhlédnutí fotek.
          </div>
        )}

        {field("gutenberg_note", "Gutenbergova poznámka", {
          multiline: true,
          rows: 3,
          hint: "Komentář postavy, která hráče provází. Volitelné — když necháš prázdné, nezobrazí se.",
          placeholder: "Zprávy tištěné každý den? To je rychlost, jakou jsem si neuměl představit.",
        })}

        {field("qr_value", "QR kód hodnota", { placeholder: "např. q1" })}
        {field("background_url", "URL obrázku (volitelné)")}

        <div className="flex flex-col gap-1">
          {label(isPhoto ? "Max bodů (kolik může admin dát)" : "Max bodů")}
          {numberField("max_points", "Max bodů")}
        </div>

        {/* Pevné pozice */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <p className="text-white/50 text-xs uppercase tracking-wider">Pevná pozice</p>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={!!editing.is_fixed_first}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    is_fixed_first: e.target.checked,
                    is_fixed_last: e.target.checked ? false : editing.is_fixed_last,
                  })
                }
              />
              Pevně první
            </label>
            <label className="flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={!!editing.is_fixed_last}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    is_fixed_last: e.target.checked,
                    is_fixed_first: e.target.checked ? false : editing.is_fixed_first,
                  })
                }
              />
              Pevně poslední
            </label>
          </div>
          <p className="text-white/35 text-xs">
            Jedna otázka může být buď první, nebo poslední — ne obojí. Obojí smí být označená
            vždy jen jedna otázka z celé hry.
          </p>
          {editing.is_fixed_first && otherFirst && (
            <p className="text-orange-300 text-xs">
              Pevně první je teď otázka #{otherFirst.order_number} — po uložení jí to označení sebereme.
            </p>
          )}
          {editing.is_fixed_last && otherLast && (
            <p className="text-orange-300 text-xs">
              Pevně poslední je teď otázka #{otherLast.order_number} — po uložení jí to označení sebereme.
            </p>
          )}
        </div>

        {msg && (
          <p className={msg.startsWith("Chyba") ? "text-red-400 text-sm" : "text-green-400 text-sm"}>
            {msg}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !!orderCollision}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 rounded-xl py-2 font-bold"
          >
            {saving ? "Ukládám…" : "Uložit"}
          </button>
          <button onClick={() => { setEditing(null); setMsg(""); }} className="flex-1 bg-white/10 rounded-xl py-2">
            Zrušit
          </button>
        </div>
      </div>
    );
  }

  // ── SEZNAM OTÁZEK ────────────────────────────────────────────────────────
  const orderCounts = new Map<number, number>();
  questions.forEach((q) => orderCounts.set(q.order_number, (orderCounts.get(q.order_number) ?? 0) + 1));
  const duplicateOrders = [...orderCounts.entries()].filter(([, n]) => n > 1).map(([n]) => n);
  const firstCount = questions.filter((q) => q.is_fixed_first).length;
  const lastCount = questions.filter((q) => q.is_fixed_last).length;

  const nextFreeOrder = () => {
    const used = new Set(questions.map((q) => q.order_number));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Otázky ({questions.length})</h2>
        <button
          onClick={() => setEditing({
            id: 0, order_number: nextFreeOrder(), legend_text: "",
            question_text: "", correct_answer: "", gutenberg_note: "",
            qr_value: "", background_url: null,
            max_points: 10, is_fixed_first: false, is_fixed_last: false,
            answer_mode: "text", auto_grade: true,
          })}
          className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-bold"
        >
          + Nová otázka
        </button>
      </div>

      {duplicateOrders.length > 0 && (
        <div className="bg-orange-500/15 border border-orange-400/40 rounded-xl px-4 py-3 text-orange-200 text-sm">
          Pozor: pořadí {duplicateOrders.join(", ")} používá víc otázek najednou. Uprav je, ať má
          každá otázka své vlastní číslo.
        </div>
      )}
      {firstCount !== 1 && questions.length > 0 && (
        <div className="bg-orange-500/15 border border-orange-400/40 rounded-xl px-4 py-3 text-orange-200 text-sm">
          {firstCount === 0
            ? "Žádná otázka není označená jako pevně první — hra začne náhodnou otázkou."
            : `Pevně první je označeno ${firstCount} otázek. Nech označenou jen jednu.`}
        </div>
      )}
      {lastCount !== 1 && questions.length > 0 && (
        <div className="bg-orange-500/15 border border-orange-400/40 rounded-xl px-4 py-3 text-orange-200 text-sm">
          {lastCount === 0
            ? "Žádná otázka není označená jako pevně poslední — hra skončí náhodnou otázkou."
            : `Pevně poslední je označeno ${lastCount} otázek. Nech označenou jen jednu.`}
        </div>
      )}

      {msg && <p className={msg.startsWith("Chyba") ? "text-red-400 text-sm" : "text-green-400 text-sm"}>{msg}</p>}

      {questions.map((q) => {
        const isPhoto = q.answer_mode === "photo";
        const meta = [
          !isPhoto && q.correct_answer ? `Odpověď: ${q.correct_answer}` : null,
          `${q.max_points} bodů`,
          `QR: ${q.qr_value}`,
          q.is_fixed_first ? "vždy první" : null,
          q.is_fixed_last ? "vždy poslední" : null,
        ].filter(Boolean).join(" · ");

        return (
          <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="bg-blue-600/50 text-xs px-2 py-0.5 rounded-full font-mono">
                  #{q.order_number}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isPhoto ? "bg-purple-600/30 text-purple-300" : "bg-green-600/30 text-green-400"
                }`}>
                  {isPhoto ? "Foto odpověď" : "Textová odpověď"}
                </span>
              </div>
              <p className="text-white/80 text-sm truncate">{q.question_text}</p>
              <p className="text-white/40 text-xs mt-0.5">{meta}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => { setMsg(""); setEditing(q); }} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 text-sm">
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
                  Fotogalerie
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
                          Prezentace · otázka #{q.order_number}
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