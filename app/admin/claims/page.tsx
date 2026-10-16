import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import ClaimList from "./claim-list";

export const instant = false;

export const metadata = {
  title: "ระบบจัดการจุดรับฝากของ (Custodian Admin) — FindBack",
};

export default async function AdminClaimsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต (Broken Access Control Prevention)
  if (user.role !== "ADMIN" && user.role !== "STAFF") {
    redirect("/feed");
  }

  // Fetch claims along with item details and claimant profile
  const { data: claims, error } = await supabase
    .from("claims")
    .select(`
      id,
      status,
      challenge_answer,
      proof_description,
      proof_image_urls,
      review_note,
      created_at,
      resolved_at,
      items (
        id,
        title,
        category,
        dropoff_location,
        secret_challenge,
        status,
        image_urls
      ),
      profiles:claimant_id (
        id,
        full_name,
        student_id,
        phone
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching admin claims:", error);
  }

  interface FormattedClaim {
    id: string;
    status: string;
    challenge_answer?: string | null;
    proof_description?: string | null;
    proof_image_urls?: string[];
    review_note?: string | null;
    created_at: string;
    resolved_at?: string | null;
    item?: {
      id: string;
      title: string;
      category?: string | null;
      dropoff_location?: string | null;
      secret_challenge?: string | null;
      status: string;
      image_urls?: string[];
    };
    claimant?: {
      id: string;
      full_name?: string | null;
      student_id?: string | null;
      phone?: string | null;
    };
  }

  const formattedClaims: FormattedClaim[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    claims?.map((c: any) => ({
      id: c.id,
      status: c.status,
      challenge_answer: c.challenge_answer,
      proof_description: c.proof_description,
      proof_image_urls: c.proof_image_urls || [],
      review_note: c.review_note,
      created_at: c.created_at,
      resolved_at: c.resolved_at,
      item: Array.isArray(c.items) ? c.items[0] : c.items,
      claimant: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
    })) || [];

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-primary text-white p-6 pt-10 pb-8 shadow-xl mb-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
              <span className="text-3xl">👮</span> ระบบจัดการจุดรับฝากของ & เคลม
            </h1>
            <p className="text-blue-100 mt-1 text-sm opacity-90">
              ตรวจสอบคำขอรับของ คัดกรองคำตอบลับ และยืนยันการส่งมอบคืนเจ้าของ (Custodian Portal)
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>เข้าใช้โดย: {user.full_name} ({user.role})</span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4">
        <ClaimList initialClaims={formattedClaims} />
      </main>
    </div>
  );
}
