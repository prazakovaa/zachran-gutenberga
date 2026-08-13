-- ============================================================
-- Zachraň Gutenberga – Supabase schema
-- Spusť celý tento soubor v Supabase > SQL Editor > New query
-- (Pro EXISTUJÍCÍ databázi nespouštěj tohle, ale
--  supabase/migration_legend_gutenberg_note.sql)
-- ============================================================

-- 1. TŘÍDY (vytvořeny knihovníkem, obsahují PIN)
CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin         TEXT NOT NULL UNIQUE,          -- 6místný PIN
  name        TEXT NOT NULL,                 -- např. "7.B"
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. SKUPINY (vytvoří hráči při přihlášení)
CREATE TABLE groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE,
  user_id         UUID,
  is_solo         BOOLEAN NOT NULL DEFAULT FALSE,
  name            TEXT NOT NULL,             -- název skupiny
  question_order  TEXT[] NOT NULL,           -- pořadí otázek jako qr_value ["q1","q6","q7","q10"]
  total_points    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. ODPOVĚDI skupin
CREATE TABLE answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  question_id   INTEGER NOT NULL,
  answer_text   TEXT NOT NULL,
  points_earned INTEGER NOT NULL,
  attempts      INTEGER NOT NULL,
  photo_url     TEXT,                        -- u foto odpovědí
  admin_graded  BOOLEAN NOT NULL DEFAULT FALSE,
  admin_points  INTEGER,
  admin_comment TEXT,
  completed_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. OTÁZKY (editovatelné v adminu)
CREATE TABLE questions (
  id              SERIAL PRIMARY KEY,
  order_number    INTEGER NOT NULL UNIQUE,   -- místo v řadě otázek, každé číslo jen jednou
  background_url  TEXT,                      -- URL obrázku z Supabase Storage
  legend_text     TEXT NOT NULL DEFAULT '',  -- Legenda: úvod + doplňující text
  question_text   TEXT NOT NULL,             -- znění otázky (u foto: co mají vyfotit)
  correct_answer  TEXT DEFAULT '',           -- správná odpověď (u foto prázdná)
  gutenberg_note  TEXT,                      -- poznámka od Gutenberga (volitelná)
  qr_value        TEXT NOT NULL UNIQUE,      -- hodnota v QR kódu (např. "q1")
  max_points      INTEGER DEFAULT 10,
  answer_mode     TEXT NOT NULL DEFAULT 'text',   -- 'text' | 'photo'
  auto_grade      BOOLEAN NOT NULL DEFAULT TRUE,  -- foto otázky boduje admin ručně
  is_fixed_first  BOOLEAN DEFAULT FALSE,     -- pevně první v pořadí (max jedna)
  is_fixed_last   BOOLEAN DEFAULT FALSE      -- pevně poslední v pořadí (max jedna)
);

-- Pevně první / poslední smí být vždy nejvýš jedna otázka
CREATE UNIQUE INDEX questions_one_fixed_first
  ON questions (is_fixed_first) WHERE is_fixed_first;
CREATE UNIQUE INDEX questions_one_fixed_last
  ON questions (is_fixed_last) WHERE is_fixed_last;

-- ============================================================
-- RLS (Row Level Security) – základní bezpečnostní pravidla
-- ============================================================

ALTER TABLE classes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups    ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Otázky: všichni mohou číst (hra je veřejná)
CREATE POLICY "questions_read" ON questions
  FOR SELECT TO anon, authenticated USING (true);

-- Třídy: všichni mohou číst (potřebujeme PIN lookup)
CREATE POLICY "classes_read" ON classes
  FOR SELECT TO anon, authenticated USING (true);

-- Skupiny: všichni mohou číst a vytvářet, editovat jen vlastní (přes group_id)
CREATE POLICY "groups_read" ON groups
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "groups_insert" ON groups
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "groups_update" ON groups
  FOR UPDATE TO anon, authenticated USING (true);

-- Odpovědi: všichni mohou vkládat a číst
CREATE POLICY "answers_read" ON answers
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "answers_insert" ON answers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- FUNKCE pro atomické přičítání bodů
-- ============================================================

