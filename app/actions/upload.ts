"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function uploadImageAction(formData: FormData): Promise<{ publicUrl: string }> {
  const file = formData.get("file") as File;
  const bucket = (formData.get("bucket") as string) || "item-photos";

  if (!file) {
    throw new Error("ไม่พบไฟล์รูปภาพที่ต้องการอัปโหลด");
  }

  // ใช้ Admin Client (Service Role) เพื่อ Bypass RLS ป้องกันข้อผิดพลาด permission
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  const ext = "webp";
  const randomId = Math.random().toString(36).substring(2, 9);
  const fileName = `${Date.now()}_${randomId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return { publicUrl: urlData.publicUrl };
}
