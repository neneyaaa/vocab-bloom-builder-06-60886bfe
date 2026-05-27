ALTER TABLE public.words ADD COLUMN IF NOT EXISTS stage text;
CREATE INDEX IF NOT EXISTS idx_words_stage ON public.words(stage) WHERE enabled = true;