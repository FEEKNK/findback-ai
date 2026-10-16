"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  MapPin,
  PackageSearch,
  Search,
  User,
  XCircle,
  HelpCircle,
  Camera,
  Loader2,
} from "lucide-react";
import { approveClaim, rejectClaim } from "@/app/actions/claims";

interface ClaimItem {
  id: string;
  status: string;
  challenge_answer?: string | null;
  proof_description?: string | null;
  proof_image_urls?: string[];
  review_note?: string | null;
  created_at: string;
  resolved_at?: string | null;
  item?: {
    id: string;
    title: string;
    category?: string | null;
    dropoff_location?: string | null;
    secret_challenge?: string | null;
    status: string;
    image_urls?: string[];
  };
  claimant?: {
    id: string;
    full_name?: string | null;
    student_id?: string | null;
    phone?: string | null;
  };
}

export default function ClaimList({ initialClaims }: { initialClaims: ClaimItem[] }) {
  const [claims, setClaims] = useState<ClaimItem[]>(initialClaims);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredClaims = claims.filter((c) => {
    const matchesTab = c.status === activeTab;
    if (!matchesTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      (c.item?.title && c.item.title.toLowerCase().includes(q)) ||
      (c.claimant?.full_name && c.claimant.full_name.toLowerCase().includes(q)) ||
      (c.claimant?.student_id && c.claimant.student_id.toLowerCase().includes(q))
    );
  });

  const handleApprove = async (claimId: string, itemTitle?: string) => {
    const confirmed = window.confirm(
      `ยืนยันการอนุมัติส่งมอบสิ่งของ "${itemTitle || "รายการนี้"}" ให้แก่ผู้เคลมใช่หรือไม่?\n\n⚠️ เมื่ออนุมัติแล้ว สถานะจะถูกเปลี่ยนเป็น "ส่งมอบสำเร็จ (RETURNED)" ถาวร และระบบจะส่งแจ้งเตือนผ่าน LINE ทันที`
    );
    if (!confirmed) return;

    setLoadingId(claimId);
    try {
      await approveClaim(claimId);
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, status: "APPROVED" } : c))
      );
    } catch {
      alert("เกิดข้อผิดพลาดในการอนุมัติคำขอ");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (claimId: string) => {
    setLoadingId(claimId);
    try {
      await rejectClaim(claimId, rejectReason || "หลักฐานไม่เพียงพอหรือไม่ตรงกับสิ่งของ");
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                status: "REJECTED",
                review_note: rejectReason || "หลักฐานไม่เพียงพอ",
              }
            : c
        )
      );
      setRejectingId(null);
      setRejectReason("");
    } catch {
      alert("เกิดข้อผิดพลาดในการปฏิเสธคำขอ");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Tabs */}
      <div className="bg-card border border-border/60 p-2.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={activeTab === "PENDING" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold ${
              activeTab === "PENDING"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("PENDING")}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            รอส่งมอบ ({claims.filter((c) => c.status === "PENDING").length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === "APPROVED" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold ${
              activeTab === "APPROVED"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("APPROVED")}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            ส่งมอบแล้ว ({claims.filter((c) => c.status === "APPROVED").length})
          </Button>

          <Button
            size="sm"
            variant={activeTab === "REJECTED" ? "default" : "ghost"}
            className={`rounded-xl text-xs font-semibold ${
              activeTab === "REJECTED"
                ? "bg-destructive text-destructive-foreground shadow"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("REJECTED")}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            ปฏิเสธ ({claims.filter((c) => c.status === "REJECTED").length})
          </Button>
        </div>

        <div className="flex items-center bg-muted/50 px-3 py-1.5 rounded-xl border border-border/50">
          <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัสนักศึกษา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs outline-none w-full sm:w-48 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* List */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/80">
          <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">
            ไม่มีรายการในหมวดนี้
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQuery
              ? "ไม่พบรายการที่ตรงกับคำค้นหา"
              : "คำขอเคลมในหมวดนี้ได้รับการจัดการเรียบร้อยแล้ว"}
          </p>
        </div>
      ) : (
        <div className="grid gap-5">
          {filteredClaims.map((claim) => (
            <Card
              key={claim.id}
              className="overflow-hidden border-border/60 shadow-md hover:shadow-lg transition-all rounded-2xl"
            >
              {/* Header Bar */}
              <div className="bg-muted/40 px-5 py-3 flex justify-between items-center border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-primary text-sm tracking-wider">
                    #FB-{claim.id.replace(/-/g, "").slice(0, 4).toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({new Date(claim.created_at).toLocaleDateString("th-TH")})
                  </span>
                </div>

                {claim.status === "PENDING" ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs font-semibold"
                  >
                    รอเจ้าหน้าที่ตรวจสอบ
                  </Badge>
                ) : claim.status === "APPROVED" ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-semibold"
                  >
                    ส่งมอบสำเร็จ ✓
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/30 text-xs font-semibold"
                  >
                    ปฏิเสธคำขอ
                  </Badge>
                )}
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Item & Claimant Overview */}
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-20 h-20 bg-muted rounded-xl overflow-hidden shrink-0 border border-border/70 flex items-center justify-center">
                    {claim.item?.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={claim.item.image_urls[0]}
                        alt={claim.item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <h4 className="font-bold text-lg text-foreground">
                      {claim.item?.title}
                    </h4>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <div className="flex items-center bg-muted/60 px-2.5 py-1 rounded-lg text-muted-foreground border border-border/40">
                        <User className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                        ผู้มารับ:{" "}
                        <span className="font-semibold text-foreground ml-1">
                          {claim.claimant?.full_name || "ไม่ระบุชื่อ"}
                        </span>
                        {claim.claimant?.student_id && (
                          <span className="ml-1 text-muted-foreground">
                            ({claim.claimant.student_id})
                          </span>
                        )}
                      </div>

                      {claim.item?.dropoff_location && (
                        <div className="flex items-center bg-muted/60 px-2.5 py-1 rounded-lg text-muted-foreground border border-border/40">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                          จุดรับของ:{" "}
                          <span className="font-semibold text-foreground ml-1">
                            {claim.item.dropoff_location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Secret Challenge & Proof Details */}
                <div className="p-4 rounded-xl bg-background/60 border border-border/60 space-y-3 text-xs">
                  {claim.item?.secret_challenge && (
                    <div className="space-y-1">
                      <div className="font-semibold text-amber-500 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        คำถามคัดกรองลับ: &ldquo;{claim.item.secret_challenge}&rdquo;
                      </div>
                      <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-foreground font-mono">
                        คำตอบของผู้ยื่น:{" "}
                        <span className="font-bold">
                          {claim.challenge_answer || "(ไม่ได้ระบุ)"}
                        </span>
                      </div>
                    </div>
                  )}

                  {claim.proof_description && (
                    <div className="space-y-1">
                      <span className="font-semibold text-muted-foreground">
                        คำอธิบายหลักฐานยืนยันตัวตน:
                      </span>
                      <p className="p-2 rounded-lg bg-muted/40 text-foreground">
                        {claim.proof_description}
                      </p>
                    </div>
                  )}

                  {claim.proof_image_urls && claim.proof_image_urls.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-primary" />
                        รูปหลักฐานที่แนบ:
                      </span>
                      <div className="flex gap-2">
                        {claim.proof_image_urls.map((imgUrl, i) => (
                          <a
                            key={i}
                            href={imgUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt="Proof"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {claim.review_note && (
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                      บันทึกการตรวจสอบ: {claim.review_note}
                    </div>
                  )}
                </div>

                {/* Actions for PENDING */}
                {claim.status === "PENDING" && (
                  <div className="pt-2 border-t border-border/50 space-y-3">
                    {rejectingId === claim.id ? (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
                        <label className="text-xs font-semibold text-destructive">
                          ระบุเหตุผลในการปฏิเสธคำขอเคลม:
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น คำตอบลับไม่ถูกต้อง, บัตรประชาชนไม่ตรง..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg bg-background border border-destructive/30 text-foreground"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                          >
                            ยกเลิก
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-7"
                            disabled={loadingId === claim.id}
                            onClick={() => handleReject(claim.id)}
                          >
                            ยืนยันปฏิเสธ
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 text-xs rounded-xl"
                          onClick={() => setRejectingId(claim.id)}
                        >
                          ปฏิเสธคำขอ
                        </Button>
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl gap-1.5"
                          size="sm"
                          disabled={loadingId === claim.id}
                          onClick={() => handleApprove(claim.id, claim.item?.title)}
                        >
                          {loadingId === claim.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              กำลังบันทึก...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              ยืนยันส่งมอบ & ปิดเคส
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
