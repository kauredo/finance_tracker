import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

interface Transaction {
  description: string;
  amount: number;
  date: string;
}

interface Suggestion {
  description: string;
  amount: number;
  interval: string;
  confidence: number;
  occurrence_count: number;
}

export async function GET(_request: NextRequest) {
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single();

    if (!profile?.household_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch transactions from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("description, amount, date")
      .gte("date", sixMonthsAgo.toISOString())
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 },
      );
    }

    // Fetch existing recurring transactions to filter them out
    const { data: existingRecurring } = await supabase
      .from("recurring_transactions")
      .select("description, amount")
      .eq("household_id", profile.household_id);

    // Analyze transactions for patterns
    const suggestions = analyzeTransactions(
      transactions || [],
      existingRecurring || [],
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error in recurring suggestions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function analyzeTransactions(
  transactions: Transaction[],
  existing: { description: string; amount: number }[],
): Suggestion[] {
  const groups = new Map<string, Transaction[]>();

  // 1. Group by normalized description
  transactions.forEach((tx) => {
    // Normalize: lowercase, remove numbers/dates, trim
    // e.g. "Netflix 12/24" -> "netflix"
    const key = tx.description.toLowerCase().replace(/\d+/g, "").trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)?.push(tx);
  });

  const suggestions: Suggestion[] = [];

  groups.forEach((groupTxs, key) => {
    // Filter out groups with less than 2 occurrences
    if (groupTxs.length < 2) return;

    // 2. Check amount consistency (allow 10% variance)
    const amounts = groupTxs.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const isConsistentAmount = amounts.every(
      (a) => Math.abs(a - avgAmount) / avgAmount < 0.1,
    );

    if (!isConsistentAmount) return;

    // 3. Check interval consistency
    // Sort by date desc
    const sortedDates = groupTxs
      .map((t) => new Date(t.date).getTime())
      .sort((a, b) => b - a);
    const intervals: number[] = [];
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const diffDays =
        (sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    let intervalType = "";
    if (Math.abs(avgInterval - 30) < 5) intervalType = "monthly";
    else if (Math.abs(avgInterval - 7) < 2) intervalType = "weekly";
    else if (Math.abs(avgInterval - 365) < 10) intervalType = "yearly";

    if (!intervalType) return;

    // 4. Check if already exists in recurring
    const mostCommonDesc = groupTxs[0].description; // Use most recent description
    const isAlreadyRecurring = existing.some(
      (e) =>
        e.description.toLowerCase().includes(key) &&
        Math.abs(Math.abs(e.amount) - avgAmount) < 1,
    );

    if (isAlreadyRecurring) return;

    suggestions.push({
      description: mostCommonDesc,
      amount: groupTxs[0].amount, // Use signed amount from most recent
      interval: intervalType,
      confidence: 0.8 + groupTxs.length * 0.05, // Simple confidence score
      occurrence_count: groupTxs.length,
    });
  });

  return suggestions
    .sort((a, b) => b.occurrence_count - a.occurrence_count)
    .slice(0, 5);
}
