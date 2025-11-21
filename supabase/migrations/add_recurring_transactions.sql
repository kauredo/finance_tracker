-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  interval TEXT NOT NULL CHECK (interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_recurring flag to transactions table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'is_recurring') THEN
        ALTER TABLE transactions ADD COLUMN is_recurring BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view recurring transactions for their household
CREATE POLICY "Users can view household recurring transactions"
  ON recurring_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = recurring_transactions.household_id
      AND user_id = auth.uid()
    )
  );

-- Users can manage recurring transactions for their household
CREATE POLICY "Users can manage household recurring transactions"
  ON recurring_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = recurring_transactions.household_id
      AND user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_recurring_household_id ON recurring_transactions(household_id);
CREATE INDEX idx_recurring_next_run_date ON recurring_transactions(next_run_date);
