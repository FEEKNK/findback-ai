-- ============================================================
-- FindBack Migration: Add chat_sessions for Multi-Turn AI Memory
-- วิธีใช้: Copy ทั้งหมดนี้ → Supabase Dashboard > SQL Editor > Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  line_user_id text,
  channel text DEFAULT 'WEB' CHECK (channel IN ('WEB', 'LINE')),
  draft jsonb DEFAULT '{}'::jsonb,
  history jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index สำหรับค้นหา Session
CREATE INDEX IF NOT EXISTS idx_chat_sessions_line_user_id ON public.chat_sessions(line_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on chat_sessions for server" ON public.chat_sessions FOR ALL USING (true);
