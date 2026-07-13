-- ============================================================
-- Zachraň Gutenberga – Supabase schema
-- Spusť celý tento soubor v Supabase > SQL Editor > New query
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
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
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
  completed_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. OTÁZKY (editovatelné v adminu)
CREATE TABLE questions (
  id              SERIAL PRIMARY KEY,
  order_number    INTEGER NOT NULL UNIQUE,
  background_url  TEXT,
  teaser_text     TEXT NOT NULL,
  detail_text     TEXT NOT NULL,
  question_text   TEXT NOT NULL,
  correct_answer  TEXT NOT NULL,
  qr_value        TEXT NOT NULL UNIQUE,
  max_points      INTEGER NOT NULL DEFAULT 10,
  answer_mode     TEXT NOT NULL DEFAULT 'text',   -- 'text' nebo 'photo'
  auto_grade      BOOLEAN NOT NULL DEFAULT TRUE,
  is_fixed_first  BOOLEAN DEFAULT FALSE,
  is_fixed_last   BOOLEAN DEFAULT FALSE
);

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
-- ============================================================

INSERT INTO questions
  (order_number, teaser_text, detail_text, question_text, correct_answer, qr_value, max_points, is_fixed_first, is_fixed_last)
VALUES
  (1,
   'Pan Gutenberg se ocitl v knihovně. Dívá se na obrovské regály plné knih a nechápavě kroutí hlavou.',
   'Gutenberg vidí v rohu místnosti informační tabuli s historií knihovny.',
   'V kterém roce bylo knihovnictví jako profese poprvé písemně doloženo v Čechách?',
   '1782',
   'q1', 15, TRUE, FALSE),

  (2,
   'Gutenberg přechází k prvnímu regálu. Záhadně mu připomíná jeho tiskárnu.',
   'Regál je plný encyklopedií z různých let. Nejstarší vydání pochází z 19. století.',
   'Jaký je latinský název pro encyklopedii – dílo obsahující shrnutí veškerého vědění?',
   'encyclopaedia',
   'q2', 10, FALSE, FALSE),

  (3,
   'Pan Gutenberg nachází stolek se starými mapami.',
   'Na mapách jsou zobrazeny středověké obchodní cesty, po nichž se knihy šířily do celé Evropy.',
   'Jak se jmenuje nejstarší dochovaná česky psaná kniha?',
   'Dalimilova kronika',
   'q3', 10, FALSE, FALSE),

  (4,
   'Gutenberg se zastaví u vitríny s rukopisy.',
   'Pod sklem leží pergameny popsané gotickým písmem. Jeden z nich je datován rokem 1350.',
   'Z čeho se vyráběl pergamen, na nějž se psalo ve středověku?',
   'kůže',
   'q4', 10, FALSE, FALSE),

  (5,
   'Naše výprava míří do oddělení vědy a techniky.',
   'Jsou zde knihy o vynálezech. Jedno z vydání je věnováno samotnému Gutenbergovi.',
   'Co byl hlavní technický přínos Gutenbergova knihtisku?',
   'pohyblivé typy',
   'q5', 10, FALSE, FALSE),

  (6,
   'V dětském oddělení pan Gutenberg poprvé spatřuje ilustrovanou knihu.',
   'Barevné obrázky ho fascinují – v jeho době byly knižní ilustrace ručně malované.',
   'Jak se nazývá technika tisku barevných obrázků vzniklá ve 20. století?',
   'ofset',
   'q6', 10, FALSE, FALSE),

  (7,
   'Gutenberg nachází čítárnu s novinami.',
   'Na stole leží výtisky denního tisku. Nejstarší novinový výtisk v expozici je z roku 1719.',
   'Jak se jmenují první noviny vydávané na území Čech?',
   'Pražské noviny',
   'q7', 10, FALSE, FALSE),

  (8,
   'Místnost plná starých knižních vazeb upoutá Gutenbergovu pozornost.',
   'Různé techniky vazby jsou popsány na informačních tabulích.',
   'Jak se nazývá technika vazby, při níž jsou listy sešity a přilepeny k hřbetu?',
   'lepená vazba',
   'q8', 10, FALSE, FALSE),

  (9,
   'Gutenberg se dostává do skladu archivních materiálů.',
   'Na policích jsou krabice se starými katalogizačními lístky – dnes je nahradil digitální katalog.',
   'Jak se nazývá systém desetinného třídění knih používaný v knihovnách (zkratka)?',
   'MDT',
   'q9', 10, FALSE, FALSE),

  (10,
   'Gutenberg se vrací k výchozímu bodu. Výlet ho naplnil úžasem.',
   'U výstupu z knihovny visí moderní plakát s citátem.',
   'Vyfoť se s plakátem (nebo s čímkoli v knihovně, co tě zaujme). Admin tvůj výtvor zhodnotí.',
   '',
   'q10', 15, FALSE, TRUE);

UPDATE questions SET answer_mode = 'photo', auto_grade = FALSE, correct_answer = '' WHERE qr_value = 'q10';