import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's household from household_members
    const { data: member } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single();

    if (!member?.household_id) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 },
      );
    }

    const household_id = member.household_id;

    // Fetch recurring transactions
    const { data: recurring, error } = await supabase
      .from("recurring_transactions")
      .select(
        `
        *,
        category:categories(id, name, icon, color),
        account:accounts(id, name)
      `,
      )
      .eq("household_id", household_id)
      .order("next_run_date", { ascending: true });

    if (error) {
      console.error("Error fetching recurring transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch recurring transactions" },
        { status: 500 },
      );
    }

    return NextResponse.json({ recurring });
  } catch (error) {
    console.error("Error in recurring API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      description,
      amount,
      interval,
      account_id,
      category_id,
      next_run_date,
      day_of_month,
      day_of_week,
    } = body;

    if (!description || !amount || !interval || !next_run_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get user's household
    // Get user's household from household_members
    const { data: member } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single();

    if (!member?.household_id) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 },
      );
    }

    const household_id = member.household_id;

    // Create recurring transaction
    const { data: recurring, error } = await supabase
      .from("recurring_transactions")
      .insert({
        household_id: household_id,
        description,
        amount,
        interval,
        account_id,
        category_id,
        next_run_date,
        day_of_month,
        day_of_week,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating recurring transaction:", error);
      return NextResponse.json(
        { error: "Failed to create recurring transaction" },
        { status: 500 },
      );
    }

    return NextResponse.json({ recurring });
  } catch (error) {
    console.error("Error in recurring API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
