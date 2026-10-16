import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Sparkles, Settings } from "lucide-react";

export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Header Profile Summary */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Dashboard ส่วนตัว
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
              {user.role}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            ยินดีต้อนรับ, <strong className="text-foreground">{user.full_name}</strong>{" "}
            {user.student_id ? `(${user.student_id})` : ""}
          </p>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-2xl border border-border/50 text-xs font-semibold">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-xl hover:bg-card hover:text-foreground text-muted-foreground transition-colors flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            <span>ภาพรวม</span>
          </Link>
          <Link
            href="/dashboard/matches"
            className="px-3.5 py-2 rounded-xl hover:bg-card hover:text-foreground text-muted-foreground transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>ผลจับคู่ AI</span>
          </Link>
          <Link
            href="/dashboard/settings"
            className="px-3.5 py-2 rounded-xl hover:bg-card hover:text-foreground text-muted-foreground transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>ตั้งค่าโปรไฟล์</span>
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
