-- Fix infinite recursion in household_members RLS policy using a SECURITY DEFINER function

-- 1. Drop the recursive policy
DROP POLICY IF EXISTS "Users can view household members" ON household_members;

-- 2. Create a secure function to get the current user's household IDs
-- SECURITY DEFINER means this function runs with the privileges of the creator, bypassing RLS
CREATE OR REPLACE FUNCTION get_auth_user_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT household_id
  FROM household_members
  WHERE user_id = auth.uid()
$$;

-- 3. Create the new non-recursive policy using the function
CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  USING (
    -- User can see their own membership
    user_id = auth.uid() OR
    -- User can see other members if they share a household (checked via secure function)
    household_id IN (
      SELECT get_auth_user_household_ids()
    )
  );
