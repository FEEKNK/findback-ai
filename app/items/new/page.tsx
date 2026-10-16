"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { createItem } from "@/app/actions/items";
import {
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  Building2,
  MapPin,
  Tag,
  ShieldCheck,
  FileQuestion,
  Megaphone,
  Loader2,
} from "lucide-react";

const CATEGORIES = [
  "อุปกรณ์อิเล็กทรอนิกส์ (มือถือ, โน้ตบุ๊ก, แท็บเล็ต)",
  "กระเป๋า / กระเป๋าสตางค์ / เป้",
  "บัตร / เอกสารสำคัญ / บัตรนักศึกษา",
  "กุญแจ / พวงกุญแจ / คีย์การ์ด",
  "เครื่องแต่งกาย / หมวก / แว่นตา",
  "เครื่องประดับ / นาฬิกา",
  "สมุด / หนังสือ / อุปกรณ์การเรียน",
  "ขวดน้ำ / แก้วเก็บความเย็น",
  "ของใช้อื่นๆ",
];

export default function NewItemPage() {
  const [type, setType] = useState<"LOST" | "FOUND">("FOUND");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    formData.set("image_urls", JSON.stringify(imageUrls));

    try {
      await createItem(formData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      // Next.js redirect throws an error by design in some versions, don't display NEXT_REDIRECT as user error
      if (!msg.includes("NEXT_REDIRECT")) {
        setErrorMessage(msg);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 sm:py-12 px-4">
      {/* Header */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smart Lost & Found System</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          แจ้งรายการสิ่งของ
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
          AI จะช่วยวิเคราะห์ภาพ สกัดแท็กค้นหาอัตโนมัติ และจับคู่ของหาย-ของเจอทันที
        </p>
      </div>

      {/* Type Selector (LOST vs FOUND) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <button
          type="button"
          onClick={() => setType("LOST")}
          className={`py-3.5 px-4 rounded-2xl border text-sm sm:text-base font-bold transition-all duration-200 flex items-center justify-center gap-2.5 ${
            type === "LOST"
              ? "border-red-500 bg-red-500/15 text-red-500 shadow-lg shadow-red-500/10 scale-[1.01]"
              : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <FileQuestion className={`w-5 h-5 ${type === "LOST" ? "text-red-500" : ""}`} />
          <span>ฉันทำของหาย (LOST)</span>
        </button>

        <button
          type="button"
          onClick={() => setType("FOUND")}
          className={`py-3.5 px-4 rounded-2xl border text-sm sm:text-base font-bold transition-all duration-200 flex items-center justify-center gap-2.5 ${
            type === "FOUND"
              ? "border-emerald-500 bg-emerald-500/15 text-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.01]"
              : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          }`}
        >
          <Megaphone className={`w-5 h-5 ${type === "FOUND" ? "text-emerald-500" : ""}`} />
          <span>ฉันเก็บของได้ (FOUND)</span>
        </button>
      </div>

      {/* Main Card */}
      <Card className="border-border/60 bg-card/50 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">ไม่สามารถบันทึกได้</p>
                <p className="text-xs opacity-90">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <span>รูปถ่ายสิ่งของ</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    (แนะนำอย่างยิ่ง เพื่อให้ AI วิเคราะห์ได้แม่นยำ)
                  </span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {imageUrls.length}/3 รูป
                </span>
              </div>
              <ImageUpload
                bucket="item-photos"
                maxFiles={3}
                value={imageUrls}
                onChange={setImageUrls}
                disabled={isSubmitting}
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-1">
                ชื่อสิ่งของ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder={
                  type === "FOUND"
                    ? "เช่น กระเป๋าสตางค์ Coach สีดำ, บัตรนักศึกษา, หูฟัง AirPods"
                    : "เช่น ร่มพับสีน้ำเงิน, กุญแจรถมอเตอร์ไซค์พร้อมพวงกุญแจตุ๊กตา"
                }
                required
                disabled={isSubmitting}
                className="h-11 rounded-xl bg-background/50 border-border/80 focus:border-primary"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-primary" />
                หมวดหมู่สิ่งของ
              </Label>
              <select
                id="category"
                name="category"
                disabled={isSubmitting}
                className="w-full h-11 px-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                defaultValue=""
              >
                <option value="" disabled>
                  -- เลือกหมวดหมู่ (หรือปล่อยให้ AI ช่วยจัดหมวดหมู่อัตโนมัติ) --
                </option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building" className="text-sm font-semibold flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-primary" />
                  {type === "FOUND" ? "อาคาร/สถานที่ที่พบ" : "อาคาร/สถานที่ที่คาดว่าทำหาย"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="building"
                  name="building"
                  placeholder="เช่น โรงอาหารกลาง, ตึกวิศวะ 1, หอสมุด"
                  required
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-background/50 border-border/80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor" className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  ชั้น หรือ จุดสังเกตเฉพาะ
                </Label>
                <Input
                  id="floor"
                  name="floor"
                  placeholder="เช่น ชั้น 2 โต๊ะหน้าร้านกาแฟ, ห้องน้ำชาย"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-background/50 border-border/80"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                รายละเอียดเพิ่มเติม
              </Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                disabled={isSubmitting}
                placeholder="ระบุสี รอยตำหนิ ยี่ห้อ หรือลักษณะพิเศษที่ช่วยให้ระบุตัวตนของสิ่งของได้..."
                className="w-full p-3 rounded-xl bg-background/50 border border-border/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
              />
            </div>

            {/* Special FOUND Fields: Custodian / Drop-off location */}
            {type === "FOUND" && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="custodian" className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    นำไปฝากไว้ที่ใคร / จุดรับของอยู่ที่ไหน? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="custodian"
                    name="custodian"
                    placeholder="เช่น ฝากไว้ที่ ป้อม รปภ. ตึกวิศวะ 1 (ลุงสมบัติ), ห้องประชาสัมพันธ์ ชั้น 1"
                    required
                    disabled={isSubmitting}
                    className="h-11 rounded-xl bg-background/80 border-emerald-500/40 text-foreground font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 เพื่อความสบายใจ คนเก็บไม่จำเป็นต้องเก็บของมีค่าไว้เอง ให้ฝากไว้ที่จุดทางการแล้วระบุไว้ที่นี่
                  </p>
                </div>

                {/* Secret Challenge */}
                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                  <Label htmlFor="secret_challenge" className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    คำถามคัดกรองเจ้าของจริง (Secret Challenge) — ถ้ามี
                  </Label>
                  <Input
                    id="secret_challenge"
                    name="secret_challenge"
                    placeholder="เช่น สิ่งของที่อยู่ในกระเป๋าช่องลับคืออะไร?, เคสโทรศัพท์ด้านในมีรูปอะไร?"
                    disabled={isSubmitting}
                    className="h-11 rounded-xl bg-background/80 border-emerald-500/30 text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    ผู้ที่จะขอยื่นเคลมจะต้องตอบคำถามนี้ให้ถูกต้อง เพื่อป้องกันคนแอบอ้าง
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full h-12 text-base font-bold rounded-xl transition-all shadow-md gap-2 ${
                type === "FOUND"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>กำลังบันทึกข้อมูลและส่ง AI...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>
                    {type === "FOUND"
                      ? "บันทึกของที่เจอ และเริ่มให้ AI ช่วยวิเคราะห์"
                      : "บันทึกแจ้งของหาย และให้ AI ค้นหาคู่จับคู่ทันที"}
                  </span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
