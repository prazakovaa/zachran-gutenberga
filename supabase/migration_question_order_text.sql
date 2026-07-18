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
-- Postgres nepovoluje poddotaz přímo v "ALTER COLUMN ... TYPE
-- ... USING (...)" (chyba 0A000), proto jdeme přes dočasný
-- sloupec: přidáme nový TEXT[] sloupec, naplníme ho převedenými
-- hodnotami, smažeme starý sloupec a nový přejmenujeme zpět.
--
-- Pokud tvůj formát qr_value NENÍ "q" + číslo, uprav si prosím
-- řádek s "'q' || elem::text" podle skutečného formátu předtím,
-- než migraci spustíš.
-- ============================================================

-- 1) dočasný sloupec
ALTER TABLE groups ADD COLUMN question_order_text TEXT[];

-- 2) převod hodnot (zachová pořadí díky WITH ORDINALITY)
UPDATE groups
SET question_order_text = (
  SELECT array_agg('q' || elem::text ORDER BY ord)
  FROM unnest(question_order) WITH ORDINALITY AS t(elem, ord)
);

-- 3) NOT NULL stejně jako měl původní sloupec
ALTER TABLE groups ALTER COLUMN question_order_text SET NOT NULL;

-- 4) smazat starý číselný sloupec
ALTER TABLE groups DROP COLUMN question_order;

-- 5) přejmenovat nový sloupec na původní název
ALTER TABLE groups RENAME COLUMN question_order_text TO question_order;

