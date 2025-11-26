import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // 1. Get auth token from user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify user with their token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid user" }, { status: 401 });
    }

    // 3. Get request body
    const { accountName, accountType } = await req.json();

    if (!accountName || !accountType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 4. Use secret key server-side to bypass RLS for household creation
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

    let accountData: any = {
      name: accountName,
      type: accountType,
    };

    // 5. Handle joint account with household creation
    if (accountType === "joint") {
      // Create household (bypasses RLS with service role)
      const { data: household, error: householdError } = await supabaseAdmin
        .from("households")
        .insert({
          name: `${accountName} Household`,
        })
        .select()
        .single();

      if (householdError) throw householdError;

      // Add user as household owner (bypasses RLS)
      const { error: memberError } = await supabaseAdmin
        .from("household_members")
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      accountData.household_id = household.id;
    } else {
      accountData.owner_id = user.id;
    }

    // 6. Create account (bypasses RLS)
    const { error: insertError } = await supabaseAdmin
      .from("accounts")
      .insert(accountData);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
