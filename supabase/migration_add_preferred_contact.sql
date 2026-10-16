-- ============================================================
-- FindBack Migration: Add preferred_contact to profiles
-- วิธีใช้: Copy ทั้งหมดนี้ → Supabase Dashboard > SQL Editor > Run
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_contact text;

-- ตรวจสอบว่าเพิ่มสำเร็จ
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
