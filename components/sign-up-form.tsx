"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { signUpNewUserAction } from "@/app/actions/auth";
import { 
  GraduationCap, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  KeyRound, 
  ArrowRight, 
  AlertCircle,
  Loader2
} from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      setIsLoading(false);
      return;
    }

    if (role === "ADMIN" && !adminCode.trim()) {
      setError("กรุณากรอกรหัสยืนยันเจ้าหน้าที่ (Admin Passcode)");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("role", role);
    formData.append("full_name", fullName);
    formData.append("student_id", identifier);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("password", password);
    if (role === "ADMIN") {
      formData.append("admin_code", adminCode);
    }

    try {
      const res = await signUpNewUserAction(formData);
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
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 shadow-2xl overflow-hidden bg-card/70 backdrop-blur-md rounded-2xl">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center text-white mb-2 shadow-lg shadow-primary/20">
            {role === "ADMIN" ? <ShieldCheck className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {role === "ADMIN" ? "ลงทะเบียนเจ้าหน้าที่ / แอดมิน" : "สมัครสมาชิก FindBack"}
          </CardTitle>
          <CardDescription className="text-xs">
            {role === "ADMIN" 
              ? "สำหรับเจ้าหน้าที่ รปภ. / ศูนย์บริการของหาย เพื่อจัดการและอนุมัติการคืนของ"
              : "สำหรับนักศึกษาและประชาชนทั่วไป เพื่อแจ้งของหายและค้นหาของที่เก็บได้"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setRole("USER");
                setError(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all",
                role === "USER"
                  ? "bg-background text-foreground shadow-sm font-bold border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GraduationCap className="w-4 h-4 text-primary" />
              <span>นักศึกษา / ทั่วไป</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("ADMIN");
                setError(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all",
                role === "ADMIN"
                  ? "bg-amber-500/10 text-amber-500 shadow-sm font-bold border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>เจ้าหน้าที่ / Admin</span>
              <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 ml-1">Staff</Badge>
            </button>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-500 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Admin Security Passcode Field (Only shown for Admin) */}
            {role === "ADMIN" && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin_code" className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> รหัสยืนยันเจ้าหน้าที่ (Admin Passcode) <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">Default: ADMIN1234</span>
                </div>
                <Input
                  id="admin_code"
                  name="admin_code"
                  type="password"
                  autoComplete="one-time-code"
                  placeholder="กรอกรหัสยืนยันเจ้าหน้าที่ (เช่น ADMIN1234)"
                  required
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  className="h-10 text-xs bg-background border-amber-500/40 focus-visible:ring-amber-500"
                />
                <p className="text-[10px] text-muted-foreground">
                  ป้องกันการสมัครสวมสิทธิ์ สอบถามรหัสได้จากผู้ดูแลระบบ
                </p>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-xs font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> ชื่อ - นามสกุล <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                placeholder={role === "ADMIN" ? "เช่น เจ้าหน้าที่สมบัติ ใจดี (ป้อม รปภ. 1)" : "เช่น นายสมชาย รักเรียน"}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Student ID / Staff ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="identifier" className="text-xs font-medium">
                  {role === "ADMIN" ? "รหัสเจ้าหน้าที่ / ประจำจุด" : "รหัสนักศึกษา / รหัสประจำตัว"}
                </Label>
                <Input
                  id="identifier"
                  name="identifier"
                  placeholder={role === "ADMIN" ? "เช่น STAFF-001" : "เช่น 66010123"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> เบอร์โทรศัพท์
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="เช่น 081-234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" /> อีเมลสำหรับเข้าสู่ระบบ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="your.email@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" /> รหัสผ่าน <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="repeat-password" className="text-xs font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" /> ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="repeat-password"
                  name="repeatPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-11 rounded-xl font-semibold gap-2 mt-2 text-sm shadow-md transition-all active:scale-[0.99]",
                role === "ADMIN"
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังสร้างบัญชีและเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <span>ยืนยันการสมัคร {role === "ADMIN" ? "เป็นเจ้าหน้าที่" : "สมาชิก"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
            มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
            <Link href="/auth/login" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">
              เข้าสู่ระบบที่นี่
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
