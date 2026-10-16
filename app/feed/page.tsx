import { Suspense } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

interface FeedParams {
  type?: string;
  q?: string;
}

async function FeedList({ searchParamsPromise }: { searchParamsPromise: Promise<FeedParams> }) {
  const resolvedSearchParams = await searchParamsPromise;
  const supabase = await createClient();

  let query = supabase
    .from("items")
    .select("*")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });

  if (resolvedSearchParams.type) {
    query = query.eq("type", resolvedSearchParams.type);
  }

  if (resolvedSearchParams.q) {
    query = query.ilike("title", `%${resolvedSearchParams.q}%`);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error("Error fetching items:", error.message || error);
    return (
      <div className="text-center py-16 px-4 bg-destructive/5 rounded-2xl border border-destructive/25 max-w-lg mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
        <h3 className="text-base font-bold text-foreground">ไม่สามารถเชื่อมต่อฐานข้อมูล Supabase ได้</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {error.message?.includes("fetch failed") || error.message?.includes("ENOTFOUND")
            ? "ไม่พบโดเมน Supabase ตาม URL ใน .env.local กรุณาตรวจสอบ Project URL ใน Supabase Dashboard > Settings > API"
            : error.message || "เกิดข้อผิดพลาดในการดึงข้อมูล"}
        </p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl border-border/50">
        <p className="text-lg">ยังไม่มีรายการสิ่งของในหมวดหมู่นี้</p>
        <Link href="/items/new" className="mt-4 inline-block text-primary text-sm hover:underline">
          + แจ้งของหาย / แจ้งเก็บของได้เป็นคนแรก
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Card
          key={item.id}
          className={`overflow-hidden border-border/50 bg-card/50 hover:border-primary/40 transition-all hover:shadow-lg flex flex-col ${
            item.type === "LOST"
              ? "hover:shadow-red-500/10"
              : "hover:shadow-emerald-500/10"
          }`}
        >
          <div className="h-48 bg-muted flex items-center justify-center relative overflow-hidden">
            {item.image_urls && item.image_urls[0] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={item.image_urls[0]}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <ImageIcon size={48} className="text-muted-foreground opacity-30" />
            )}
            <Badge
              className={`absolute top-3 left-3 font-bold ${
                item.type === "LOST"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
            >
              {item.type === "LOST" ? "ตามหาเจ้าของ (LOST)" : "เก็บของได้ (FOUND)"}
            </Badge>
            {item.dropoff_location && item.type === "FOUND" && (
              <Badge
                variant="outline"
                className="absolute top-3 right-3 font-semibold border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-1 backdrop-blur-sm"
              >
                <MapPin className="w-3 h-3" /> ฝากไว้ที่ป้อม
              </Badge>
            )}
          </div>
          <CardContent className="pt-4 pb-2 flex flex-col flex-1">
            <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
            <div className="flex items-center text-sm text-muted-foreground mt-2 mb-3">
              <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span className="truncate">{item.location_building || "ไม่ระบุสถานที่"}</span>
            </div>
            {item.ai_tags && item.ai_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                {Array.from(new Set<string>(item.ai_tags)).map((tag: string, idx: number) => (
                  <Badge
                    key={`${item.id}-tag-${idx}-${tag}`}
                    variant="secondary"
                    className="bg-primary/10 text-primary hover:bg-primary/20 text-xs"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <Link href={`/items/${item.id}`} className="w-full">
              <Button
                variant={item.type === "LOST" ? "outline" : "default"}
                className={`w-full ${
                  item.type === "FOUND" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
              >
                ดูรายละเอียด
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm">กำลังโหลดรายการสิ่งของ...</span>
    </div>
  );
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<FeedParams>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ศูนย์รวมของหาย-ของเจอ</h1>
          <p className="text-muted-foreground mt-1">ค้นหาสิ่งของด้วยระบบกรองและแท็กอัจฉริยะ</p>
        </div>

        {/* Filters */}
        <div className="flex bg-muted/50 p-1 rounded-lg border">
          <Link href="/feed">
            <button
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                !resolvedSearchParams.type
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ทั้งหมด
            </button>
          </Link>
          <Link href="/feed?type=LOST">
            <button
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                resolvedSearchParams.type === "LOST"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🔴 ของหาย
            </button>
          </Link>
          <Link href="/feed?type=FOUND">
            <button
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                resolvedSearchParams.type === "FOUND"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🟢 เก็บของได้
            </button>
          </Link>
        </div>
      </div>

      {/* Suspense-wrapped Items Grid */}
      <Suspense fallback={<FeedSkeleton />}>
        <FeedList searchParamsPromise={searchParams} />
      </Suspense>
    </div>
  );
}
