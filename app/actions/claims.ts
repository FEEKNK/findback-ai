"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";
import { sendLineNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitClaim(formData: FormData) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error("กรุณาสมัครสมาชิกหรือเข้าสู่ระบบด้วยบัญชีจริงก่อนทำการยื่นขอเคลมสิ่งของครับ");
  }

  const itemId = formData.get("item_id") as string;
  const challengeAnswer = (formData.get("challenge_answer") as string)?.trim() || null;
  const proofDescription = (formData.get("proof_description") as string)?.trim() || null;

  let proofImageUrls: string[] = [];
  try {
    const rawUrls = formData.get("proof_image_urls") as string;
    if (rawUrls) {
      proofImageUrls = JSON.parse(rawUrls);
    }
  } catch {
    proofImageUrls = [];
  }

  if (!itemId) {
    throw new Error("ไม่พบรหัสสิ่งของ");
  }

  // 1. ตรวจสอบสถานะสิ่งของ
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, status, user_id, title")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    throw new Error("ไม่พบข้อมูลสิ่งของในระบบ");
  }

  if (item.status !== "OPEN") {
    throw new Error("สิ่งของชิ้นนี้ถูกดำเนินการเคลมหรือส่งมอบไปแล้ว");
  }

  if (item.user_id === authUser.id) {
    throw new Error("คุณเป็นผู้ลงรายการสิ่งของนี้ จึงไม่สามารถยื่นเคลมของตนเองได้");
  }

  // 2. สร้างเรคอร์ด Claim
  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .insert({
      item_id: itemId,
      claimant_id: authUser.id,
      challenge_answer: challengeAnswer,
      proof_description: proofDescription,
      proof_image_urls: proofImageUrls,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (claimError || !claim) {
    console.error("Error creating claim:", claimError);
    throw new Error("เกิดข้อผิดพลาดในการสร้างคำขอเคลม: " + claimError?.message);
  }

  // 3. ปรับสถานะสิ่งของเป็น CLAIMED
  await supabase
    .from("items")
    .update({ status: "CLAIMED" })
    .eq("id", itemId);

  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/admin/claims");

  redirect(`/claims/${claim.id}`);
}

export async function approveClaim(claimId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
  }

  // ป้องกัน Broken Access Control (OWASP A01): บังคับตรวจสิทธิ์ระดับ Admin/Staff
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    throw new Error("ไม่อนุญาต: การอนุมัติการเคลมต้องกระทำโดยเจ้าหน้าที่หรือผู้ดูแลระบบเท่านั้น");
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  // 1. ตรวจสอบ Claim
  const { data: claim, error: getError } = await supabase
    .from("claims")
    .select("id, item_id")
    .eq("id", claimId)
    .single();

  if (getError || !claim) {
    throw new Error("ไม่พบคำขอเคลมนี้");
  }

  // 2. อัปเดต Claim เป็น APPROVED
  const { error: claimUpdateError } = await supabase
    .from("claims")
    .update({
      status: "APPROVED",
      reviewed_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  if (claimUpdateError) {
    throw new Error("ไม่สามารถอนุมัติคำขอเคลมได้: " + claimUpdateError.message);
  }

  // 3. ปรับสถานะ Item เป็น RETURNED
  await supabase
    .from("items")
    .update({ status: "RETURNED" })
    .eq("id", claim.item_id);

  // แจ้งเตือนผู้เคลมผ่าน LINE OA (หากผูก line_user_id ไว้)
  try {
    const { data: claimWithUser } = await supabase
      .from("claims")
      .select("claimant_id, items (title, dropoff_location)")
      .eq("id", claimId)
      .single();

    if (claimWithUser?.claimant_id) {
      const { data: claimantProfile } = await supabase
        .from("profiles")
        .select("line_user_id")
        .eq("id", claimWithUser.claimant_id)
        .single();

      if (claimantProfile?.line_user_id) {
        const itemInfo = claimWithUser.items as { title?: string; dropoff_location?: string } | null;
        const msg = `🎉 FindBack: คำร้องขอรับของคืนได้รับการอนุมัติแล้ว!\n📦 สิ่งของ: "${itemInfo?.title || "รายการของคุณ"}"\n📍 จุดรับมอบ: ${itemInfo?.dropoff_location || "จุดรับฝากส่วนกลาง"}\nกรุณานำ Claim Pass หรือบัตรประจำตัวไปติดต่อรับของได้เลยครับ!`;
        sendLineNotification(claimantProfile.line_user_id, msg).catch(console.error);
      }
    }
  } catch (notifyErr) {
    console.error("[LINE Claim Notify Error]:", notifyErr);
  }

  revalidatePath("/admin/claims");
  revalidatePath(`/claims/${claimId}`);
  revalidatePath(`/items/${claim.item_id}`);
  revalidatePath("/feed");

  return { success: true };
}

export async function rejectClaim(claimId: string, reviewNote?: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
  }

  // ป้องกัน Broken Access Control (OWASP A01): บังคับตรวจสิทธิ์ระดับ Admin/Staff
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    throw new Error("ไม่อนุญาต: การปฏิเสธการเคลมต้องกระทำโดยเจ้าหน้าที่หรือผู้ดูแลระบบเท่านั้น");
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  const { data: claim, error: getError } = await supabase
    .from("claims")
    .select("id, item_id")
    .eq("id", claimId)
    .single();

  if (getError || !claim) {
    throw new Error("ไม่พบคำขอเคลมนี้");
  }

  // 1. อัปเดต Claim เป็น REJECTED
  const { error: claimUpdateError } = await supabase
    .from("claims")
    .update({
      status: "REJECTED",
      reviewed_by: user.id,
      review_note: reviewNote || null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", claimId);

  if (claimUpdateError) {
    throw new Error("ไม่สามารถปฏิเสธคำขอเคลมได้: " + claimUpdateError.message);
  }

  // 2. ปรับสถานะ Item คืนกลับเป็น OPEN
  await supabase
    .from("items")
    .update({ status: "OPEN" })
    .eq("id", claim.item_id);

  revalidatePath("/admin/claims");
  revalidatePath(`/claims/${claimId}`);
  revalidatePath(`/items/${claim.item_id}`);
  revalidatePath("/feed");

  return { success: true };
}
