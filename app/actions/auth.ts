"use server";

import { logoutUser, getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * สมัครสมาชิกใหม่ (แยกระหว่าง นักศึกษา/ผู้ใช้ทั่วไป กับ เจ้าหน้าที่/แอดมิน)
 * อนุมัติอีเมลให้อัตโนมัติ (Instant Confirmation) และล็อกอินทันที
 */
export async function signUpNewUserAction(formData: FormData): Promise<AuthActionResult> {
  const roleType = (formData.get("role") as string)?.toUpperCase() || "USER";
  const targetRole = roleType === "ADMIN" ? "ADMIN" : "USER";

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const full_name = (formData.get("full_name") as string)?.trim();
  const student_id = (formData.get("student_id") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const admin_code = (formData.get("admin_code") as string)?.trim();

  if (!email || !password || !full_name) {
    return { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, อีเมล, รหัสผ่าน)" };
  }

  if (password.length < 6) {
    return { error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" };
  }

  // 1. ตรวจสอบรหัสผ่านยืนยันเจ้าหน้าที่ (สำหรับ Admin/Staff)
  if (targetRole === "ADMIN") {
    const validCode = process.env.ADMIN_REGISTRATION_CODE;
    if (!validCode && process.env.NODE_ENV === "production") {
      console.error("[Security Warning] ADMIN_REGISTRATION_CODE is not configured in production");
      return { error: "ระบบยังไม่เปิดรับการลงทะเบียนเจ้าหน้าที่ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ" };
    }
    const expected = validCode || "ADMIN1234";
    if (!admin_code || admin_code !== expected) {
      return { error: "รหัสผ่านเจ้าหน้าที่ (Admin Passcode) ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ" };
    }
  }

  try {
    const adminClient = createAdminClient();

    // 2. สร้างบัญชีผ่าน Admin API (อนุมัติอีเมลให้อัตโนมัติทันที ไม่ต้องรอกดใน Inbox)
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: targetRole,
        student_id: student_id || (targetRole === "ADMIN" ? "STAFF-001" : ""),
      },
    });

    if (createError) {
      if (createError.message.includes("already registered") || createError.message.includes("unique")) {
        return { error: "อีเมลนี้มีผู้ใช้งานในระบบแล้ว กรุณาไปที่หน้าเข้าสู่ระบบ" };
      }
      return { error: createError.message };
    }

    if (!created?.user) {
      return { error: "ไม่สามารถสร้างบัญชีผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" };
    }

    // 3. บันทึกข้อมูลลงตาราง profiles พร้อมสิทธิ์ที่ถูกต้อง
    await adminClient.from("profiles").upsert({
      id: created.user.id,
      full_name,
      student_id: student_id || (targetRole === "ADMIN" ? "STAFF-001" : ""),
      phone: phone || null,
      role: targetRole,
      updated_at: new Date().toISOString(),
    });

    // 4. เข้าสู่ระบบอัตโนมัติบน Server Session
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.warn("[Auto-SignIn Warning]:", signInError.message);
    }

    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath("/dashboard");

    return {
      success: true,
      redirectTo: targetRole === "ADMIN" ? "/admin/claims" : "/feed",
    };
  } catch (err: unknown) {
    console.error("[SignUp Exception]:", err);
    return { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสมัครสมาชิก" };
  }
}

/**
 * เข้าสู่ระบบ พร้อมตรวจสิทธิ์เพื่อส่งไปยังหน้าที่ถูกต้องอัตโนมัติ
 */
export async function loginUserAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: "ไม่พบข้อมูลผู้ใช้งาน" };
    }

    // ตรวจสอบบทบาทจาก Profile เพื่อส่งไปยังหน้าทำงานที่ถูกต้อง
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = (profile?.role || data.user.user_metadata?.role || "USER").toUpperCase();
    const isAdmin = role === "ADMIN" || role === "STAFF";

    revalidatePath("/");
    revalidatePath("/feed");
    revalidatePath("/admin/claims");

    return {
      success: true,
      redirectTo: isAdmin ? "/admin/claims" : "/feed",
    };
  } catch (err: unknown) {
    console.error("[Login Exception]:", err);
    return { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" };
  }
}

export async function signOutAction() {
  await logoutUser();
  revalidatePath("/");
}

export const quickLogoutAction = signOutAction;

export async function getSessionAction() {
  return await getCurrentUser();
}
