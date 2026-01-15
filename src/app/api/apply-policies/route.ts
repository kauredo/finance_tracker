import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(_req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Run the SQL to add missing RLS policies
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        -- Allow authenticated users to create households
        CREATE POLICY IF NOT EXISTS "Users can create households"
          ON households FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);

        -- Allow household owners to update their households
        CREATE POLICY IF NOT EXISTS "Owners can update households"
          ON households FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM household_members
              WHERE household_id = households.id
              AND user_id = auth.uid()
              AND role = 'owner'
            )
          );

        -- Allow household owners to add members and users to add themselves
        CREATE POLICY IF NOT EXISTS "Owners can add household members"
          ON household_members FOR INSERT
          WITH CHECK (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM household_members hm
              WHERE hm.household_id = household_members.household_id
              AND hm.user_id = auth.uid()
              AND hm.role = 'owner'
            )
          );
      `,
    });

    if (error) {
      console.error("Error applying policies:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "RLS policies applied successfully",
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
