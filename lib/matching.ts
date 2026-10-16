/**
 * Algorithm คำนวณความตรงกันของสิ่งของ (Matching Algorithm)
 * ปรับปรุงให้รองรับภาษาไทย และการคำนวณชื่อเรื่องแบบ Substring / Cross-containment
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendLineNotification } from "@/lib/notifications";

export interface ItemForMatch {
  id: string;
  type: "LOST" | "FOUND";
  title: string;
  category?: string | null;
  ai_category?: string | null;
  ai_color?: string | null;
  color?: string | null;
  ai_tags?: string[] | null;
  location_building?: string | null;
  dropoff_location?: string | null;
  event_date?: string | null;
  created_at: string;
}

export interface MatchResult {
  score: number;
  details: {
    category?: { match: boolean; score: number };
    title?: { matchType: "EXACT" | "SUBSTRING" | "TOKEN_OVERLAP"; score: number };
    color?: { match: boolean; score: number };
    tags?: { overlap: string[]; score: number };
    location?: { match: boolean; score: number };
    time?: { diffDays: number; score: number };
  };
}

export function calculateMatchScore(
  lostItem: ItemForMatch,
  foundItem: ItemForMatch
): MatchResult {
  let score = 0;
  const details: MatchResult["details"] = {};

  const lTitle = (lostItem.title || "").toLowerCase().trim();
  const fTitle = (foundItem.title || "").toLowerCase().trim();

  // 1. Title Match (Exact: +45, Substring: +40, Token overlap: +35)
  // สำคัญมากสำหรับภาษาไทย เช่น "กระเป๋าสตางค์ Coach สีดำ" กับ "กระเป๋าสตางค์สีดำ"
  if (lTitle && fTitle) {
    if (lTitle === fTitle) {
      score += 45;
      details.title = { matchType: "EXACT", score: 45 };
    } else if (lTitle.includes(fTitle) || fTitle.includes(lTitle)) {
      score += 40;
      details.title = { matchType: "SUBSTRING", score: 40 };
    } else {
      // ตรวจสอบ Token / คำสำคัญในชื่อเรื่อง
      const extractTokens = (str: string) =>
        str
          .toLowerCase()
          .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 2);

      const lTokens = extractTokens(lTitle);
      const fTokens = extractTokens(fTitle);
      const shorter = lTokens.length <= fTokens.length ? lTokens : fTokens;
      const longerStr = lTokens.length <= fTokens.length ? fTitle : lTitle;

      if (shorter.length > 0) {
        const matchesCount = shorter.filter((tok) => longerStr.includes(tok)).length;
        const ratio = matchesCount / shorter.length;
        if (ratio >= 0.5) {
          score += 35;
          details.title = { matchType: "TOKEN_OVERLAP", score: 35 };
        }
      }
    }
  }

  // 2. Category Match (+25)
  const lostCat = (lostItem.ai_category || lostItem.category || "").toLowerCase();
  const foundCat = (foundItem.ai_category || foundItem.category || "").toLowerCase();

  if (lostCat && foundCat) {
    if (lostCat === foundCat || lostCat.includes(foundCat) || foundCat.includes(lostCat)) {
      score += 25;
      details.category = { match: true, score: 25 };
    } else if ((lostCat.includes("ของใช้") || foundCat.includes("ของใช้")) && details.title) {
      score += 15;
      details.category = { match: true, score: 15 };
    }
  }

  // 3. Color Match (+15)
  const lostColor = (lostItem.ai_color || lostItem.color || "").trim().toLowerCase();
  const foundColor = (foundItem.ai_color || foundItem.color || "").trim().toLowerCase();
  if (lostColor && foundColor && (lostColor === foundColor || lostColor.includes(foundColor) || foundColor.includes(lostColor))) {
    score += 15;
    details.color = { match: true, score: 15 };
  }

  // 4. Tag Overlap - Jaccard Index (+20 max)
  const extractWords = (str: string) =>
    str
      .toLowerCase()
      .split(/[\s,/-]+/)
      .filter((w) => w.length > 1);

  const lostTags = new Set([
    ...(lostItem.ai_tags || []).map((t) => t.toLowerCase()),
    ...extractWords(lostItem.title),
  ]);

  const foundTags = new Set([
    ...(foundItem.ai_tags || []).map((t) => t.toLowerCase()),
    ...extractWords(foundItem.title),
  ]);

  const overlap = [...lostTags].filter((t) => foundTags.has(t));
  const totalUnion = new Set([...lostTags, ...foundTags]);

  if (totalUnion.size > 0 && overlap.length > 0) {
    const jaccard = overlap.length / totalUnion.size;
    const tagScore = Math.min(20, Math.round(jaccard * 30));
    score += tagScore;
    details.tags = { overlap, score: tagScore };
  }

  // 5. Location Proximity (+20) (รองรับทั้ง location_building และ dropoff_location)
  const lostBuilding = (lostItem.location_building || "").trim().toLowerCase();
  const foundBuilding = (foundItem.location_building || "").trim().toLowerCase();
  const foundDropoff = (foundItem.dropoff_location || "").trim().toLowerCase();

  const isLocationMatch =
    (lostBuilding && foundBuilding && (lostBuilding === foundBuilding || lostBuilding.includes(foundBuilding) || foundBuilding.includes(lostBuilding))) ||
    (lostBuilding && foundDropoff && (lostBuilding.includes(foundDropoff) || foundDropoff.includes(lostBuilding) ||
      ((lostBuilding.includes("รปภ") || lostBuilding.includes("ป้อม")) && (foundDropoff.includes("รปภ") || foundDropoff.includes("ป้อม")))));

  if (isLocationMatch) {
    score += 20;
    details.location = { match: true, score: 20 };
  }

  // 6. Time Window (+10 if within 14 days)
  const lostTime = new Date(lostItem.event_date || lostItem.created_at).getTime();
  const foundTime = new Date(foundItem.event_date || foundItem.created_at).getTime();

  if (!isNaN(lostTime) && !isNaN(foundTime)) {
    const diffDays = Math.abs(lostTime - foundTime) / (1000 * 60 * 60 * 24);
    if (diffDays <= 14) {
      score += 10;
      details.time = { diffDays: Math.round(diffDays), score: 10 };
    }
  }

  return { score: Math.min(100, score), details };
}

interface ItemRowRecord extends ItemForMatch {
  user_id?: string;
  description?: string | null;
  ai_metadata?: Record<string, unknown> | null;
}

/**
 * สแกนและบันทึกการจับคู่ลงตาราง match_suggestions ใน Supabase
 * รองรับทั้งสแกนชิ้นเดียว (itemId) หรือสแกนทุกชิ้นที่สถานะ OPEN
 */
