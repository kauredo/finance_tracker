-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) DEFAULT 0 NOT NULL CHECK (current_amount >= 0),
  target_date DATE,
  color TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'savings',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view goals for their household
CREATE POLICY "Users can view household goals"
  ON goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = goals.household_id
      AND user_id = auth.uid()
    )
  );

-- Users can manage (insert, update, delete) goals for their household
CREATE POLICY "Users can manage household goals"
  ON goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = goals.household_id
      AND user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_goals_household_id ON goals(household_id);
