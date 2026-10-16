"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { evaluateAndProgressIntake } from "@/lib/ai-intake-engine";

export async function processChatMessage(message: string, sessionId?: string) {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  const sessionUser = await getCurrentUser();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const user = sessionUser || authUser;

  const effectiveSessionId = sessionId || user?.id || "web_guest_session";

  try {
    // ประมวลผลผ่าน Progressive Clarification Engine (จำบริบท + ถามเจาะจงต่อเนื่อง)
    const result = await evaluateAndProgressIntake(
      `web_${effectiveSessionId}`,
      message,
      user?.id || null
    );

    let matchCard = null;
    if (result.matchedItems && result.matchedItems.length > 0) {
      const topMatch = result.matchedItems[0];
      const emoji = topMatch.category?.includes("อิเล็กทรอนิกส์")
        ? "📱"
        : topMatch.category?.includes("กุญแจ")
        ? "🔑"
        : topMatch.category?.includes("บัตร")
        ? "💳"
        : "👜";

      matchCard = {
        itemId: topMatch.id,
        title: topMatch.title,
        imageEmoji: emoji,
        score: topMatch.matchScore || 70,
        location: topMatch.location_building || "จุดรับฝากส่วนกลาง",
        custodian: topMatch.dropoff_location || "จุดรับฝากของส่วนกลาง",
        claimCode: `#FB-${topMatch.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`,
        detail: topMatch.description || "พบรายการที่มีลักษณะใกล้เคียงกับที่คุณระบุ",
      };
    }

    if (result.insertedItem) {
      revalidatePath("/feed");
      revalidatePath("/dashboard");
      revalidatePath("/");
    }

    return {
      replyText: result.replyText,
      quickReplies: result.quickReplies,
      matchCard,
      insertedItem: result.insertedItem,
    };
  } catch (error) {
    console.error("[Process Chat Exception]:", error);
    return {
      replyText: "ขออภัยครับ เกิดข้อขัดข้องชั่วคราวในการประมวลผล กรุณาลองส่งใหม่อีกครั้งครับ",
      quickReplies: undefined,
      matchCard: null,
      insertedItem: null,
    };
  }
}

export async function createClaimFromChat(itemId: string) {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  const sessionUser = await getCurrentUser();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const user = sessionUser || authUser;

  if (!user) {
    return { error: "กรุณาเข้าสู่ระบบก่อนยืนยันการรับของ" };
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(itemId)) {
    return { error: "รายการนี้เป็นข้อมูลจำลอง ยังไม่สามารถเคลมได้จริง" };
  }

  // Check item existence, status, and ownership
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, status, user_id")
    .eq("id", itemId)
    .single();

  if (itemError || !item) {
    return { error: "ไม่พบข้อมูลสิ่งของในระบบ" };
  }

  if (item.status !== "OPEN") {
    return { error: "สิ่งของชิ้นนี้ถูกดำเนินการเคลมหรือส่งมอบไปแล้ว" };
  }

  if (item.user_id === user.id) {
    return { error: "คุณเป็นผู้ลงรายการสิ่งของนี้ จึงไม่สามารถยื่นเคลมของตนเองได้" };
  }

  // Create claim
  const { error } = await supabase.from("claims").insert({
    item_id: itemId,
    claimant_id: user.id,
    status: "PENDING",
  });

  if (error) {
    console.error("Create claim error:", error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกคำขอ: " + error.message };
  }

  // Update item status to MATCHED
  await supabase.from("items").update({ status: "MATCHED" }).eq("id", itemId);

  revalidatePath("/admin/claims");
  revalidatePath("/feed");
  return { success: true };
}
