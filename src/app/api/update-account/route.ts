import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function PUT(request: Request) {
  try {
    const { accountId, name, type } = await request.json();

    if (!accountId || !name?.trim() || !type) {
      return NextResponse.json(
        { error: "Account ID, name, and type are required" },
        { status: 400 },
      );
    }

    if (!["personal", "joint"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns or has access to this account
    const { data: account, error: fetchError } = await supabase
      .from("accounts")
      .select("id, owner_id, household_id")
      .eq("id", accountId)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if user has access (owner or household member)
    let hasAccess = account.owner_id === user.id;

    if (!hasAccess && account.household_id) {
      const { data: household } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", account.household_id)
        .eq("user_id", user.id)
        .single();

      hasAccess = !!household;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update the account
    const { data: updatedAccount, error: updateError } = await supabase
      .from("accounts")
      .update({
        name: name.trim(),
        type,
      })
      .eq("id", accountId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating account:", updateError);
      return NextResponse.json(
        { error: "Failed to update account" },
        { status: 500 },
      );
    }

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error("Error in update-account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
