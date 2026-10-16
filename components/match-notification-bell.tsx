"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Sparkles, MapPin, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  getUserMatchNotificationsAction,
  MatchNotificationItem,
} from "@/app/actions/notifications";

export function MatchNotificationBell() {
  const [matches, setMatches] = useState<MatchNotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    getUserMatchNotificationsAction()
      .then((data) => setMatches(data))
      .catch(() => setMatches([]));

    // เช็คอัปเดตทุกๆ 30 วินาที
    const timer = setInterval(() => {
      getUserMatchNotificationsAction().then((data) => setMatches(data));
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const unreadCount = matches.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="แจ้งเตือนการจับคู่"
          className="relative p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-2 rounded-2xl bg-card/95 backdrop-blur-xl border-border/60 shadow-2xl space-y-1"
      >
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>AI Match Alerts (การจับคู่สิ่งของ)</span>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              พบ {unreadCount} รายการ
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border/50" />

        {matches.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <Bell className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="font-medium">ยังไม่มีการแจ้งเตือนการจับคู่ใหม่</p>
            <p className="text-[10px]">เมื่อ AI พบของที่ตรงกับประกาศของคุณ จะแจ้งเตือนทันที</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1.5 p-1">
            {matches.map((item) => (
              <DropdownMenuItem
                key={item.id}
                asChild
                className="p-0 rounded-xl cursor-pointer focus:bg-muted/80 transition-colors"
              >
                <Link
                  href={`/items/${item.found_id || item.lost_id}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-3 rounded-xl border border-border/50 hover:border-primary/40 bg-muted/30 hover:bg-muted/60 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-foreground line-clamp-1">
                      พบของที่ตรงกับ: &ldquo;{item.lost_title}&rdquo;
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] shrink-0 font-bold">
                      ตรงกัน {item.score}%
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-1">
                    📦 สิ่งของ: <span className="text-foreground font-medium">{item.found_title}</span>
                  </p>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-background/50 p-1.5 rounded-lg border border-border/40">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">จุดรับฝาก: {item.dropoff_location}</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="bg-border/50" />

        <div className="p-1">
          <Link
            href="/dashboard/matches"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <span>ดูรายการจับคู่ทั้งหมดใน Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
