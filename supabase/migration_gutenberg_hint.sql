-- ============================================================
-- Migrace: rozdělení Gutenbergových textů na dva
--
--   gutenberg_hint  = NÁPOVĚDA – bublina na stránce s legendou,
--                     hráč ji čte JEŠTĚ PŘED naskenováním QR kódu
--   gutenberg_note  = POZNÁMKA – bublina po správné odpovědi,
--                     reakce postavy na to, co se hráč dozvěděl
--
-- Spusť v Supabase → SQL Editor → New query.
-- ============================================================

ALTER TABLE questions ADD COLUMN IF NOT EXISTS gutenberg_hint TEXT;

-- Pokud jsi dosud psala do "poznámky" text, který patří na úvodní
-- obrazovku, odkomentuj následující dva příkazy – přesunou obsah
-- do nápovědy a poznámku vyprázdní, ať ji můžeš napsat znovu.
--
-- UPDATE questions SET gutenberg_hint = gutenberg_note;
-- UPDATE questions SET gutenberg_note = NULL;