export async function executeMatchScan(itemId?: string) {
  try {
    const supabase = createAdminClient();

    let targetItems: ItemRowRecord[] = [];
    if (itemId) {
      const { data: item } = await supabase.from("items").select("*").eq("id", itemId).single();
      if (item) targetItems = [item as unknown as ItemRowRecord];
    } else {
      const { data: items } = await supabase
        .from("items")
        .select("*")
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(100);
      if (items) targetItems = (items || []) as unknown as ItemRowRecord[];
    }

    if (targetItems.length === 0) return [];

    const matchesFound = [];

    for (const currentItem of targetItems) {
      const oppositeType = currentItem.type === "LOST" ? "FOUND" : "LOST";
      const { data: candidates } = await supabase
        .from("items")
        .select("*")
        .eq("type", oppositeType)
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!candidates || candidates.length === 0) continue;

      for (const cand of candidates) {
        const lost = (currentItem.type === "LOST" ? currentItem : cand) as unknown as ItemForMatch;
        const found = (currentItem.type === "FOUND" ? currentItem : cand) as unknown as ItemForMatch;

        const { score, details } = calculateMatchScore(lost, found);

        // บันทึกคำแนะนำการจับคู่เมื่อความตรงกัน >= 50%
        if (score >= 50) {
          await supabase
            .from("match_suggestions")
            .upsert(
              {
                lost_item_id: lost.id,
                found_item_id: found.id,
                score,
                match_details: JSON.parse(JSON.stringify(details)),
              },
              { onConflict: "lost_item_id,found_item_id" }
            );

          matchesFound.push({ lostId: lost.id, foundId: found.id, score });

          // ยิงแจ้งเตือนผ่าน LINE OA ถ้าเจ้าของของหายหรือผู้เก็บได้ผูก LINE ไว้ (ผ่าน profile หรือ ai_metadata)
          try {
            const { data: lostItemRow } = await supabase
              .from("items")
              .select("user_id, title, ai_metadata")
              .eq("id", lost.id)
              .single();

            const { data: foundItemRow } = await supabase
              .from("items")
              .select("user_id, title, dropoff_location, description, ai_metadata")
              .eq("id", found.id)
              .single();

            const lostMeta = (lostItemRow?.ai_metadata as Record<string, unknown> | null) || {};
            const foundMeta = (foundItemRow?.ai_metadata as Record<string, unknown> | null) || {};

            let targetLineId = (lostMeta.line_user_id as string) || null;

            if (!targetLineId && lostItemRow?.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("line_user_id")
                .eq("id", lostItemRow.user_id)
                .single();
              targetLineId = profile?.line_user_id || null;
            }

            if (targetLineId) {
              const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
              const depositorInfo = foundMeta.depositor_name
                ? `\n👤 ผู้พบ/ฝาก: ${foundMeta.depositor_name as string}`
                : "";
              const msg = `🔔 FindBack: พบสิ่งของที่อาจตรงกับที่คุณตามหา!\n\n📦 สิ่งของที่พบ: "${found.title}"\n🎯 ความตรงกัน: ${score}%\n📍 จุดรับฝาก: ${found.dropoff_location || "จุดรับฝากส่วนกลาง"}${depositorInfo}\n\nตรวจสอบรายละเอียดและติดต่อขอรับคืน: ${siteUrl}/items/${found.id}`;
              sendLineNotification(targetLineId, msg).catch(console.error);

              // อัปเดต notified = true
              await supabase
                .from("match_suggestions")
                .update({ notified: true })
                .eq("lost_item_id", lost.id)
                .eq("found_item_id", found.id);
            }

            // แจ้งเตือนผู้พบของด้วยเช่นกัน
            let finderLineId = (foundMeta.line_user_id as string) || null;
            if (!finderLineId && foundItemRow?.user_id) {
              const { data: finderProfile } = await supabase
                .from("profiles")
                .select("line_user_id")
                .eq("id", foundItemRow.user_id)
                .single();
              finderLineId = finderProfile?.line_user_id || null;
            }

            if (finderLineId) {
              const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
              const msg = `🔔 FindBack: ขอบคุณสำหรับน้ำใจครับ!\nระบบพบประกาศตามหาของหายที่ตรงกับของที่คุณเก็บได้ "${found.title}" (ความตรงกัน: ${score}%)\nระบบได้ประสานแจ้งเตือนเจ้าของเรียบร้อยแล้วครับ 🌟\nดูรายละเอียด: ${siteUrl}/items/${lost.id}`;
              sendLineNotification(finderLineId, msg).catch(console.error);
            }
          } catch (lineErr) {
            console.error("[LINE Match Notify Error]:", lineErr);
          }
        }
      }
    }

    return matchesFound;
  } catch (err) {
    console.error("[executeMatchScan Exception]:", err);
    return [];
  }
}
