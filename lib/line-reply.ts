/**
 * LINE Reply Message Builder
 * สร้าง LINE Message Objects สำหรับ Bot Reply
 * รองรับ: Text, Flex Bubble (1 รายการ), Flex Carousel (หลายรายการ)
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export interface FoundItemCard {
  itemId: string;
  title: string;
  category: string;
  location: string;
  dropoffLocation?: string;
  contactName?: string;
  contactPhone?: string;
  contactPreferred?: string;
  score?: number;
  imageUrl?: string;
  status: string;
}

// ─── ข้อความธรรมดา ───────────────────────────────────────────────────────────
export function buildTextMessage(text: string) {
  return { type: "text", text };
}

// ─── Emoji หมวดหมู่ ───────────────────────────────────────────────────────────
function categoryEmoji(category?: string): string {
  if (!category) return "📦";
  if (category.includes("อิเล็กทรอนิกส์") || category.includes("โทรศัพท์")) return "📱";
  if (category.includes("กุญแจ")) return "🔑";
  if (category.includes("บัตร")) return "💳";
  if (category.includes("กระเป๋า")) return "👜";
  if (category.includes("เสื้อผ้า")) return "👕";
  if (category.includes("เครื่องประดับ")) return "💍";
  if (category.includes("หูฟัง") || category.includes("ลำโพง")) return "🎧";
  return "📦";
}

// ─── สร้าง Flex Bubble 1 รายการ ──────────────────────────────────────────────
export function buildItemBubble(item: FoundItemCard) {
  const emoji = categoryEmoji(item.category);
  const itemUrl = `${BASE_URL}/items/${item.itemId}`;
  const scoreText = item.score !== undefined ? `🎯 ความตรงกัน: ${item.score}%` : "";

  // ช่องทางติดต่อ: ใช้ preferred_contact → phone → ชื่อเปล่า
  const contactLine = item.contactPreferred
    ? `💬 ติดต่อ: ${item.contactPreferred}`
    : item.contactPhone
    ? `📞 ${item.contactPhone}`
    : item.contactName
    ? `👤 ${item.contactName}`
    : "📍 ติดต่อจุดรับฝาก";

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1a73e8",
      paddingAll: "12px",
      contents: [
        {
          type: "text",
          text: `${emoji} ${item.title}`,
          color: "#FFFFFF",
          weight: "bold",
          size: "md",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "12px",
      contents: [
        ...(scoreText
          ? [{ type: "text", text: scoreText, size: "xs", color: "#34A853", weight: "bold" }]
          : []),
        {
          type: "text",
          text: `📍 ${item.dropoffLocation || item.location || "จุดรับฝากส่วนกลาง"}`,
          size: "xs",
          color: "#555555",
          wrap: true,
        },
        {
          type: "text",
          text: contactLine,
          size: "xs",
          color: "#333333",
          wrap: true,
        },
        ...(item.contactName && !item.contactPreferred
          ? [{ type: "text", text: `👤 ${item.contactName}`, size: "xs", color: "#555555", wrap: true }]
          : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "8px",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "ดูรายละเอียด / เคลม",
            uri: itemUrl,
          },
          style: "primary",
          height: "sm",
          color: "#1a73e8",
        },
      ],
    },
  };
}

// ─── Flex Carousel หลายรายการ ─────────────────────────────────────────────────
export function buildCarouselMessage(items: FoundItemCard[]) {
  // LINE จำกัด Carousel สูงสุด 12 bubbles
  const bubbles = items.slice(0, 10).map(buildItemBubble);
  return {
    type: "flex",
    altText: `พบ ${items.length} รายการที่อาจตรงกัน — แตะเพื่อดูรายละเอียด`,
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

// ─── Flex Bubble เดี่ยว ───────────────────────────────────────────────────────
export function buildSingleFlexMessage(item: FoundItemCard) {
  return {
    type: "flex",
    altText: `พบรายการ: ${item.title} — แตะเพื่อดูรายละเอียด`,
    contents: buildItemBubble(item),
  };
}

// ─── Quick Reply สำหรับถามเพิ่ม ──────────────────────────────────────────────
export function buildQuickReply(label: string, text: string) {
  return {
    type: "action",
    action: { type: "message", label, text },
  };
}

export interface QuickReplyActionItem {
  type: string;
  action: {
    type: string;
    label: string;
    text: string;
  };
}

export function withQuickReplies<T extends object>(
  message: T,
  items: { label: string; text: string }[]
): T & { quickReply: { items: QuickReplyActionItem[] } } {
  return {
    ...message,
    quickReply: {
      items: items.map(({ label, text }) => buildQuickReply(label, text)),
    },
  };
}
