/**
 * AI Progressive Intake & Clarification Engine
 * ทำหน้าที่ดูแลการรับข้อมูลแบบ Multi-turn (จำบริบทการสนทนา)
 * ประเมินความครบถ้วนของข้อมูล (Completeness Score)
 * ซักถามเจาะจงทีละคำถามพร้อม Quick Replies เพื่อให้การจับคู่แม่นยำที่สุด
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateMatchScore, executeMatchScan, ItemForMatch } from "@/lib/matching";

export interface ItemDraft {
  intent: "LOST" | "FOUND" | "SEARCH" | "QUESTION" | "GENERAL";
  title?: string;
  category?: string;
  brand?: string;
  color?: string;
  location_building?: string;
  location_detail?: string;
  dropoff_location?: string;
  depositor_name?: string;
  depositor_phone?: string;
  line_user_id?: string;
  distinctive_features?: string;
  inside_items?: string;
  event_time?: string;
  completenessScore: number; // 0 - 100
  clarifyCount: number;      // จำนวนครั้งที่ถามเจาะจงไปแล้ว
}

export interface ChatMessageHistory {
  role: "user" | "assistant";
  content: string;
}

export interface MatchedItemRecord {
  id: string;
  title: string;
  category?: string | null;
  description?: string | null;
  location_building?: string | null;
  location_detail?: string | null;
  dropoff_location?: string | null;
  status?: string;
  image_urls?: string[];
  created_at?: string;
  ai_tags?: string[];
  matchScore?: number;
  matchDetails?: Record<string, unknown>;
  profiles?: {
    full_name?: string | null;
    phone?: string | null;
    preferred_contact?: string | null;
  } | {
    full_name?: string | null;
    phone?: string | null;
    preferred_contact?: string | null;
  }[];
}

export interface IntakeResult {
  replyText: string;
  quickReplies?: { label: string; text: string }[];
  isComplete: boolean;
  draft: ItemDraft;
  matchedItems?: MatchedItemRecord[];
  insertedItem?: Record<string, unknown> | null;
}

// In-Memory Multi-turn Session Store (TTL: 2 ชั่วโมง)
interface SessionRecord {
  draft: ItemDraft;
  history: ChatMessageHistory[];
  lastUpdated: number;
}

const sessionStore = new Map<string, SessionRecord>();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function getSession(sessionId: string): SessionRecord {
  const now = Date.now();
  const existing = sessionStore.get(sessionId);

  if (existing && now - existing.lastUpdated < SESSION_TTL_MS) {
    existing.lastUpdated = now;
    return existing;
  }

  // สร้าง Session ใหม่
  const fresh: SessionRecord = {
    draft: {
      intent: "GENERAL",
      completenessScore: 0,
      clarifyCount: 0,
    },
    history: [],
    lastUpdated: now,
  };
  sessionStore.set(sessionId, fresh);
  return fresh;
}

function updateSession(sessionId: string, draft: ItemDraft, history: ChatMessageHistory[]) {
  sessionStore.set(sessionId, {
    draft,
    history: history.slice(-10), // เก็บย้อนหลังสูงสุด 10 ประโยค
    lastUpdated: Date.now(),
  });
}

export function clearSession(sessionId: string) {
  sessionStore.delete(sessionId);
}

/**
 * ฟังก์ชันหลัก: ประมวลผลข้อความและพัฒนาข้อมูลแบบ Progressive
 */
