-- ============================================================
-- Migrace: question_order z INTEGER[] na TEXT[]
--
-- Proč: pořadí otázek se dřív ukládalo jako pořadová čísla
-- (order_number) a routa se skládala jako "q" + číslo. To ale
-- selhávalo, pokud qr_value neodpovídá "q" + order_number
-- (např. otázky q1, q6, q7, q10 s order_number 1,2,3,4).
-- Nově se do question_order ukládá přímo skutečná hodnota
-- qr_value dané otázky, takže sloupec musí být textové pole.
--
-- Spusť v Supabase > SQL Editor. Staré skupiny (groups), které
-- už mají uložené číselné pořadí, se touto migrací převedou
-- na "q" + číslo (odpovídá původnímu chování/qr_value formátu
-- "q1".."q10"). Pokud používáš jiný formát qr_value, uprav
-- si prosím ten "'q' ||" řádek podle svého skutečného formátu.
-- ============================================================

ALTER TABLE groups
  ALTER COLUMN question_order TYPE TEXT[]
  USING (
    ARRAY(SELECT 'q' || elem::text FROM unnest(question_order) AS elem)
  );
