"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUserAction } from "@/app/actions/auth";
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from "lucide-react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const res = await loginUserAction(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
        return;
      }

      if (res?.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 shadow-2xl overflow-hidden bg-card/70 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white mb-2 shadow-lg shadow-primary/20">
            <LogIn className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">เข้าสู่ระบบ FindBack</CardTitle>
          <CardDescription className="text-xs">
            ระบบจะส่งไปยังหน้าทำงานที่ถูกต้องตามบทบาทของคุณ (ผู้ใช้งาน หรือ แอดมิน) อัตโนมัติ
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" /> อีเมล
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="your.email@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" /> รหัสผ่าน
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] text-muted-foreground hover:text-primary underline underline-offset-4"
                >
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่านของคุณ"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-semibold gap-2 mt-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
            ยังไม่มีบัญชีผู้ใช้งาน?{" "}
            <Link href="/auth/sign-up" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
              สมัครสมาชิกที่นี่ (เลือกสิทธิ์ได้)
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
