import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
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

    // Get user's household
    const { data: memberData, error: memberError } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 },
      );
    }

    const { data: goals, error } = await supabase
      .from("goals")
      .select("*")
      .eq("household_id", memberData.household_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching goals:", error);
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 },
      );
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error("Error in goals API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { name, target_amount, current_amount, target_date, icon, color } =
      json;

    if (!name || !target_amount) {
      return NextResponse.json(
        { error: "Name and target amount are required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's household
    const { data: memberData, error: memberError } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 },
      );
    }

    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        household_id: memberData.household_id,
        name,
        target_amount,
        current_amount: current_amount || 0,
        target_date: target_date || null,
        icon: icon || "savings",
        color: color || "#10b981",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating goal:", error);
      return NextResponse.json(
        { error: "Failed to create goal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error("Error in create goal API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