export async function evaluateAndProgressIntake(
  sessionId: string,
  userMessage: string,
  userId?: string | null,
  lineUserId?: string | null
): Promise<IntakeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const session = getSession(sessionId);
  const currentDraft = session.draft;
  const history = session.history;

  // บันทึก line_user_id เข้า draft ถ้ามี
  if (lineUserId && !currentDraft.line_user_id) {
    currentDraft.line_user_id = lineUserId;
  }

  // ป้องกัน Denial of Wallet / Token Exhaustion: จำกัดความยาวข้อความไม่เกิน 1,000 ตัวอักษร
  const sanitizedMessage = (userMessage || "").trim().slice(0, 1000);

  // เพิ่มข้อความของผู้ใช้ลงประวัติ (จำกัดประวัติสูงสุด 20 ข้อความล่าสุด)
  history.push({ role: "user", content: sanitizedMessage });
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  if (!apiKey) {
    return {
      replyText: "ขออภัยครับ ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ",
      isComplete: false,
      draft: currentDraft,
    };
  }

  // 1. ส่งข้อมูลให้ Gemini ประเมินและผสานรวมกับ Draft เดิม
  const conversationContext = history
    .map((h) => `${h.role === "user" ? "User" : "AI"}: ${h.content}`)
    .join("\n");

  const prompt = `คุณคือ AI ผู้ช่วยอัจฉริยะประจำระบบ FindBack (ระบบตามหาของหายและแจ้งของเจอในสถาบัน/มหาวิทยาลัย)
หน้าที่ของคุณคือ: ช่วยซักถามและเก็บรายละเอียดสิ่งของจากผู้ใช้แบบเป็นขั้นตอน (Progressive Intake) เพื่อให้ระบบนำไปจับคู่ (Matching) ได้อย่างแม่นยำที่สุด

ประวัติการสนทนา:
${conversationContext}

ข้อมูลสิ่งของที่สกัดได้ก่อนหน้านี้ (Current Draft):
${JSON.stringify(currentDraft, null, 2)}

ข้อความล่าสุดจากผู้ใช้: "${sanitizedMessage}"

คำแนะนำในการประเมิน:
1. วิเคราะห์ intent:
   - "LOST" (ทำของหาย หรือกำลังตามหาของตัวเอง)
   - "FOUND" (เก็บของได้ ต้องการส่งมอบหรือหาเจ้าของ)
   - "SEARCH" (ถามค้นหาดูว่ามีใครเก็บของแบบนี้ได้บ้าง)
   - "GENERAL" (ทักทาย หรือคุยเรื่องอื่น)
2. รวมข้อมูลใหม่เข้ากับ Draft เดิม (ห้ามลืมข้อมูลเก่า):
   - title: ชื่อกระชับ
   - category: เช่น กระเป๋า, อุปกรณ์อิเล็กทรอนิกส์, บัตร, กุญแจ, เสื้อผ้า, เครื่องประดับ, ของใช้อื่นๆ
   - brand: เช่น Coach, Apple, Samsung, Honda, Nike
   - color: สีหลัก เช่น ดำ, ขาว, น้ำตาล, กรม
   - location_building: อาคารหรือสถานที่พบ/ทำหาย
   - location_detail: ชั้น บริเวณ เช่น ห้อง 301, โต๊ะริมหน้าต่าง
   - dropoff_location: จุดรับฝากของ (สำหรับ FOUND เช่น ป้อม รปภ. ประตู 1, ประชาสัมพันธ์, ห้องธุรการ, เก็บไว้กับตัว)
   - depositor_name: ชื่อผู้พบ/ผู้ฝาก (สำหรับ FOUND เช่น คุณสมชาย)
   - depositor_phone: เบอร์โทรผู้พบ/ผู้ฝาก (สำหรับ FOUND เช่น 081-234-5678)
   - distinctive_features: จุดสังเกตเฉพาะ เช่น หน้าจอแตก, มีพวงกุญแจหมี, ซิปสีทอง
   - inside_items: ของด้านใน (สำหรับกระเป๋า เช่น มีบัตรนักศึกษา, กุญแจหอ)
3. คำนวณ completenessScore (0 - 100):
   - กรณี LOST (ของหาย):
     - มีแค่ประเภทของอย่างเดียว = 25%
     - มีประเภท + สี หรือ สถานที่ = 50%
     - มีประเภท + สี + ยี่ห้อ + สถานที่ = 75%
     - มีจุดสังเกตเฉพาะ หรือของข้างใน = 90-100%
   - กรณี FOUND (เก็บของได้) *สำคัญมาก*:
     - ระบบต้องทราบว่า "นำไปฝากไว้ที่จุดไหน (dropoff_location)" และ "ชื่อ/เบอร์ติดต่อผู้ฝาก (depositor_name/phone)" เพื่อให้เจ้าของหรือเจ้าหน้าที่ติดต่อขอรับของคืนได้ถูกต้อง
     - มีแค่ของอย่างเดียว = 25%
     - มีของ + สี หรือ สถานที่พบ = 50%
     - มีของ + จุดรับฝากของ (dropoff_location) = 75%
     - มีของ + จุดรับฝาก + ข้อมูลผู้ฝาก (ชื่อ/เบอร์) = 90-100%
     - ถ้าเป็นกรณี FOUND แล้วยังไม่รู้จุดรับฝากของ ให้ถือว่า needMoreInfo = true เสมอ เพื่อถามจุดรับฝากของและชื่อผู้ฝาก พร้อมแนะนำ Quick Replies จุดรับฝาก!
4. การตัดสินใจ:
   - ถ้า completenessScore < 70 และ clarifyCount < 3: ให้ถือว่า needMoreInfo = true
   - ให้เลือกถามเฉพาะ "ข้อมูลที่สำคัญที่สุดที่ยังขาดอยู่เพียง 1 เรื่อง" เท่านั้น เช่น:
     - หากเป็น FOUND และยังไม่ทราบจุดรับฝาก: ถามว่านำของไปฝากไว้ที่จุดไหน หรือมีเบอร์ติดต่อผู้ฝากไหม พร้อมตัวเลือกจุดรับฝาก
     - หากเป็น LOST และยังไม่ทราบสี/สถานที่: ถามสีหรือสถานที่
   - พร้อมสร้าง quickReplies 3-4 ตัวเลือกที่เป็นไปได้ เพื่อให้ผู้ใช้กดตอบได้ง่ายในคลิกเดียว
   - ถ้า completenessScore >= 70 หรือ clarifyCount >= 3 หรือผู้ใช้บอกว่า "จำได้แค่นี้/ไม่มีข้อมูลเพิ่ม": ให้ needMoreInfo = false และสรุปข้อมูลให้ชัดเจน

ตอบกลับเป็น JSON เท่านั้นในรูปแบบนี้:
{
  "intent": "LOST" | "FOUND" | "SEARCH" | "GENERAL",
  "updatedDraft": {
    "title": "...",
    "category": "...",
    "brand": "...",
    "color": "...",
    "location_building": "...",
    "location_detail": "...",
    "dropoff_location": "...",
    "depositor_name": "...",
    "depositor_phone": "...",
    "distinctive_features": "...",
    "inside_items": "..."
  },
  "completenessScore": 65,
  "needMoreInfo": true,
  "replyText": "ข้อความภาษาไทยตอบกลับอย่างเป็นมิตร สุภาพ พร้อมคำถามเจาะจง 1 ข้อ",
  "quickReplies": [
    { "label": "ป้อม รปภ. ประตู 1", "text": "ฝากไว้ที่ป้อม รปภ. ประตู 1 ครับ" },
    { "label": "เคาน์เตอร์ประชาสัมพันธ์", "text": "ฝากไว้ที่เคาน์เตอร์ประชาสัมพันธ์ครับ" },
    { "label": "เก็บไว้กับตัวผมเอง", "text": "ตอนนี้เก็บไว้กับตัวผมเองครับ" }
  ]
}`;

