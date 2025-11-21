-- Add missing RLS policies for households and household_members

-- Allow authenticated users to create households
CREATE POLICY "Users can create households"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow household owners to update their households
CREATE POLICY "Owners can update households"
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
CREATE POLICY "Owners can add household members"
  ON household_members FOR INSERT
  WITH CHECK (
    -- Allow if user is adding themselves
    user_id = auth.uid() OR
    -- Or if user is an owner of the household  
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'owner'
    )
  );
