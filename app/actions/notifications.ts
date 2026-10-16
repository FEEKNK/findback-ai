"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

export interface MatchNotificationItem {
  id: string;
  score: number;
  created_at: string;
  lost_title: string;
  found_title: string;
  dropoff_location: string;
  found_id: string;
  lost_id: string;
}

export async function getUserMatchNotificationsAction(): Promise<MatchNotificationItem[]> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return [];

    // 1. ดึง item IDs ของผู้ใช้นี้
    const { data: myItems } = await supabase
      .from("items")
      .select("id")
      .eq("user_id", user.id);

    if (!myItems || myItems.length === 0) return [];
    const itemIds = myItems.map((i) => i.id);

    // 2. ดึง match suggestions ที่เกี่ยวข้อง
    const { data: matches } = await supabase
      .from("match_suggestions")
      .select(`
        id,
        score,
        created_at,
        lost_item:lost_item_id (id, title),
        found_item:found_item_id (id, title, dropoff_location)
      `)
      .or(`lost_item_id.in.(${itemIds.join(",")}),found_item_id.in.(${itemIds.join(",")})`)
      .gte("score", 50)
      .order("created_at", { ascending: false })
      .limit(5);

    interface MatchRow {
      id: string;
      score: number;
      created_at: string;
      lost_item: { id: string; title: string } | null;
      found_item: { id: string; title: string; dropoff_location?: string | null } | null;
    }

    return (matches as unknown as MatchRow[]).map((m) => ({
      id: m.id,
      score: m.score,
      created_at: m.created_at,
      lost_title: m.lost_item?.title || "ของหาย",
      found_title: m.found_item?.title || "ของที่พบ",
      dropoff_location: m.found_item?.dropoff_location || "จุดรับฝากส่วนกลาง",
      found_id: m.found_item?.id || "",
      lost_id: m.lost_item?.id || "",
    }));
  } catch (err) {
    console.error("[getUserMatchNotifications Error]:", err);
    return [];
  }
}
