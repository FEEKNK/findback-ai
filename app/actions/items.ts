"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { triggerSmartIntake } from "@/app/actions/n8n";
import { executeMatchScan } from "@/lib/matching";


export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error("กรุณาสมัครสมาชิกหรือเข้าสู่ระบบด้วยบัญชีจริงก่อนทำการแจ้งรายการสิ่งของครับ");
  }

  // ดึงข้อมูลจากฟอร์ม
  const type = ((formData.get("type") as string) || "FOUND").toUpperCase() as "LOST" | "FOUND";
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const location_building = (formData.get("building") as string)?.trim() || null;
  const location_floor = (formData.get("floor") as string)?.trim() || null;
  const location_detail = (formData.get("detail") as string)?.trim() || null;
  const dropoff_location = (formData.get("custodian") as string)?.trim() || null;
  const secret_challenge = (formData.get("secret_challenge") as string)?.trim() || null;

  let image_urls: string[] = [];
  try {
    const rawImages = formData.get("image_urls") as string;
    if (rawImages) {
      image_urls = JSON.parse(rawImages);
    }
  } catch {
    image_urls = [];
  }

  if (!title) {
    throw new Error("กรุณาระบุชื่อสิ่งของ");
  }

  // Insert ลงฐานข้อมูล
  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: authUser.id,
      type,
      title,
      description,
      category,
      location_building,
      location_floor,
      location_detail,
      dropoff_location: type === "FOUND" ? dropoff_location : null,
      secret_challenge: type === "FOUND" ? secret_challenge : null,
      image_urls,
      status: "OPEN",
      ai_status: "PENDING",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating item:", error);
    throw new Error("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
  }

  // ส่ง webhook ไปยัง background workflow และรันการจับคู่ทันที
  triggerSmartIntake(data.id).catch(console.error);
  executeMatchScan(data.id).catch(console.error);

  // เคลียร์ Cache และไปหน้ารายละเอียดสิ่งของ
  revalidatePath("/");
  revalidatePath("/feed");
  redirect(`/items/${data.id}`);
}
