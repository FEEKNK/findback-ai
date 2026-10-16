"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateMatchScore, ItemForMatch } from "@/lib/matching";
import { sendLineNotification } from "@/lib/notifications";

/**
 * n8n Webhook Trigger Helpers with Automatic Direct-Gemini Fallback
 * หาก n8n ยังไม่ได้เปิด หรือ Docker ยังไม่รัน ระบบจะใช้ Gemini API Key โดยตรงทันที
 */

const N8N_BASE = process.env.N8N_WEBHOOK_URL
  ? process.env.N8N_WEBHOOK_URL.replace(/\/webhook\/?.*$/, "")
  : "http://localhost:5678";

export async function triggerSmartIntake(itemId: string) {
  const webhookUrl = `${N8N_BASE}/webhook/intake`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, timestamp: new Date().toISOString() }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (res.ok) return true;
  } catch {
    // n8n is offline -> run Direct Gemini Intake Fallback
  }

  // Fallback: ประมวลผลผ่าน Gemini API Key โดยตรงจาก Next.js
  return await fallbackDirectGeminiIntake(itemId);
}

export async function triggerMatchScan(itemId: string) {
  const webhookUrl = `${N8N_BASE}/webhook/match`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, timestamp: new Date().toISOString() }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (res.ok) return true;
  } catch {
    // n8n is offline -> run Direct Match Scan Fallback
  }

  return await fallbackDirectMatchScan(itemId);
}

/**
 * Fallback: เรียก Gemini API (gemini-flash-latest) โดยตรง
 */
async function fallbackDirectGeminiIntake(itemId: string): Promise<boolean> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("your-gemini")) {
    console.warn("[AI Intake] GEMINI_API_KEY not configured.");
    return false;
  }

  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();
    const { data: item } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (!item) return false;

    const prompt = `วิเคราะห์สิ่งของนี้เพื่อใช้ในระบบตามหาของหายในมหาวิทยาลัย/โรงเรียน
ชื่อสิ่งของ: "${item.title}"
รายละเอียด: "${item.description || "ไม่มีรายละเอียด"}"
หมวดหมู่ที่ระบุเบื้องต้น: "${item.category || "ไม่ระบุ"}"

ให้ตอบเป็น JSON เท่านั้นในรูปแบบนี้:
{
  "category": "หมวดหมู่ เช่น กระเป๋า, อุปกรณ์อิเล็กทรอนิกส์, บัตร, กุญแจ, เสื้อผ้า, เครื่องประดับ, ของใช้ทั่วไป",
  "color": "สีหลัก เช่น ดำ, ขาว, น้ำเงิน",
  "tags": ["คำสำคัญภาษาไทย 3-6 คำ เช่น กระเป๋าสตางค์, หนัง, สีดำ, มีซิป"],
  "description_th": "คำอธิบายลักษณะเด่นสั้นๆ 1-2 ประโยค"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          response_mime_type: "application/json",
          maxOutputTokens: 1000 
        },
      }),
    });

    if (!res.ok) {
      console.error("[Direct Gemini Intake HTTP Error]:", res.status);
      return false;
    }

    const data = await res.json();
    interface ContentPart { text?: string; thought?: boolean }
    const parts: ContentPart[] = data.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p) => p.text && !p.thought)?.text || parts[parts.length - 1]?.text || "";
    const cleanJson = textPart.replace(/```json\n?|\n?```/g, "").trim();
    let parsed: { category?: string | null; color?: string | null; tags?: string[]; description_th?: string } = {};
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = { category: item.category, tags: [item.title] };
    }

    // อัปเดตข้อมูล AI ลงในตาราง items
    await supabase
      .from("items")
      .update({
        ai_category: parsed.category || item.category || "ของใช้ทั่วไป",
        ai_color: parsed.color || null,
        ai_tags: parsed.tags || [item.title],
        ai_metadata: parsed,
        ai_status: "SUCCESS",
      })
      .eq("id", itemId);

    // รันการจับคู่ทันที
    await fallbackDirectMatchScan(itemId);
    return true;
  } catch (err) {
    console.error("[Direct Gemini Intake Exception]:", err);
    return false;
  }
}

/**
 * Fallback: ค้นหาของคู่ตรงข้ามและบันทึก match_suggestions
 */
async function fallbackDirectMatchScan(itemId: string): Promise<boolean> {
  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();
    const { data: currentItem } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (!currentItem) return false;

    const oppositeType = currentItem.type === "LOST" ? "FOUND" : "LOST";
    const { data: candidates } = await supabase
      .from("items")
      .select("*")
      .eq("type", oppositeType)
      .eq("status", "OPEN");

    if (!candidates || candidates.length === 0) return true;

    for (const cand of candidates) {
      const lost = (currentItem.type === "LOST" ? currentItem : cand) as unknown as ItemForMatch;
      const found = (currentItem.type === "FOUND" ? currentItem : cand) as unknown as ItemForMatch;

      const { score, details } = calculateMatchScore(lost, found);

      if (score >= 60) {
        await supabase
          .from("match_suggestions")
          .upsert(
            {
              lost_item_id: lost.id,
              found_item_id: found.id,
              score,
              match_details: details,
            },
            { onConflict: "lost_item_id,found_item_id" }
          );

        // ยิงแจ้งเตือนผ่าน LINE OA ไปยังเจ้าของของหาย (ถ้าผู้ใช้ผูก line_user_id ไว้)
        try {
          const { data: lostItemRow } = await supabase
            .from("items")
            .select("user_id, title")
            .eq("id", lost.id)
            .single();

          if (lostItemRow?.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("line_user_id")
              .eq("id", lostItemRow.user_id)
              .single();

            if (profile?.line_user_id) {
              const msg = `🔔 FindBack: พบสิ่งของที่อาจเป็นของคุณ!\n📦 รายการ: "${found.title}"\n🎯 ความตรงกัน: ${score}%\n📍 จุดรับฝาก: ${found.dropoff_location || "ส่วนกลาง"}\nตรวจสอบได้ที่ระบบ: http://localhost:3000/dashboard/matches`;
              sendLineNotification(profile.line_user_id, msg).catch(console.error);
            }
          }
        } catch (lineErr) {
          console.error("[LINE Match Notify Error]:", lineErr);
        }
      }
    }

    return true;
  } catch (err) {
    console.error("[Direct Match Scan Exception]:", err);
    return false;
  }
}
