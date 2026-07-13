import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────
// Pravidlo:
// - otázka označená v adminu jako „vždy první" (is_fixed_first) je vždy
//   na 1. místě
// - otázka označená jako „vždy poslední" (is_fixed_last) je vždy na
//   posledním místě
// - zbylé („prostřední") otázky jdou popořadě podle order_number, ale
//   celá řada je otočená (rotovaná) od náhodně zvoleného startu – takže
//   hráč začne na náhodné otázce a pak pokračuje popořadě dál, s
//   přetečením zpět na začátek prostřední části.
//
// Příklad pro otázky 1–10 (1 = vždy první, 10 = vždy poslední,
// prostřední = 2,3,4,5,6,7,8,9):
//   start na 6 → 1, 6,7,8,9, 2,3,4,5, 10
//   start na 4 → 1, 4,5,6,7,8,9, 2,3, 10
// ─────────────────────────────────────────────────────────────────────────
export async function generateQuestionOrder(): Promise<string[]> {
  const FALLBACK = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];

  const { data, error } = await supabase
    .from("questions")
    .select("qr_value, order_number, is_fixed_first, is_fixed_last")
    .order("order_number");

  if (error || !data || data.length === 0) {
    return FALLBACK;
  }

  const firstQ = data.find((q) => q.is_fixed_first) ?? null;
  const lastQ = data.find((q) => q.is_fixed_last) ?? null;

  const middle = data
    .filter(
      (q) =>
        q.order_number !== firstQ?.order_number &&
        q.order_number !== lastQ?.order_number
    )
    .map((q) => q.qr_value);

  let rotated = middle;
  if (middle.length > 1) {
    const start = Math.floor(Math.random() * middle.length);
    rotated = [...middle.slice(start), ...middle.slice(0, start)];
  }

  const order: string[] = [];
  if (firstQ) order.push(firstQ.qr_value);
  order.push(...rotated);
  if (lastQ) order.push(lastQ.qr_value);

  return order.length > 0 ? order : FALLBACK;
}
