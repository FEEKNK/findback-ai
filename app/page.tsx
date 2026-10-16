import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { 
  MapPin, 
  Calendar, 
  ArrowRight,
  PackageSearch,
  CheckCircle2, 
  AlertCircle,
  Loader2
} from "lucide-react";


export const instant = false;

async function RecentItems() {
  let items = null;
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("items")
      .select("*")
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(6);
    items = result.data;
  } catch (err) {
    console.error("Error fetching items:", err);
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-card/40 rounded-3xl border border-dashed border-border/80 max-w-xl mx-auto space-y-3">
        <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground/40" />
        <h3 className="text-lg font-bold text-foreground">ยังไม่มีรายการสิ่งของในระบบขณะนี้</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          ร่วมสร้างสังคมแห่งการช่วยเหลือ แจ้งของหาย หรือแจ้งของที่พบเพื่อส่งคืนเจ้าของ
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/items/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            + แจ้งรายการใหม่
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <Link 
          href={`/items/${item.id}`} 
          key={item.id}
          className="group flex flex-col bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:border-primary/50 transition-all duration-300"
        >
          {/* Image Container */}
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <div className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
              item.type === 'LOST' 
                ? 'bg-red-500/90 text-white' 
                : 'bg-emerald-500/90 text-white'
            }`}>
              {item.type === 'LOST' ? 'ตามหาเจ้าของ' : 'เก็บของได้'}
            </div>
            
            {item.image_urls?.[0] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={item.image_urls[0]} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground">
                <PackageSearch size={48} opacity={0.5} />
              </div>
            )}
          </div>
          
          {/* Content Container */}
          <div className="p-5 flex flex-col flex-1">
            <h3 className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
              {item.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
              {item.description || "ไม่มีรายละเอียด"}
            </p>
            
            <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-primary/70" />
                <span className="truncate">{item.location_building || "ไม่ระบุสถานที่"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary/70" />
                <span>
                  {new Date(item.event_date).toLocaleDateString('th-TH', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
            
            {/* AI Tags */}
            {item.ai_tags && item.ai_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-border/50">
                {item.ai_tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-1 bg-secondary rounded-md text-xs font-medium text-secondary-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function ItemsSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="text-sm">กำลังโหลดรายการล่าสุด...</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center">
      {/* HERO SECTION */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 py-20 lg:py-32">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-4 flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20 backdrop-blur-sm animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-medium">ระบบแจ้งของหาย-เจอ อัจฉริยะด้วย AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl">
            หาของที่หายไป <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-500 to-amber-500">
              ให้กลับคืนมาอย่างง่ายดาย
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12">
            แพลตฟอร์มศูนย์รวมของหาย-ของเจอสำหรับบุคลากรและนักศึกษา 
            ทำงานร่วมกับ AI ช่วยจับคู่อัตโนมัติและแจ้งเตือนทันทีที่คุณตามหา
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link 
              href="/chat?intent=lost" 
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all hover:scale-105 shadow-lg shadow-red-500/30"
            >
              <AlertCircle size={20} />
              ฉันทำของหาย
            </Link>
            <Link 
              href="/chat?intent=found" 
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all hover:scale-105 shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 size={20} />
              ฉันเก็บของได้
            </Link>
          </div>
        </div>
      </section>

      {/* FEED SECTION */}
      <section className="w-full max-w-7xl mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">รายการล่าสุด</h2>
            <p className="text-muted-foreground">สิ่งของที่เพิ่งได้รับแจ้งในระบบ</p>
          </div>
          
          {/* Category Filters */}
          <div className="flex bg-muted/80 p-1 rounded-xl border border-border/40 gap-1 text-xs sm:text-sm font-medium">
            <Link
              href="/feed"
              className="px-3.5 py-1.5 rounded-lg bg-background shadow-sm font-semibold hover:text-primary transition-colors"
            >
              ทั้งหมด
            </Link>
            <Link
              href="/feed?type=LOST"
              className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-background/50 transition-colors"
            >
              🔴 ของหาย (LOST)
            </Link>
            <Link
              href="/feed?type=FOUND"
              className="px-3.5 py-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-background/50 transition-colors"
            >
              🟢 เก็บของได้ (FOUND)
            </Link>
          </div>
        </div>

        {/* ITEMS GRID WRAPPED IN SUSPENSE */}
        <Suspense fallback={<ItemsSkeleton />}>
          <RecentItems />
        </Suspense>
        
        <div className="flex justify-center mt-12">
          <Link href="/feed" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
            ดูรายการทั้งหมด
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
