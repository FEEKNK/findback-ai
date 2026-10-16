"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function approveClaim(claimId: string) {
  const supabase = await createClient();
  const sessionUser = await getCurrentUser();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const user = sessionUser || authUser;

  if (!user) {
    throw new Error("Unauthorized");
  }

  const clientToUse = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : supabase;

  // 1. Update claim status to APPROVED
  const { error: claimError } = await clientToUse
    .from("claims")
    .update({ 
      status: "APPROVED", 
      reviewed_by: user.id,
      resolved_at: new Date().toISOString()
    })
    .eq("id", claimId);

  if (claimError) {
    console.error("Error approving claim:", claimError);
    throw new Error("Failed to approve claim");
  }

  // 2. Also fetch the item_id to update item status
  const { data: claimData } = await clientToUse
    .from("claims")
    .select("item_id")
    .eq("id", claimId)
    .single();

  if (claimData) {
    // 3. Update item status to RETURNED
    await clientToUse
      .from("items")
      .update({ status: "RETURNED" })
      .eq("id", claimData.item_id);
  }

  revalidatePath("/admin/claims");
  return { success: true };
}
