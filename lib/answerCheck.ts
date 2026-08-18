/**
 * Porovnávání odpovědí hráče se správnou odpovědí.
 *
 * Uznává se odpověď bez ohledu na velikost písmen, diakritiku, přebytečné
 * mezery a interpunkci na konci. Admin může do pole napsat víc variant
 * oddělených čárkou – stačí trefit kteroukoli z nich.
 */

/** Sjednotí zápis: malá písmena, bez diakritiky, bez zdvojených mezer. */
export function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // odstraní háčky a čárky
    .replace(/[.,;!?]+$/g, "")       // koncová interpunkce
    .replace(/\s+/g, " ");           // víc mezer za sebou → jedna
}

/** Rozdělí pole se správnou odpovědí na jednotlivé uznávané varianty. */
export function acceptedAnswers(correct: string | null | undefined): string[] {
  return (correct ?? "")
    .split(",")
    .map((variant) => normalise(variant))
    .filter(Boolean);
}

/** Sedí odpověď hráče na některou z uznávaných variant? */
export function isAnswerCorrect(
  given: string,
  correct: string | null | undefined
): boolean {
  const variants = acceptedAnswers(correct);
  if (variants.length === 0) return false;
  return variants.includes(normalise(given));
}

/** První varianta v původním zápisu – tu ukazujeme, když dojdou pokusy. */
export function primaryAnswer(correct: string | null | undefined): string {
  return (correct ?? "").split(",")[0]?.trim() ?? "";
}
