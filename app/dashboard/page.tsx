import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Package,
  Plus,
  Ticket,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = (await getCurrentUser())!;

  // 1. Fetch user's reported items
  const { data: myItems } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const itemsList = myItems || [];
  const itemIds = itemsList.map((i) => i.id);

  // 2. Fetch user's claims
  const { data: myClaims } = await supabase
    .from("claims")
    .select("*, items (*)")
    .eq("claimant_id", user.id)
    .order("created_at", { ascending: false });

  const claimsList = myClaims || [];

  // 3. Fetch match suggestions involving user's items
  let matchCount = 0;
  if (itemIds.length > 0) {
    const { count } = await supabase
      .from("match_suggestions")
      .select("*", { count: "exact", head: true })
      .or(
        `lost_item_id.in.(${itemIds.join(",")}),found_item_id.in.(${itemIds.join(",")})`
      );
    matchCount = count || 0;
  }

  return (
    <div className="space-y-8">
      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                รายการที่แจ้งไว้
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {itemsList.length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                คำขอเคลมรับของ
              </p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">
                {claimsList.length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Ticket className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 rounded-2xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                AI จับคู่สำเร็จ
              </p>
              <h3 className="text-2xl font-bold mt-1 text-primary">
                {matchCount} รายการ
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: My Reported Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              รายการที่คุณแจ้งไว้ (My Items)
            </h2>
            <p className="text-xs text-muted-foreground">
              สิ่งของที่คุณทำหาย หรือเป็นคนเก็บได้
            </p>
          </div>
          <Button asChild size="sm" className="rounded-xl gap-1 text-xs">
            <Link href="/items/new">
              <Plus className="w-3.5 h-3.5" /> แจ้งรายการใหม่
            </Link>
          </Button>
        </div>

        {itemsList.length === 0 ? (
          <div className="text-center py-12 bg-card/40 rounded-2xl border border-dashed border-border/70">
            <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">
              คุณยังไม่เคยลงรายการสิ่งของ
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              หากทำของหาย หรือเก็บของได้ สามารถเริ่มแจ้งได้ทันที
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/items/new">แจ้งรายการแรก</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {itemsList.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-all rounded-2xl group"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {item.image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_urls[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl">
                      📦
                    </div>
                  )}
                  <div
                    className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.type === "LOST"
                        ? "bg-red-500/90 text-white"
                        : "bg-emerald-500/90 text-white"
                    }`}
                  >
                    {item.type}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-mono bg-black/60 text-white backdrop-blur-xs"
                    >
                      {item.status}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-2">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.description || "ไม่มีรายละเอียด"}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("th-TH")}
                    </span>
                    <Link
                      href={`/items/${item.id}`}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      ดูรายละเอียด <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: My Claims */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Ticket className="w-4 h-4 text-amber-500" />
            คำขอยื่นรับของของคุณ (My Claims)
          </h2>
          <p className="text-xs text-muted-foreground">
            รายการของที่คุณกดขอรับคืน และรหัส Claim Pass
          </p>
        </div>

        {claimsList.length === 0 ? (
          <div className="text-center py-10 bg-card/40 rounded-2xl border border-dashed border-border/70">
            <Ticket className="w-9 h-9 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              คุณยังไม่มียื่นเคลมสิ่งของใดๆ
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {claimsList.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0">
                    {c.items?.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.items.image_urls[0]}
                        alt={c.items.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        🎫
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {c.items?.title || "รายการสิ่งของ"}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      Pass: #FB-{c.id.replace(/-/g, "").slice(0, 4).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      c.status === "APPROVED"
                        ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                        : c.status === "REJECTED"
                        ? "border-destructive text-destructive bg-destructive/10"
                        : "border-amber-500 text-amber-500 bg-amber-500/10"
                    }`}
                  >
                    {c.status}
                  </Badge>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href={`/claims/${c.id}`}>ดูบัตรนัดรับ</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
