"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const sessionUser = await getCurrentUser();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const targetId = authUser?.id || sessionUser?.id;

  if (!targetId) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำการแก้ไขโปรไฟล์");
  }

  const full_name = (formData.get("full_name") as string)?.trim() || null;
  const student_id = (formData.get("student_id") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const line_user_id = (formData.get("line_user_id") as string)?.trim() || null;
  const preferred_contact = (formData.get("preferred_contact") as string)?.trim() || null;

  // หากตั้งค่า SUPABASE_SERVICE_ROLE_KEY ให้ใช้ Admin Client (API ระดับสูง Bypass RLS)
  const clientToUse = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : supabase;

  const { error } = await clientToUse
    .from("profiles")
    .upsert({
      id: targetId,
      full_name,
      student_id,
      phone,
      line_user_id,
      preferred_contact,
      updated_at: new Date().toISOString(),
    });



  if (error) {
    throw new Error("เกิดข้อผิดพลาดในการบันทึกโปรไฟล์: " + error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}
