import Link from "next/link";
import { AuthButton } from "./auth-button";
import { Suspense } from "react";
import {
  PackageSearch,
  Bot,
  LayoutDashboard,
  Shield,
  PlusCircle,
} from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { getCurrentUser } from "@/lib/session";
import { MatchNotificationBell } from "./match-notification-bell";

async function UserNavItems() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <>
      <Link
        href="/dashboard"
        className="px-3.5 py-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5"
      >
        <LayoutDashboard size={15} />
        Dashboard
      </Link>

      {(user.role === "ADMIN" || user.role === "STAFF") && (
        <Link
          href="/admin/claims"
          className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center gap-1 text-xs font-semibold"
        >
          <Shield size={14} />
          Admin เคลม
        </Link>
      )}
    </>
  );
}

async function NotificationBellWrapper() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <MatchNotificationBell />;
}

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Desktop Nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-2 rounded-xl text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/30">
              <PackageSearch size={22} className="transition-transform duration-300" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
              Find<span className="text-primary">Back</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 text-sm font-medium">
            <Link
              href="/feed"
              className="px-3.5 py-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              Feed รายการ
            </Link>
            <Link
              href="/items/new"
              className="px-3.5 py-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <PlusCircle size={15} className="text-primary" />
              แจ้งรายการใหม่
            </Link>
            <Link
              href="/chat"
              className="px-3.5 py-2 rounded-full hover:bg-primary/15 text-primary transition-colors flex items-center gap-1.5 font-semibold bg-primary/10 border border-primary/20"
            >
              <Bot size={15} />
              แชทกับ AI
            </Link>

            <Suspense fallback={null}>
              <UserNavItems />
            </Suspense>
          </div>
        </div>

        {/* Auth & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Suspense fallback={null}>
            <NotificationBellWrapper />
          </Suspense>
          <ThemeSwitcher />
          <Suspense
            fallback={
              <div className="h-9 w-20 animate-pulse bg-muted rounded-full"></div>
            }
          >
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
