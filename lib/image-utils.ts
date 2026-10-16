/**
 * บีบอัดรูปภาพเป็น WebP ขนาดไม่เกิน maxSizeKB (ค่าเริ่มต้น 500KB) ฝั่ง Client
 * ใช้ HTML5 Canvas API + Dynamic Quality Stepping
 */
export async function compressImageToWebP(
  file: File,
  maxSizeKB: number = 500,
  maxDimension: number = 1400
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // หากไฟล์เป็น SVG หรือ GIF ให้ส่งกลับเดิม ไม่ต้องแปลง
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // ปรับขนาดความกว้าง/สูงถ้าเกิน maxDimension โดยรักษา Aspect Ratio
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Cannot get canvas context"));
      }

      // วาดรูปลง Canvas
      ctx.drawImage(img, 0, 0, width, height);

      // ลองบีบอัดด้วยคุณภาพระดับต่างๆ จนกว่าขนาดจะ <= maxSizeKB
      let quality = 0.85;

      const attemptCompression = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Image compression failed"));
            }

            // ถ้าขนาดไฟล์ <= maxSizeKB หรือคุณภาพลดถึง 0.35 แล้ว ให้ยอมรับผลลัพธ์
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.35) {
              resolve(blob);
            } else {
              quality -= 0.1;
              attemptCompression();
            }
          },
          "image/webp",
          quality
        );
      };

      attemptCompression();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}
