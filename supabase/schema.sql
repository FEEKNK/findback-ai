-- =========================================================================
-- FINDBACK DATABASE SCHEMA (v3.0)
-- 1. Run this entire script in Supabase > SQL Editor > New Query > Run
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE (ข้อมูลผู้ใช้/นักศึกษา)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  student_id text,
  phone text,
  line_user_id text,          -- LINE User ID สำหรับ Push Notification / Bot
  preferred_contact text,     -- ช่องทางติดต่อที่สะดวก เช่น LINE @somchai, โทร 081-xxx, ห้อง A101
  role text DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'STAFF')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger: สร้าง Profile อัตโนมัติเมื่อมีการสมัครสมาชิกใหม่ในระบบ (auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 2. ITEMS TABLE (รายการสิ่งของ หาย/เจอ)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('LOST', 'FOUND')),
  title text NOT NULL,
  description text,
  category text,
  
  -- รูปภาพ และ สถานที่
  image_urls text[] DEFAULT '{}'::text[],
  location_building text,
  location_floor text,
  location_detail text,
  
  -- จุดรับฝากของ และ สถานที่รับคืน (Drop-off point เช่น ป้อม รปภ., ประชาสัมพันธ์)
  dropoff_location text,
  secret_challenge text, -- optional
  
  -- AI Metadata (อัปเดตอัตโนมัติจาก n8n + Gemini)
  ai_tags text[] DEFAULT '{}'::text[],
  ai_category text,
  ai_color text,
  ai_metadata jsonb DEFAULT '{}'::jsonb,
  ai_status text DEFAULT 'PENDING' CHECK (ai_status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
  retry_count integer DEFAULT 0,
  
  -- Status และ Timestamps
  status text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MATCHED', 'CLAIMED', 'RETURNED', 'EXPIRED')),
  event_date timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT timezone('utc'::text, now() + interval '60 days') NOT NULL
);

-- Index สำหรับค้นหา (Performance)
CREATE INDEX idx_items_type_status ON public.items (type, status);
CREATE INDEX idx_items_ai_status ON public.items (ai_status);


-- ==========================================
-- 3. CLAIMS TABLE (การเคลม/ขอยื่นรับของคืน)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  claimant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  challenge_answer text, -- คำตอบของ secret_challenge
  proof_description text,
  proof_image_urls text[] DEFAULT '{}'::text[],
  
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note text,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at timestamp with time zone
);


-- ==========================================
-- 4. MATCH_SUGGESTIONS TABLE (ระบบจับคู่อัตโนมัติ)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.match_suggestions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  lost_item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  found_item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  
  score integer NOT NULL, -- Match Score (เช่น 85)
  match_details jsonb DEFAULT '{}'::jsonb,
  notified boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(lost_item_id, found_item_id)
);


-- ==========================================
-- 5. TRIGGERS (Auto-update updated_at)
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ==========================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_suggestions ENABLE ROW LEVEL SECURITY;

-- Profiles: ทุกคนดู profile พื้นฐานได้, สร้างและแก้ไขได้เฉพาะของตัวเอง
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Items: ทุกคนดูได้, สร้างได้ต้องล็อกอิน, แก้/ลบได้เฉพาะคนสร้าง หรือเจ้าหน้าที่
CREATE POLICY "Anyone can view items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create items" ON public.items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.items FOR UPDATE USING (
  auth.uid() = user_id 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
);
CREATE POLICY "Users can delete own items" ON public.items FOR DELETE USING (auth.uid() = user_id);

-- Claims: เจ้าของ Item, เจ้าหน้าที่ หรือ คนที่ยื่นเคลม ดูและอัปเดตได้
CREATE POLICY "Users can view related claims" ON public.claims FOR SELECT 
  USING (
    auth.uid() = claimant_id 
    OR auth.uid() IN (SELECT user_id FROM public.items WHERE id = item_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
  );
CREATE POLICY "Users can create claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = claimant_id);
CREATE POLICY "Users and staff can update claims" ON public.claims FOR UPDATE 
  USING (
    auth.uid() = claimant_id 
    OR auth.uid() IN (SELECT user_id FROM public.items WHERE id = item_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
  );

-- Match Suggestions: เจ้าของของหาย หรือ เจ้าของของเจอ ดูได้
CREATE POLICY "Users can view their matches" ON public.match_suggestions FOR SELECT 
  USING (
    auth.uid() IN (SELECT user_id FROM public.items WHERE id = lost_item_id)
    OR auth.uid() IN (SELECT user_id FROM public.items WHERE id = found_item_id)
  );


-- ==========================================
-- 7. STORAGE BUCKETS (สำหรับเก็บรูปภาพ)
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'item-photos', 'item-photos', true, 
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'claim-proofs', 'claim-proofs', true, 
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage Policies: item-photos
CREATE POLICY "Anyone can view item photos" ON storage.objects FOR SELECT USING (bucket_id = 'item-photos');
CREATE POLICY "Authenticated users can upload item photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update/delete their own item photos" ON storage.objects FOR UPDATE USING (bucket_id = 'item-photos' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own item photos" ON storage.objects FOR DELETE USING (bucket_id = 'item-photos' AND auth.uid() = owner);

-- Storage Policies: claim-proofs
CREATE POLICY "Auth can view claim proofs" ON storage.objects FOR SELECT USING (bucket_id = 'claim-proofs' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can upload claim proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'claim-proofs' AND auth.role() = 'authenticated');
