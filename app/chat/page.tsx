"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Sparkles, MapPin, Ticket, ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { processChatMessage, createClaimFromChat } from "@/app/actions/chat";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  quickReplies?: { label: string; text: string }[];
  matchCard?: {
    title: string;
    imageEmoji: string;
    score: number;
    location: string;
    custodian: string;
    claimCode: string;
    detail: string;
    itemId?: string;
  };
}

export default function ChatAssistantPage() {
  const [sessionId, setSessionId] = useState("web_guest_session");

  useEffect(() => {
    setSessionId("session_" + Math.random().toString(36).slice(2, 10));
  }, []);

  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "สวัสดีครับ! ผมคือ AI ผู้ช่วยประจำ FindBack 🤖\nบอกลักษณะของที่ทำหาย หรือของที่เก็บได้มาได้เลยครับ AI จะช่วยถามข้อมูลและจับคู่ให้อัตโนมัติครับ!",
      timestamp: "10:00 น.",
      quickReplies: [
        { label: "🎒 ทำของหาย", text: "ฉันทำของหาย ช่วยตามหาหน่อยครับ" },
        { label: "📦 เก็บของได้", text: "ฉันเก็บของได้ อยากแจ้งส่งมอบคืน" },
        { label: "🔍 ค้นหากระเป๋า", text: "มีใครเก็บกระเป๋าสตางค์ได้บ้างไหม" },
      ],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const quickPrompts = [
    "ทำกระเป๋าสตางค์ Coach สีดำหายแถวโรงอาหารวิศวะ",
    "ลืม iPad Air เคสเขียวไว้ห้อง 301 ตึกเรียนรวม",
    "เก็บกุญแจรถ Honda ได้ ฝากไว้ที่ป้อม รปภ. ประตู 1",
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      timestamp: "เมื่อสักครู่",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // เรียก server action พร้อม Session ID เพื่อคงบริบทแบบ Multi-turn
      const response = await processChatMessage(text, sessionId);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: response.replyText,
        timestamp: "เมื่อสักครู่",
        quickReplies: response.quickReplies,
        matchCard: response.matchCard || undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Failed to process chat:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง",
        timestamp: "เมื่อสักครู่",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-foreground">FindBack AI Chat Assistant</h1>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                Multi-Turn Progressive AI
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">ถาม-ตอบแบบต่อเนื่อง AI ช่วยซักถามและจดจำรายละเอียดเพื่อจับคู่ของที่ใช่</p>
          </div>
        </div>

        <Link href="/feed" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          ไปหน้ารวม Feed <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-xs shrink-0 bg-muted/50 hover:bg-primary/10 hover:border-primary/40 border border-border/50 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Body */}
      <Card className="flex-1 bg-card/40 backdrop-blur-md border-border/50 flex flex-col overflow-hidden shadow-xl">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] ${
                m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.sender === "user"
                    ? "bg-primary text-white"
                    : "bg-muted border border-border text-foreground"
                }`}
              >
                {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
              </div>

              <div className="space-y-2">
                <div
                  className={`rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted/80 text-foreground border border-border/60 rounded-tl-none"
                  }`}
                >
                  {m.text}
                </div>

                {/* Quick Replies Buttons (สำหรับให้ผู้ใช้แตะตอบได้ทันที) */}
                {m.sender === "ai" && m.quickReplies && m.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.quickReplies.map((qr, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSend(qr.text)}
                        className="text-xs bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:text-primary font-medium px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <MessageCircle className="w-3 h-3" />
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Optional High Match Card */}
                {m.matchCard && (
                  <div className="bg-background/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-2xl shrink-0">
                        {m.matchCard.imageEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-foreground truncate">{m.matchCard.title}</h4>
                          <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">
                            ตรงกัน {m.matchCard.score}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.matchCard.detail}</p>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> จุดฝากของ (ไปติดต่อรับได้เลย):
                      </div>
                      <div className="text-foreground font-medium pl-5">{m.matchCard.custodian}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Ticket className="w-3.5 h-3.5 text-primary" /> รหัสรับของ:{" "}
                        <span className="font-mono font-bold text-primary">{m.matchCard.claimCode}</span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1"
                        onClick={async () => {
                          if (!m.matchCard?.itemId) return;
                          try {
                            const res = await createClaimFromChat(m.matchCard.itemId);
                            if (res?.error) {
                              alert(res.error);
                            } else {
                              alert("ส่งคำขอรับของเรียบร้อยแล้ว!");
                            }
                          } catch {
                            alert("เกิดข้อผิดพลาด หรือคุณยังไม่ได้เข้าสู่ระบบ");
                          }
                        }}
                      >
                        ยืนยันการรับของ <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] text-muted-foreground px-1 ${
                    m.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 mr-auto items-center text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted/60 px-4 py-2.5 rounded-2xl rounded-tl-none border border-border/50 flex items-center gap-1">
                <span>AI กำลังวิเคราะห์และจับคู่ข้อมูล</span>
                <span className="inline-flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <div className="p-3 bg-muted/20 border-t border-border/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ตอบ หรือบอกรายละเอียดสิ่งของที่หายหรือเก็บได้..."
              className="bg-background border-border/70 rounded-xl h-11 text-sm focus-visible:ring-primary"
            />
            <Button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="h-11 px-5 rounded-xl font-semibold gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
            >
              <Send className="w-4 h-4" /> ส่ง
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
