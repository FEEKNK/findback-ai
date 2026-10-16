import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  student_id: string;
  role: "STUDENT" | "ADMIN" | "STAFF" | "USER";
}

/**
 * ดึงข้อมูลผู้ใช้งานปัจจุบันจาก Supabase Server Session
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, student_id, role")
        .eq("id", user.id)
        .maybeSingle();

      const userRole = (profile?.role || user.user_metadata?.role || "USER").toUpperCase();
      const mappedRole =
        userRole === "ADMIN" ? "ADMIN" : userRole === "STAFF" ? "STAFF" : "STUDENT";

      return {
        id: user.id,
        email: user.email || "",
        full_name:
          profile?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "ผู้ใช้งาน",
        student_id: profile?.student_id || user.user_metadata?.student_id || "",
        role: mappedRole,
      };
    }
  } catch (err) {
    console.error("[Session Error]:", err);
  }

  return null;
}

/**
 * ออกจากระบบ Supabase
 */
export async function logoutUser(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[Logout Error]:", err);
  }
}
