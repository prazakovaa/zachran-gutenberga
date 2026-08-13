-- ============================================================
-- Migrace: nová struktura otázky
--
--   teaser_text + detail_text  →  legend_text (Legenda)
--   nově:                          gutenberg_note (Gutenbergova poznámka)
--   correct_answer                 už smí být prázdná (foto otázky)
--
-- Spusť celý soubor v Supabase → SQL Editor → New query.
-- Migrace je psaná tak, aby šla spustit i opakovaně.
-- ============================================================

-- 1) Nový sloupec pro legendu
ALTER TABLE questions ADD COLUMN IF NOT EXISTS legend_text TEXT;

-- 2) Sloučit starý teaser + detail do jedné legendy
--    (jen tam, kde legenda ještě není vyplněná)
UPDATE questions
SET legend_text = btrim(
      coalesce(teaser_text, '') || E'\n\n' || coalesce(detail_text, '')
    )
WHERE legend_text IS NULL OR legend_text = '';

-- 3) Gutenbergova poznámka (komentář postavy, volitelná)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS gutenberg_note TEXT;

-- 4) Legenda je povinná
UPDATE questions SET legend_text = '' WHERE legend_text IS NULL;
ALTER TABLE questions ALTER COLUMN legend_text SET DEFAULT '';
ALTER TABLE questions ALTER COLUMN legend_text SET NOT NULL;

-- 5) U foto otázek nemá správná odpověď smysl → smí být prázdná
ALTER TABLE questions ALTER COLUMN correct_answer DROP NOT NULL;
ALTER TABLE questions ALTER COLUMN correct_answer SET DEFAULT '';
UPDATE questions SET correct_answer = '' WHERE correct_answer IS NULL;

-- 6) Zahodit staré sloupce
ALTER TABLE questions DROP COLUMN IF EXISTS teaser_text;
ALTER TABLE questions DROP COLUMN IF EXISTS detail_text;

-- ============================================================
-- Pojistky na úrovni databáze
-- ============================================================

-- Pevně první / pevně poslední smí být vždy nejvýš jedna otázka.
-- (Admin to hlídá i sám, tohle je záchranná brzda, kdyby se data
--  měnila jinudy než přes admin rozhraní.)
CREATE UNIQUE INDEX IF NOT EXISTS questions_one_fixed_first
  ON questions (is_fixed_first) WHERE is_fixed_first;

CREATE UNIQUE INDEX IF NOT EXISTS questions_one_fixed_last
  ON questions (is_fixed_last) WHERE is_fixed_last;

-- Pořadové číslo už UNIQUE je (z původního schématu), admin na
-- kolizi upozorní ještě před uložením.
