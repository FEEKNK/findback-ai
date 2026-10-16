import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Sparkles, MapPin } from "lucide-react";

export const instant = false;

export default async function DashboardMatchesPage() {
  const supabase = await createClient();
  const user = (await getCurrentUser())!;

  // 1. Fetch user's item IDs
  const { data: myItems } = await supabase
    .from("items")
    .select("id")
    .eq("user_id", user.id);

  const itemIds = myItems?.map((i) => i.id) || [];

  interface MatchSuggestionRecord {
    id: string;
    lost_item_id: string;
    found_item_id: string;
    score: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    match_details: any;
    created_at: string;
    lost_item?: {
      id: string;
      title: string;
      location_building?: string | null;
      image_urls?: string[];
      category?: string | null;
    };
    found_item?: {
      id: string;
      title: string;
      location_building?: string | null;
      dropoff_location?: string | null;
      image_urls?: string[];
      category?: string | null;
    };
  }

  let matches: MatchSuggestionRecord[] = [];

  if (itemIds.length > 0) {
    const { data } = await supabase
      .from("match_suggestions")
      .select(
        `
        id,
        lost_item_id,
        found_item_id,
        score,
        match_details,
        created_at,
        lost_item:lost_item_id (
          id,
          title,
          location_building,
          image_urls,
          category
        ),
        found_item:found_item_id (
          id,
          title,
          location_building,
          dropoff_location,
          image_urls,
          category
        )
      `
      )
      .or(
        `lost_item_id.in.(${itemIds.join(",")}),found_item_id.in.(${itemIds.join(",")})`
      )
      .order("score", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matches = (data as any) || [];
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          รายการที่ AI จับคู่พบความตรงกัน (Smart Match Suggestions)
        </h2>
        <p className="text-sm text-muted-foreground">
          ระบบเปรียบเทียบภาพ หมวดหมู่ คำสำคัญ (Tags) และสถานที่ระหว่างของหายกับของที่พบ
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/80">
          <Sparkles className="w-12 h-12 mx-auto text-primary/40 mb-3 animate-pulse" />
          <h3 className="text-base font-semibold text-foreground">
            ยังไม่พบรายการที่ตรงกันในขณะนี้
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            เมื่อมีผู้แจ้งของหายหรือของเจอที่ตรงกับรายการของคุณ ระบบ AI จะทำการคำนวณและแสดงที่นี่ทันที
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {matches.map((m) => {
            const isHighMatch = m.score >= 75;
            const lost = Array.isArray(m.lost_item) ? m.lost_item[0] : m.lost_item;
            const found = Array.isArray(m.found_item) ? m.found_item[0] : m.found_item;

            return (
              <Card
                key={m.id}
                className="overflow-hidden border-border/70 shadow-md rounded-2xl bg-card/60 backdrop-blur-sm"
              >
                {/* Score Header Bar */}
                <div className="p-4 bg-muted/40 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-sm font-extrabold px-3 py-1 rounded-full ${
                        isHighMatch
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-primary/15 text-primary border border-primary/30"
                      }`}
                    >
                      {m.score}% MATCH
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {isHighMatch ? "ความตรงกันสูงมาก (แนะนำให้ตรวจสอบ)" : "ความตรงกันปานกลาง"}
                    </span>
                  </div>

                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(m.created_at).toLocaleDateString("th-TH")}
                  </span>
                </div>

                <CardContent className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Lost Side */}
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-400">🔴 รายการของหาย (LOST)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                          {lost?.image_urls?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={lost.image_urls[0]}
                              alt={lost.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              📦
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{lost?.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-red-400" />
                            {lost?.location_building || "ไม่ระบุ"}
                          </p>
                        </div>
                      </div>
                      {lost && (
                        <div className="pt-2 text-right">
                          <Link
                            href={`/items/${lost.id}`}
                            className="text-xs text-primary hover:underline font-semibold"
                          >
                            ดูรายการนี้ →
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Found Side */}
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400">
                          🟢 รายการที่พบ (FOUND)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                          {found?.image_urls?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={found.image_urls[0]}
                              alt={found.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              🎒
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{found?.title}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {found?.dropoff_location || found?.location_building || "ไม่ระบุ"}
                          </p>
                        </div>
                      </div>
                      {found && (
                        <div className="pt-2 flex justify-between items-center text-xs">
                          <Link
                            href={`/items/${found.id}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            ดูรายละเอียดสิ่งของ →
                          </Link>
                          <Button asChild size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Link href={`/items/${found.id}`}>ยื่นเคลมของชิ้นนี้</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
