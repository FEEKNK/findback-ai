import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  ShieldCheck,
  Ticket,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Camera,
  Share2,
} from "lucide-react";
import Link from "next/link";

export const instant = false;

export default async function ClaimVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claim, error } = await supabase
    .from("claims")
    .select(
      `
      *,
      items (*),
      profiles:claimant_id (full_name, student_id)
    `
    )
    .eq("id", id)
    .single();

  if (error || !claim) {
    return notFound();
  }

  const item = claim.items;
  const claimant = claim.profiles;
  const claimCode = `#FB-${claim.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

  const isApproved = claim.status === "APPROVED";
  const isRejected = claim.status === "REJECTED";

  return (
    <div className="container max-w-2xl mx-auto py-8 sm:py-12 px-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        กลับไปหน้า Feed
      </Link>

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border bg-card">
          {isApproved ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              อนุมัติและส่งมอบเรียบร้อยแล้ว
            </span>
          ) : isRejected ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <XCircle className="w-3.5 h-3.5" />
              คำขอเคลมถูกปฏิเสธ
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              รอดำเนินการตรวจสอบ & ส่งมอบ
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          บัตรนัดรับของคืน (Claim Pass)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isApproved
            ? "การส่งมอบเสร็จสิ้นแล้ว ขอบคุณที่ใช้งาน FindBack"
            : isRejected
            ? "รายการนี้ไม่ผ่านการยืนยันตัวตน หรือข้อมูลหลักฐานไม่ตรงกัน"
            : "นำรหัส Claim Pass นี้ไปแสดงต่อเจ้าหน้าที่ ณ จุดรับฝากเพื่อรับของคืน"}
        </p>
      </div>

      <Card className="border-border/70 bg-card/60 backdrop-blur-md overflow-hidden shadow-2xl rounded-2xl">
        {/* Header: Item Details */}
        <div className="bg-gradient-to-r from-blue-600/15 via-purple-600/15 to-emerald-600/15 p-5 sm:p-6 border-b border-border/60 flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
            {item?.image_urls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_urls[0]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">📦</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-lg sm:text-xl text-foreground truncate">
                {item?.title || "สิ่งของที่ยื่นเคลม"}
              </h2>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 font-semibold ${
                  isApproved
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : isRejected
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-amber-500/50 bg-amber-500/10 text-amber-400"
                }`}
              >
                {claim.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ผู้ยื่นเคลม: {claimant?.full_name || "ผู้ใช้งาน"}{" "}
              {claimant?.student_id ? `(${claimant.student_id})` : ""}
            </p>
          </div>
        </div>

        <CardContent className="pt-6 space-y-6">
          {/* Claim Pass Code */}
          <div className="border border-primary/30 bg-primary/5 rounded-2xl p-6 text-center space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5 font-semibold">
              <Ticket className="w-4 h-4 text-primary" />
              รหัส Claim Pass ของคุณ
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-primary py-1">
              {claimCode}
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              แสดงรหัสนี้คู่กับ <strong>บัตรนักศึกษา หรือ บัตรประชาชน</strong>{" "}
              ต่อผู้ดูแลเพื่อยืนยันตัวตน
            </p>
          </div>

          {/* Custodian Location & Handover Point */}
          {item?.dropoff_location && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                จุดรับของ & ผู้ดูแลในปัจจุบัน (Custodian Location)
              </div>
              <div className="bg-background/80 rounded-lg p-3.5 border border-emerald-500/20 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      📍 {item.dropoff_location}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      สถานที่เดิม: {item.location_building || "ไม่ระบุ"}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-300 text-xs"
                  >
                    พร้อมรับมอบ ✓
                  </Badge>
                </div>
                <div className="text-xs text-emerald-300/90 pt-1 border-t border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  คุณสามารถเดินทางไปติดต่อ ณ จุดดังกล่าวตามเวลาราชการ/เวลาทำการได้ทันที
                </div>
              </div>
            </div>
          )}

          {/* Verification Details Submitted */}
          <div className="space-y-3 text-sm bg-muted/30 p-4 rounded-xl border border-border/60">
            <div className="font-semibold text-foreground flex items-center gap-2 text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-primary" />
              ข้อมูลที่คุณใช้ยื่นยืนยันตัวตน
            </div>

            {claim.challenge_answer && (
              <div className="text-xs space-y-1">
                <span className="font-medium text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  คำตอบคัดกรองลับ:
                </span>
                <p className="bg-background/70 p-2 rounded border border-border/50 text-foreground font-mono">
                  {claim.challenge_answer}
                </p>
              </div>
            )}

            {claim.proof_description && (
              <div className="text-xs space-y-1">
                <span className="font-medium text-muted-foreground">คำอธิบายหลักฐาน:</span>
                <p className="bg-background/70 p-2 rounded border border-border/50 text-foreground">
                  {claim.proof_description}
                </p>
              </div>
            )}

            {claim.proof_image_urls && claim.proof_image_urls.length > 0 && (
              <div className="text-xs space-y-1.5">
                <span className="font-medium text-muted-foreground flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  รูปถ่ายหลักฐานที่แนบ:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {claim.proof_image_urls.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="aspect-video rounded-lg overflow-hidden border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Proof ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {claim.review_note && (
              <div className="text-xs p-2.5 rounded bg-muted border border-border text-foreground space-y-1">
                <span className="font-semibold text-primary">หมายเหตุจากเจ้าหน้าที่:</span>
                <p>{claim.review_note}</p>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="bg-muted/15 border-t border-border/60 px-6 py-4 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="w-full sm:flex-1 bg-background/60 gap-1.5"
            asChild
          >
            <Link href={`/items/${item?.id}`}>ดูหน้ารายละเอียดสิ่งของ</Link>
          </Button>

          <Button
            variant="default"
            className="w-full sm:flex-1 bg-primary text-primary-foreground font-semibold gap-1.5"
            asChild
          >
            <Link href="/feed">
              <Share2 className="w-4 h-4" /> กลับสู่หน้าแรก
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
