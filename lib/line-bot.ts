/**
 * LINE Bot Handler
 * รับข้อความจากผู้ใช้ LINE → AI Progressive Intake (จำบริบท + ถามเจาะจงเรื่อยๆ)
 * ค้นหา Supabase → reply ด้วย Flex Carousel พร้อมข้อมูลติดต่อ
 * Auto-bind LINE User ID กับ profile เมื่อคุยครั้งแรก
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTextMessage,
  buildSingleFlexMessage,
  buildCarouselMessage,
  withQuickReplies,
  FoundItemCard,
} from "@/lib/line-reply";
import { evaluateAndProgressIntake, MatchedItemRecord } from "@/lib/ai-intake-engine";

const LINE_TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();

// ─── ส่ง Reply กลับ LINE Platform ────────────────────────────────────────────
async function lineReply(replyToken: string, messages: object[]) {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[LINE Reply Error]:", res.status, errText);
    } else {
      console.log(`[LINE Reply Success]: Successfully sent ${messages.length} messages to LINE!`);
    }
  } catch (err) {
    console.error("[LINE Reply Exception]:", err);
  }
}

// ─── Auto-bind LINE User ID ───────────────────────────────────────────────────
async function bindLineUserId(lineUserId: string, displayName: string) {
  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("profiles")
        .update({ line_user_id: lineUserId })
        .eq("full_name", displayName)
        .is("line_user_id", null);
    }
  } catch (err) {
    console.error("[LINE AutoBind Error]:", err);
  }
}

function maskPhoneNumber(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-xxx-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-xxx-${cleaned.slice(5)}`;
  }
  return phone;
}

// ─── แปลงรายการ DB เป็น FoundItemCard สำหรับ Flex Message ───────────────────
function formatFoundCards(items: MatchedItemRecord[]): FoundItemCard[] {
  return items.map((item) => {
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    return {
      itemId: item.id,
      title: item.title,
      category: item.category || "ของใช้ทั่วไป",
      location: item.location_building || "ไม่ระบุสถานที่",
      dropoffLocation: item.dropoff_location || undefined,
      contactName: profile?.full_name || undefined,
      contactPhone: maskPhoneNumber(profile?.phone),
      contactPreferred: profile?.preferred_contact || undefined,
      imageUrl: item.image_urls?.[0] || undefined,
      status: item.status || "OPEN",
      score: item.matchScore,
    };
  });
}

// ─── Handler หลัก: รับ LINE event ────────────────────────────────────────────
export async function handleLineMessage(event: {
  replyToken: string;
  message: { type: string; text?: string };
  source: { userId: string; type: string };
}) {
  const { replyToken, message, source } = event;
  if (message.type !== "text" || !message.text) return;

  const lineUserId = source.userId;
  const userText = message.text.trim();

  // ดึงชื่อผู้ใช้ LINE เพื่อ auto-bind profile
  try {
    const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    });
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      await bindLineUserId(lineUserId, profileData.displayName || "");
    }
  } catch {
    /* ไม่ block flow */
  }

  // ค้นหา user_id ในระบบ profiles ที่ผูกกับ lineUserId นี้ไว้
  const supabase = createAdminClient();
  const { data: boundProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  // ─── เรียกใช้ AI Progressive Clarification Engine ───
  // Session ID อิงตาม lineUserId ทำให้บอทจำบริบทได้ตลอด 2 ชั่วโมง
  const result = await evaluateAndProgressIntake(
    `line_${lineUserId}`,
    userText,
    boundProfile?.id || null,
    lineUserId
  );

  const replyMessages: object[] = [];

  // 1. ข้อความตอบกลับหลัก
  const textObj = buildTextMessage(result.replyText);
  const finalMessage = result.quickReplies && result.quickReplies.length > 0
    ? withQuickReplies(textObj, result.quickReplies)
    : textObj;

  replyMessages.push(finalMessage);

  // 3. ถ้า AI พบสิ่งของที่ตรงกันในระบบ ให้แนบการ์ดแสดงผล (Carousel หรือ Bubble)
  if (result.matchedItems && result.matchedItems.length > 0) {
    const cards = formatFoundCards(result.matchedItems);
    if (cards.length === 1) {
      replyMessages.push(buildSingleFlexMessage(cards[0]));
    } else {
      replyMessages.push(buildCarouselMessage(cards));
    }
  }

  // ส่งข้อความทั้งหมดกลับไปยัง LINE
  await lineReply(replyToken, replyMessages);
}
