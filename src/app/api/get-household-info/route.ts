import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // 1. Get household ID from request
    const { householdId } = await req.json();

    if (!householdId) {
      return NextResponse.json(
        { error: "Missing householdId" },
        { status: 400 },
      );
    }

    // 2. Use secret key server-side to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error(
        "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY",
      );
      return NextResponse.json(
        {
          error:
            "Server configuration error. Please contact the administrator.",
        },
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    // 3. Fetch household details
    const { data: household, error } = await supabaseAdmin
      .from("households")
      .select(
        "id, name, household_members(user_id, role, profiles(full_name, email))",
      )
      .eq("id", householdId)
      .single();

    if (error || !household) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 },
      );
    }

    // 4. Filter members to only show owner/relevant info if needed,
    // or just return what's necessary for the UI.
    // For the join page, we mainly need the household name and maybe the owner's name.

    // Find owner
    const ownerMember = household.household_members?.find(
      (m: any) => m.role === "owner",
    );
    // profiles is an array because of the join, take the first one
    const profile = Array.isArray(ownerMember?.profiles)
      ? ownerMember?.profiles[0]
      : ownerMember?.profiles;
    const ownerName = profile?.full_name || profile?.email || "Unknown";

    return NextResponse.json({
      id: household.id,
      name: household.name,
      ownerName: ownerName,
      memberCount: household.household_members?.length || 0,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
