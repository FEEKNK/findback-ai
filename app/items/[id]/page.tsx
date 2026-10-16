import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Tag,
  PackageSearch,
  ArrowLeft,
  Image as ImageIcon,
  ShieldCheck,
  Building2,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import ClaimButton from "./claim-button";
import { getCurrentUser } from "@/lib/session";

export const instant = false;

export default async function ItemDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    return notFound();
  }

  const currentUser = await getCurrentUser();

  const isOwner = currentUser?.id === item.user_id;

  return (
    <div className="container max-w-4xl mx-auto py-8 sm:py-12 px-4">
      <Link
        href="/feed"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปหน้า Feed
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Images Section */}
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden bg-muted aspect-square relative shadow-lg border border-border/50">
            <div
              className={`absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${
                item.type === "LOST"
                  ? "bg-red-500/90 text-white"
                  : "bg-emerald-500/90 text-white"
              }`}
            >
              {item.type === "LOST" ? "🔴 ตามหาของหาย" : "🟢 มีผู้เก็บของได้"}
            </div>

            {item.status !== "OPEN" && (
              <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-md bg-amber-500/90 text-white">
                {item.status === "CLAIMED"
                  ? "รอส่งมอบ"
                  : item.status === "RETURNED"
                  ? "คืนเจ้าของแล้ว ✓"
                  : item.status}
              </div>
            )}

            {item.image_urls && item.image_urls.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_urls[0]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/50">
                <ImageIcon size={64} opacity={0.3} className="mb-4" />
                <p className="text-sm">ไม่มีรูปภาพประกอบ</p>
              </div>
            )}
          </div>

          {/* Additional Thumbnails if more than 1 image */}
          {item.image_urls && item.image_urls.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {item.image_urls.map((img: string, idx: number) => (
                <div
                  key={idx}
                  className="aspect-video rounded-xl overflow-hidden border border-border/60 bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="flex flex-col space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {item.category && (
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {item.title}
            </h1>
          </div>

          <div className="space-y-4 text-muted-foreground">
            {/* Description */}
            <div className="flex items-start gap-3 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <PackageSearch className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider mb-1">
                  รายละเอียด
                </p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {item.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                </p>
              </div>
            </div>

            {/* Location Details */}
            <div className="grid grid-cols-1 gap-3 bg-card p-4 rounded-xl border border-border/50">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary/70 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">สถานที่พบ/หาย</span>
                  <span className="text-sm font-semibold text-foreground">
                    {item.location_building || "ไม่ระบุ"}
                    {item.location_floor ? ` (${item.location_floor})` : ""}
                  </span>
                </div>
              </div>

              {item.dropoff_location && (
                <div className="flex items-start gap-3 pt-3 border-t border-border/40">
                  <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-emerald-500">
                      จุดรับฝากของปัจจุบัน (Custodian)
                    </span>
                    <span className="text-sm text-foreground font-bold">
                      {item.dropoff_location}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 pt-3 border-t border-border/40">
                <Calendar className="w-5 h-5 text-primary/70 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">วันที่บันทึก</span>
                  <span className="text-sm text-foreground">
                    {new Date(item.created_at).toLocaleString("th-TH")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secret Challenge Indicator */}
          {item.secret_challenge && item.type === "FOUND" && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-500 font-medium">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>รายการนี้มีคำถามคัดกรองเจ้าของจริง (ผู้ยื่นเคลมต้องตอบคำถามลับ)</span>
            </div>
          )}

          {/* AI Tags */}
          {item.ai_tags && item.ai_tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-primary" /> AI Smart Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.ai_tags.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20 text-xs py-0.5 px-2.5"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="pt-4 border-t border-border/50">
            {item.status === "RETURNED" ? (
              <div className="w-full py-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center font-bold text-emerald-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                รายการนี้ส่งมอบคืนเจ้าของเรียบร้อยแล้ว
              </div>
            ) : item.status === "CLAIMED" ? (
              <div className="w-full py-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-center font-semibold text-amber-500">
                รายการนี้อยู่ระหว่างกระบวนการตรวจสอบและรอส่งมอบ
              </div>
            ) : isOwner ? (
              <div className="w-full py-3.5 rounded-xl bg-muted/60 border border-border text-center text-sm text-muted-foreground font-medium">
                คุณเป็นผู้ลงรายการนี้
              </div>
            ) : item.type === "FOUND" ? (
              <ClaimButton
                itemId={item.id}
                itemTitle={item.title}
                secretChallenge={item.secret_challenge}
                isLoggedIn={!!currentUser}
              />
            ) : (
              <Link href={`/items/new`} className="flex w-full">
                <button className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-900/20">
                  ฉันเป็นคนเก็บของชิ้นนี้ได้ (แจ้งเจอของ)
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
