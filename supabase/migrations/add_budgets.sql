-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  period TEXT DEFAULT 'monthly' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(household_id, category_id)
);

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view budgets for their household
CREATE POLICY "Users can view household budgets"
  ON budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = budgets.household_id
      AND user_id = auth.uid()
    )
  );

-- Users can create/update budgets for their household
CREATE POLICY "Users can manage household budgets"
  ON budgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = budgets.household_id
      AND user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_budgets_household_id ON budgets(household_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
