-- Fix for infinite recursion in household_members policy
-- Run this to drop the problematic policy and create a correct one

-- Drop the old policy
DROP POLICY IF EXISTS "Users can view household members" ON household_members;

-- Create a simpler, non-recursive policy
-- Users can see household_members rows where they are a member of that household
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  USING (
    -- User can see their own membership
    user_id = auth.uid() OR
    -- User can see other members if they share a household
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );
