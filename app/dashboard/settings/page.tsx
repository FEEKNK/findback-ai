import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/app/actions/profile";
import { User, Mail, GraduationCap, Phone, MessageSquare, Check } from "lucide-react";

export const instant = false;

export default async function DashboardSettingsPage() {
  const supabase = await createClient();
  const user = (await getCurrentUser())!;

  // Fetch full profile from DB
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">ตั้งค่าโปรไฟล์ & การแจ้งเตือน</h2>
        <p className="text-sm text-muted-foreground">
          แก้ไขข้อมูลส่วนตัวเพื่อใช้ในการยืนยันตัวตนและการรับการแจ้งเตือนจากระบบ
        </p>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur-md rounded-2xl shadow-md">
        <CardContent className="p-6 sm:p-8">
          <form action={updateProfileAction} className="space-y-5">
            {/* Email (Read Only) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> อีเมลบัญชี (อ่านอย่างเดียว)
              </Label>
              <Input
                value={user.email}
                disabled
                className="h-11 rounded-xl bg-muted/40 border-border/50 text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> ชื่อ - นามสกุล <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name || user.full_name || ""}
                placeholder="เช่น นายสมชาย ใจดี"
                required
                className="h-11 rounded-xl bg-background border-border/80"
              />
            </div>

            {/* Student ID */}
            <div className="space-y-2">
              <Label htmlFor="student_id" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-primary" /> รหัสนักศึกษา / รหัสบุคลากร
              </Label>
              <Input
                id="student_id"
                name="student_id"
                defaultValue={profile?.student_id || user.student_id || ""}
                placeholder="เช่น 65010001 หรือ STAFF-001"
                className="h-11 rounded-xl bg-background border-border/80"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> เบอร์โทรศัพท์ติดต่อ
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone || ""}
                placeholder="เช่น 081-234-5678"
                className="h-11 rounded-xl bg-background border-border/80"
              />
            </div>

            {/* LINE OA User ID + ช่องทางติดต่อสะดวก */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> เชื่อมต่อ LINE Bot FindBack
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  เมื่อผูก LINE User ID แล้ว บอทจะจำว่าบัญชีไหนเป็นของคุณ และแสดงข้อมูลของคุณในการ์ดแต่ละรายการ
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="line_user_id" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  LINE User ID
                </Label>
                <Input
                  id="line_user_id"
                  name="line_user_id"
                  defaultValue={profile?.line_user_id || ""}
                  placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="h-10 rounded-lg bg-background border-emerald-500/40 text-foreground text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  ดูได้ที่ LINE Developers Console &gt; Basic Settings &gt; Your user ID (ขึ้นต้นด้วย U...)
                  หรือเพียงส่งข้อความหา @FindBack Bot ระบบจะจำ LINE ของคุณอัตโนมัติ
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_contact" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  ช่องทางติดต่อที่สะดวก (แสดงให้ผู้ค้นหาเห็น)
                </Label>
                <Input
                  id="preferred_contact"
                  name="preferred_contact"
                  defaultValue={profile?.preferred_contact || ""}
                  placeholder="เช่น LINE: @somchai, โทร 081-234-5678, ห้อง A101 ชั้น 3"
                  className="h-10 rounded-lg bg-background border-emerald-500/40 text-foreground text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  ข้อมูลนี้จะแสดงในการ์ดของแต่ละรายการเพื่อให้ผู้อื่นติดต่อคุณได้สะดวก
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-semibold gap-1.5 mt-4">
              <Check className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
