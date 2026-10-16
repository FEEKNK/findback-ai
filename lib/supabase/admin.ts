import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

/**
 * Supabase Admin Client (Service Role Client)
 * ใช้งานฝั่ง Server เท่านั้น - มีสิทธิ์ระดับสูง (Bypass RLS)
 * ใช้สำหรับงาน Background Job, Webhook, หรือการจัดการข้อมูลโดย Server
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  }

  // หากยังไม่ได้ใส่ Service Role Key ให้ใช้ Publishable Key แทน (จะติด RLS)
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error("Supabase API key is missing.");
  }

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
