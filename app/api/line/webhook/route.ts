import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { handleLineMessage } from "@/lib/line-bot";

/**
 * LINE Messaging API Webhook Handler
 * POST /api/line/webhook
 *
 * ตรวจสอบ HMAC-SHA256 Signature จาก LINE Platform ก่อนประมวลผล
 * เพื่อป้องกันคนอื่นปลอม request
 */

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";

function verifyLineSignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET || LINE_CHANNEL_SECRET.includes("your-line-channel-secret")) {
    if (process.env.NODE_ENV === "production") {
      console.error("[LINE Webhook Error] LINE_CHANNEL_SECRET missing in production — rejecting unverified request");
      return false;
    }
    console.warn("[LINE Webhook] LINE_CHANNEL_SECRET is placeholder or empty — allowing in dev mode");
    return true;
  }
  const hmac = crypto.createHmac("sha256", LINE_CHANNEL_SECRET);
  hmac.update(body);
  const digest = hmac.digest("base64");
  return digest === signature;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";

    console.log("[LINE Webhook Incoming Raw]:", rawBody);

    if (!verifyLineSignature(rawBody, signature)) {
      console.error("[LINE Webhook] Invalid signature — check LINE_CHANNEL_SECRET");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const events = body.events || [];
    console.log(`[LINE Webhook Events Count]: ${events.length}`);


    // ประมวลผล background โดยไม่บล็อก LINE response
    // LINE ต้องการ HTTP 200 ทันทีภายใน 1 วินาที ไม่งั้น LINE จะถือว่า timeout และส่งข้อความอัตโนมัติว่าตอบไม่ได้
    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        handleLineMessage({
          replyToken: event.replyToken,
          message: event.message,
          source: event.source,
        }).catch((err) => console.error("[Background handleLineMessage Error]:", err));
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[LINE Webhook Error]:", err);
    // LINE ต้องการ 200 เสมอ ไม่งั้นจะ retry ซ้ำ
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

// LINE จะ GET เพื่อ verify webhook URL ด้วย
export async function GET() {
  return NextResponse.json({ status: "FindBack LINE Bot Webhook Active 🤖" });
}
