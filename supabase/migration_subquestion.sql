-- ============================================================
-- Migrace: volitelná druhá podotázka
--
--   question_text_2  = znění druhé podotázky (prázdné = otázka je jen jedna)
--   correct_answer_2 = uznávané odpovědi na druhou podotázku
--
-- Spusť v Supabase → SQL Editor → New query.
-- ============================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_text_2 TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer_2 TEXT;
