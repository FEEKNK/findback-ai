import Link from "next/link";
import { Button } from "./ui/button";
import { getCurrentUser } from "@/lib/session";
import { signOutAction } from "@/app/actions/auth";
import { Badge } from "./ui/badge";
import { ShieldCheck, GraduationCap, LogOut } from "lucide-react";

export async function AuthButton() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-muted/50 border border-border/50 hover:border-primary/40 py-1 px-3 rounded-full text-xs transition-colors group"
          title="ไปที่ Dashboard ของคุณ"
        >
          {user.role === "ADMIN" ? (
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="font-medium text-foreground max-w-[120px] truncate group-hover:text-primary transition-colors">
            {user.full_name}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${
              user.role === "ADMIN"
                ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                : "border-primary/40 text-primary bg-primary/10"
            }`}
          >
            {user.role === "ADMIN" ? "Admin" : "นักศึกษา"}
          </Badge>
        </Link>

        <form action={signOutAction}>
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-red-500 gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ออก</span>
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline" className="h-8 text-xs">
        <Link href="/auth/login">เข้าสู่ระบบ</Link>
      </Button>
    </div>
  );
}
