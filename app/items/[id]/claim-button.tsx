"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitClaim } from "@/app/actions/claims";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert,
  HelpCircle,
  Camera,
  X,
  FileCheck,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface ClaimButtonProps {
  itemId: string;
  itemTitle?: string;
  secretChallenge?: string | null;
  isLoggedIn: boolean;
}

export default function ClaimButton({
  itemId,
  itemTitle,
  secretChallenge,
  isLoggedIn,
}: ClaimButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [proofDescription, setProofDescription] = useState("");
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOpen = () => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("item_id", itemId);
    if (challengeAnswer) formData.set("challenge_answer", challengeAnswer);
    if (proofDescription) formData.set("proof_description", proofDescription);
    formData.set("proof_image_urls", JSON.stringify(proofImages));

    try {
      await submitClaim(formData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยื่นเคลม";
      if (!msg.includes("NEXT_REDIRECT")) {
        setError(msg);
        setIsSubmitting(false);
      }
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        size="lg"
        className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
      >
        <FileCheck className="w-5 h-5" />
        นี่คือของฉัน! ยื่นเคลมขอรับของคืน
      </Button>

      {/* Claim Modal / Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => !isSubmitting && setIsOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl p-6 sm:p-7 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-border/50">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  ยื่นขอรับของคืน (Claim)
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-sm">
                  รายการ: {itemTitle || "สิ่งของที่พบ"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Secret Challenge (If exists) */}
              {secretChallenge && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <Label
                    htmlFor="challenge_answer"
                    className="text-xs font-bold text-amber-500 flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-4 h-4" />
                    คำถามคัดกรองจากผู้พบ:
                  </Label>
                  <p className="text-sm font-medium text-foreground bg-background/60 p-2.5 rounded-lg border border-amber-500/20">
                    &ldquo;{secretChallenge}&rdquo;
                  </p>
                  <Input
                    id="challenge_answer"
                    placeholder="พิมพ์คำตอบของคุณที่นี่..."
                    value={challengeAnswer}
                    onChange={(e) => setChallengeAnswer(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="h-10 rounded-lg bg-background border-amber-500/40 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    คำตอบนี้จะถูกส่งให้ผู้รับฝาก/Admin ตรวจสอบก่อนส่งมอบ
                  </p>
                </div>
              )}

              {/* Proof Description */}
              <div className="space-y-1.5">
                <Label htmlFor="proof_description" className="text-sm font-semibold">
                  รายละเอียดหลักฐานยืนยันตัวตน
                </Label>
                <textarea
                  id="proof_description"
                  rows={3}
                  placeholder="เช่น ของด้านในมีบัตรชื่อ..., เคสด้านหลังมีสติกเกอร์รูปแมว, มีรอยถลอกมุมซ้ายล่าง..."
                  value={proofDescription}
                  onChange={(e) => setProofDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3 rounded-xl bg-background border border-border/80 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
                />
              </div>

              {/* Proof Photos Upload */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-primary" />
                  รูปถ่ายหลักฐานเพิ่มเติม (ถ้ามี)
                </Label>
                <p className="text-xs text-muted-foreground">
                  เช่น รูปที่เคยถ่ายคู่กับสิ่งของ, สลิปใบเสร็จ, หรือภาพถ่ายจุดสังเกต
                </p>
                <ImageUpload
                  bucket="claim-proofs"
                  maxFiles={2}
                  value={proofImages}
                  onChange={setProofImages}
                  disabled={isSubmitting}
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังส่งข้อมูล...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      ยืนยันส่งคำขอเคลม
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