CREATE OR REPLACE FUNCTION increment_group_points(gid UUID, pts INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE groups SET total_points = total_points + pts WHERE id = gid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- UKÁZKOVÁ DATA – 10 otázek pro příběh
-- (upravitelné v adminu /admin)
--
-- order_number = místo v řadě, ne pořadí zobrazení. Hráč začíná
-- na náhodné otázce z řady a pokračuje dokola; pevné místo mají
-- jen otázky s is_fixed_first / is_fixed_last.
-- ============================================================

INSERT INTO questions
  (order_number, legend_text, question_text, correct_answer, gutenberg_note,
   qr_value, max_points, answer_mode, auto_grade, is_fixed_first, is_fixed_last)
VALUES
  (1,
   E'Pan Gutenberg se ocitl v knihovně. Dívá se na obrovské regály plné knih a nechápavě kroutí hlavou.\n\nV rohu místnosti si všímá informační tabule s historií knihovny.',
   'V kterém roce bylo knihovnictví jako profese poprvé písemně doloženo v Čechách?',
   '1782',
   'Tolik knih na jednom místě! A žádnou z nich jsem netiskl já. Kdo se o ně tedy stará?',
   'q1', 15, 'text', TRUE, TRUE, FALSE),

  (2,
   E'Gutenberg přechází k prvnímu regálu. Záhadně mu připomíná jeho tiskárnu.\n\nRegál je plný encyklopedií z různých let. Nejstarší vydání pochází z 19. století.',
   'Jaký je latinský název pro encyklopedii – dílo obsahující shrnutí veškerého vědění?',
   'encyclopaedia',
   'Veškeré vědění světa v jedné knize? To by se mi v dílně náramně hodilo.',
   'q2', 10, 'text', TRUE, FALSE, FALSE),

  (3,
   E'Pan Gutenberg nachází stolek se starými mapami.\n\nNa mapách jsou zobrazeny středověké obchodní cesty, po nichž se knihy šířily do celé Evropy.',
   'Jak se jmenuje nejstarší dochovaná česky psaná kniha?',
   'Dalimilova kronika',
   'Po těchhle cestách putovaly i mé první tisky. Trvalo to měsíce.',
   'q3', 10, 'text', TRUE, FALSE, FALSE),

  (4,
   E'Gutenberg se zastaví u vitríny s rukopisy.\n\nPod sklem leží pergameny popsané gotickým písmem. Jeden z nich je datován rokem 1350.',
   'Z čeho se vyráběl pergamen, na nějž se psalo ve středověku?',
   'kůže',
   'Než jsem přišel s papírem a lisem, psalo se právě na tohle. Draho a pomalu.',
   'q4', 10, 'text', TRUE, FALSE, FALSE),

  (5,
   E'Naše výprava míří do oddělení vědy a techniky.\n\nJsou zde knihy o vynálezech. Jedno z vydání je věnováno samotnému Gutenbergovi.',
   'Co byl hlavní technický přínos Gutenbergova knihtisku?',
   'pohyblivé typy',
   'Počkat… tahle kniha je o mně? To je ale zvláštní pocit.',
   'q5', 10, 'text', TRUE, FALSE, FALSE),

  (6,
   E'V dětském oddělení pan Gutenberg poprvé spatřuje ilustrovanou knihu.\n\nBarevné obrázky ho fascinují – v jeho době byly knižní ilustrace ručně malované.',
   'Jak se nazývá technika tisku barevných obrázků vzniklá ve 20. století?',
   'ofset',
   'Ty barvy! Každý takový obrázek by u nás maloval mistr celý týden.',
   'q6', 10, 'text', TRUE, FALSE, FALSE),

  (7,
   E'Gutenberg nachází čítárnu s novinami.\n\nNa stole leží výtisky denního tisku. Nejstarší novinový výtisk v expozici je z roku 1719.',
   'Jak se jmenují první noviny vydávané na území Čech?',
   'Pražské noviny',
   'Zprávy tištěné každý den? To je rychlost, jakou jsem si neuměl představit.',
   'q7', 10, 'text', TRUE, FALSE, FALSE),

  (8,
   E'Místnost plná starých knižních vazeb upoutá Gutenbergovu pozornost.\n\nRůzné techniky vazby jsou popsány na informačních tabulích.',
   'Jak se nazývá technika vazby, při níž jsou listy sešity a přilepeny k hřbetu?',
   'lepená vazba',
   'Vazba drží knihu pohromadě. Bez ní by z mého díla zbyla jen hromádka listů.',
   'q8', 10, 'text', TRUE, FALSE, FALSE),

  (9,
   E'Gutenberg se dostává do skladu archivních materiálů.\n\nNa policích jsou krabice se starými katalogizačními lístky – dnes je nahradil digitální katalog.',
   'Jak se nazývá systém desetinného třídění knih používaný v knihovnách (zkratka)?',
   'MDT',
   'Takže i knihy mají svůj řád a číslo. Chytré. Já je skládal podle toho, kde bylo místo.',
   'q9', 10, 'text', TRUE, FALSE, FALSE),

  (10,
   E'Gutenberg se vrací k výchozímu bodu. Výlet ho naplnil úžasem.\n\nU východu z knihovny visí moderní plakát s citátem.',
   'Vyfoť se s plakátem (nebo s čímkoli v knihovně, co tě zaujme).',
   '',
   'Děkuji ti. Vracím se do své dílny s tím, že mé písmo žije dál. Ukaž mi ještě, co tě tu nejvíc zaujalo.',
   'q10', 15, 'photo', FALSE, FALSE, TRUE);