interface GeminiParsedResponse {
  intent?: ItemDraft["intent"];
  updatedDraft?: Partial<ItemDraft>;
  completenessScore?: number;
  needMoreInfo?: boolean;
  replyText?: string;
  quickReplies?: { label: string; text: string }[];
}

  let parsed: GeminiParsedResponse | null = null;
  const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: "application/json",
              maxOutputTokens: 800,
            },
          }),
        }
      );

      const data = await res.json();
      if (data.error) continue;

      const parts = data.candidates?.[0]?.content?.parts || [];
      const textPart =
        parts.find((p: { text?: string; thought?: boolean }) => p.text && !p.thought)?.text ||
        parts[parts.length - 1]?.text ||
        "";
      parsed = JSON.parse(textPart.replace(/```json\n?|\n?```/g, "").trim());
      if (parsed) break;
    } catch {
      continue;
    }
  }

  if (!parsed) {
    return {
      replyText: "ขออภัยครับ ระบบกำลังประมวลผล กรุณาลองส่งข้อความใหม่อีกครั้งนะครับ",
      isComplete: false,
      draft: currentDraft,
    };
  }

  // รวมข้อมูลใหม่เข้ากับ Draft
  const newDraft: ItemDraft = {
    ...currentDraft,
    ...(parsed.updatedDraft || {}),
    intent: parsed.intent || currentDraft.intent,
    completenessScore: parsed.completenessScore || 50,
    clarifyCount: currentDraft.clarifyCount + (parsed.needMoreInfo ? 1 : 0),
  };

  // 2. ตรวจสอบการจับคู่ในฐานข้อมูล Supabase แบบ Real-time
  const supabase = createAdminClient();
  const searchType = newDraft.intent === "LOST" || newDraft.intent === "SEARCH" ? "FOUND" : "LOST";
  
  const { data: candidates } = await supabase
    .from("items")
    .select(`
      id, title, category, description, location_building, location_detail, 
      dropoff_location, status, image_urls, created_at, ai_tags,
      profiles(full_name, phone, preferred_contact)
    `)
    .eq("status", "OPEN")
    .eq("type", searchType)
    .limit(20);

  let matchedItems: MatchedItemRecord[] = [];
  if (candidates && candidates.length > 0) {
    const queryItem: ItemForMatch = {
      id: "query",
      type: newDraft.intent === "FOUND" ? "FOUND" : "LOST",
      title: newDraft.title || userMessage,
      category: newDraft.category,
      location_building: newDraft.location_building,
      created_at: new Date().toISOString(),
    };

    for (const cand of candidates) {
      const candItem: ItemForMatch = {
        id: cand.id,
        type: searchType,
        title: cand.title,
        category: cand.category,
        location_building: cand.location_building,
        created_at: cand.created_at,
      };

      const { score } = calculateMatchScore(queryItem, candItem);
      if (score >= 45) {
        matchedItems.push({
          ...cand,
          matchScore: score,
        });
      }
    }

    matchedItems.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  // 3. Disambiguation Check: ถ้าเจอของที่คล้ายกันหลายชิ้น และ AI ยังสามารถซักถามเพิ่มได้
  let finalReply = parsed?.replyText || "รับทราบข้อมูลครับ";
  const quickReplies = parsed?.quickReplies || [];

  if (matchedItems.length > 1 && parsed?.needMoreInfo && newDraft.clarifyCount <= 2) {
    const topItem = matchedItems[0];
    finalReply = `${finalReply}\n\n💡 *ระบบพบสิ่งของที่อาจตรงกัน ${matchedItems.length} รายการในฐานข้อมูล* เช่น "${topItem.title}" ที่ ${topItem.location_building || "จุดรับฝาก"} เพื่อช่วยแยกแยะให้ชัดเจน กรุณาระบุรายละเอียดตามที่สอบถามด้านบนได้เลยครับ`;
  }

  // 4. หากข้อมูลครบถ้วน หรือถามครบแล้ว ให้ดำเนินการบันทึก หรือแสดงผลการจับคู่
  const isComplete = !parsed?.needMoreInfo || newDraft.completenessScore >= 75 || newDraft.clarifyCount >= 3;
  let insertedItem: Record<string, unknown> | null = null;

  if (isComplete && (newDraft.intent === "LOST" || newDraft.intent === "FOUND") && newDraft.title) {
    // บันทึกรายการลง Supabase items จริง
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: defaultUser } = await supabase.from("profiles").select("id").limit(1).single();
      effectiveUserId = defaultUser?.id || "8135184c-e3ac-4b51-b297-d221b87d4d35";
    }

    const tags = [
      newDraft.title,
      ...(newDraft.category ? [newDraft.category] : []),
      ...(newDraft.brand ? [newDraft.brand] : []),
      ...(newDraft.color ? [newDraft.color] : []),
      ...(newDraft.location_building ? [newDraft.location_building] : []),
    ];

    const descriptionParts = [
      newDraft.title,
      newDraft.color ? `สี: ${newDraft.color}` : null,
      newDraft.brand ? `แบรนด์: ${newDraft.brand}` : null,
      newDraft.distinctive_features ? `จุดสังเกต: ${newDraft.distinctive_features}` : null,
      newDraft.inside_items ? `ของด้านใน: ${newDraft.inside_items}` : null,
      newDraft.dropoff_location ? `จุดรับฝาก: ${newDraft.dropoff_location}` : null,
      newDraft.depositor_name
        ? `ผู้ฝาก: ${newDraft.depositor_name}${newDraft.depositor_phone ? ` (${newDraft.depositor_phone})` : ""}`
        : null,
    ].filter(Boolean).join(" | ");

    // ตรวจสอบการบันทึกซ้ำ (Deduplication Check เพื่อป้องกัน Webhook Retry สแปม)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const { data: existingDuplicate } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", effectiveUserId)
      .eq("type", newDraft.intent)
      .eq("title", newDraft.title)
      .gte("created_at", threeMinutesAgo)
      .maybeSingle();

    let dbItem = existingDuplicate;

    if (!dbItem) {
      const { data: created } = await supabase
        .from("items")
        .insert({
          user_id: effectiveUserId,
          type: newDraft.intent,
          title: newDraft.title,
          description: descriptionParts || userMessage,
          category: newDraft.category || "ของใช้อื่นๆ",
          location_building: newDraft.location_building || null,
          location_detail: newDraft.location_detail || null,
          dropoff_location: newDraft.intent === "FOUND" ? newDraft.dropoff_location || "จุดรับฝากส่วนกลาง" : null,
          status: "OPEN",
          ai_status: "SUCCESS",
          ai_category: newDraft.category || "ของใช้อื่นๆ",
          ai_color: newDraft.color || null,
          ai_tags: tags,
          ai_metadata: JSON.parse(JSON.stringify(newDraft)),
        })
        .select()
        .single();

      dbItem = created;
    }

    if (dbItem) {
      insertedItem = dbItem as unknown as Record<string, unknown>;
      // ล้าง Session เพื่อให้รอบถัดไปเป็นการคุยเรื่องใหม่
      clearSession(sessionId);

      // บันทึกการจับคู่ลงตาราง match_suggestions ใน Supabase ทันที!
      try {
        await executeMatchScan(dbItem.id);

        // ดึงรายการที่ระบบสแกนพบความตรงกัน (score >= 50%) ออกมาแจ้งผู้ใช้ทันที
        const { data: suggestions } = await supabase
          .from("match_suggestions")
          .select(`
            id, score, match_details,
            lost_item:lost_item_id (id, title, category, description, location_building, dropoff_location, image_urls, ai_metadata, user_id),
            found_item:found_item_id (id, title, category, description, location_building, dropoff_location, image_urls, ai_metadata, user_id)
          `)
          .or(`lost_item_id.eq.${dbItem.id},found_item_id.eq.${dbItem.id}`)
          .gte("score", 50)
          .order("score", { ascending: false });

        if (suggestions && suggestions.length > 0) {
          const fetchedMatches: MatchedItemRecord[] = [];
          for (const s of suggestions) {
            const isLost = dbItem.type === "LOST";
            const target = (isLost ? s.found_item : s.lost_item) as unknown as MatchedItemRecord | null;
            if (target) {
              fetchedMatches.push({
                ...target,
                matchScore: s.score,
                matchDetails: s.match_details as Record<string, unknown>,
              });
            }
          }

          if (fetchedMatches.length > 0) {
            matchedItems = fetchedMatches;
          }
        }
      } catch (scanErr) {
        console.error("[Match Scan Exception]:", scanErr);
      }

      // ปรับข้อความตอบกลับให้ตื่นเต้นและแจ้งผลทันทีเมื่อพบของที่ตรงกัน
      if (matchedItems && matchedItems.length > 0) {
        const topMatch = matchedItems[0];
        if (newDraft.intent === "LOST") {
          finalReply = `🎉 ข่าวดีครับ! ระบบ AI ได้จับคู่พบสิ่งของที่ตรงกับรายการที่คุณตามหาทันที ${matchedItems.length} รายการ (ความตรงกันสูงสุด ${topMatch.matchScore}%)!\n\n📦 รายการที่พบ: "${topMatch.title}"\n📍 จุดรับฝาก/ติดต่อ: ${topMatch.dropoff_location || "จุดรับฝากส่วนกลาง"}\n\nคุณสามารถตรวจสอบรายละเอียดและกดขอรับของคืนได้ที่การ์ดด้านล่างนี้ได้เลยครับ 👇`;
        } else {
          finalReply = `✨ ขอบคุณสำหรับน้ำใจมากครับ! ระบบได้บันทึกของที่คุณเก็บได้ "${newDraft.title}" เข้าระบบเรียบร้อยแล้ว 📍 จุดรับฝาก: ${newDraft.dropoff_location || "ส่วนกลาง"}\n\n🎉 ข่าวดี! ระบบ AI ตรวจพบประกาศตามหาของหายที่ตรงกันทันที (ความตรงกัน ${topMatch.matchScore}%)!\n📦 ประกาศตามหา: "${topMatch.title}"\n\nระบบได้ทำการแจ้งเตือนไปยังเจ้าของเรียบร้อยแล้วครับ 🔔`;
        }
      } else {
        if (newDraft.intent === "LOST") {
          finalReply = `✅ ขอบคุณสำหรับข้อมูลที่ครบถ้วนครับ! ระบบได้บันทึกประกาศตามหา "${newDraft.title}" (${newDraft.color || ""} ${newDraft.brand || ""}) เข้าระบบเรียบร้อยแล้ว\n\nระบบ AI จะคอยตรวจจับคู่กับของที่มีคนส่งมอบตลอด 24 ชม. ทันทีที่มีคนเก็บได้จะแจ้งเตือนคุณทันทีครับ 🔔`;
        } else {
          const depositorNote = newDraft.depositor_name ? ` (ผู้ฝาก: ${newDraft.depositor_name})` : "";
          finalReply = `✨ ขอบคุณสำหรับน้ำใจมากครับ! ระบบได้บันทึกของที่คุณเก็บได้ "${newDraft.title}"${depositorNote} เข้าระบบเรียบร้อยแล้ว 📍 จุดรับฝาก: ${newDraft.dropoff_location || "ส่วนกลาง"}\n\nหากมีเจ้าของติดต่อมาระบบจะประสานงานทันทีครับ!`;
        }
      }
    }
  }

  // อัปเดตประวัติของ Session
  history.push({ role: "assistant", content: finalReply });
  updateSession(sessionId, newDraft, history);

  return {
    replyText: finalReply,
    quickReplies: isComplete ? undefined : quickReplies,
    isComplete,
    draft: newDraft,
    matchedItems: matchedItems.slice(0, 5),
    insertedItem,
  };
}
