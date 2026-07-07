
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_username TEXT,
  ADD COLUMN IF NOT EXISTS telegram_connect_code TEXT,
  ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_connect_code_key ON public.profiles(telegram_connect_code) WHERE telegram_connect_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx ON public.profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
