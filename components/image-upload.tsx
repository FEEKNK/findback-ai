"use client";

import { useState, useRef, useCallback } from "react";
import { UploadCloud, X, Loader2, ImagePlus } from "lucide-react";
import { compressImageToWebP } from "@/lib/image-utils";
import { uploadImageAction } from "@/app/actions/upload";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  bucket?: "item-photos" | "claim-proofs";
  maxFiles?: number;
  value?: string[];
  onChange?: (urls: string[]) => void;
  disabled?: boolean;
}

export function ImageUpload({
  bucket = "item-photos",
  maxFiles = 3,
  value = [],
  onChange,
  disabled = false,
}: ImageUploadProps) {
  const [urls, setUrls] = useState<string[]>(value);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      if (urls.length >= maxFiles) {
        setUploadError(`อัปโหลดได้สูงสุด ${maxFiles} รูปเท่านั้น`);
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      const newUrls = [...urls];

      try {
        const filesToProcess = Array.from(fileList).slice(0, maxFiles - urls.length);

        for (const file of filesToProcess) {
          if (!file.type.startsWith("image/")) {
            setUploadError("กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)");
            continue;
          }

          // 1. บีบอัดเป็น WebP <= 500KB ฝั่ง Client
          const compressedBlob = await compressImageToWebP(file, 500, 1400);

          // 2. ตั้งชื่อไฟล์ที่ไม่ซ้ำกัน
          const ext = "webp";
          const randomId = Math.random().toString(36).substring(2, 9);
          const fileName = `${Date.now()}_${randomId}.${ext}`;

          // 3. อัปโหลดผ่าน Server Action (Service Role) ป้องกันปัญหา RLS บน Storage
          const formData = new FormData();
          formData.append("file", compressedBlob, fileName);
          formData.append("bucket", bucket);

          const { publicUrl } = await uploadImageAction(formData);

          if (publicUrl) {
            newUrls.push(publicUrl);
          }
        }

        setUrls(newUrls);
        onChange?.(newUrls);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด";
        setUploadError(msg);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [bucket, maxFiles, urls, onChange]
  );

  const handleRemove = (indexToRemove: number) => {
    const updated = urls.filter((_, idx) => idx !== indexToRemove);
    setUrls(updated);
    onChange?.(updated);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || isUploading) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      {urls.length < maxFiles && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isUploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isUploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-center ${
            dragOver
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border/70 hover:border-primary/50 hover:bg-muted/30"
          } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={maxFiles > 1}
            disabled={disabled || isUploading}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">
                กำลังบีบอัดเป็น WebP และอัปโหลด...
              </p>
              <p className="text-xs text-muted-foreground">ขนาดไฟล์ถูกปรับให้ไม่เกิน 500KB อัตโนมัติ</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                คลิกเพื่อเลือกรูป หรือลากไฟล์มาวางที่นี่
              </div>
              <p className="text-xs text-muted-foreground">
                รองรับ JPG, PNG, WebP (สูงสุด {maxFiles} รูป, บีบอัดอัตโนมัติ)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {uploadError && (
        <div className="p-3 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <span>{uploadError}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/20"
            onClick={() => setUploadError(null)}
          >
            ปิด
          </Button>
        </div>
      )}

      {/* Thumbnails Preview Grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {urls.map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-video rounded-xl overflow-hidden border border-border group bg-muted/40 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Uploaded photo ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-md text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center shadow-md"
                title="ลบรูปนี้"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1 left-1.5 bg-black/60 backdrop-blur-xs text-[10px] text-white px-1.5 py-0.5 rounded font-mono">
                รูปที่ {idx + 1}
              </div>
            </div>
          ))}

          {/* Add more button if space available */}
          {urls.length < maxFiles && !isUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-xl border border-dashed border-border/80 hover:border-primary/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[11px] font-medium">+ เพิ่มรูป</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
