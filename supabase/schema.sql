-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create households table (for couples/shared access)
CREATE TABLE households (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create household_members junction table
CREATE TABLE household_members (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner' or 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id)
);

-- Create accounts table (bank accounts)
CREATE TABLE accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'personal' or 'joint'
  owner_id UUID REFERENCES profiles(id),
  household_id UUID REFERENCES households(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_account_ownership CHECK (
    (type = 'personal' AND owner_id IS NOT NULL AND household_id IS NULL) OR
    (type = 'joint' AND household_id IS NOT NULL)
  )
);

-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT,
  icon TEXT
);

-- Insert default categories
INSERT INTO categories (name, color, icon) VALUES
  ('Groceries', '#10b981', 'groceries'),
  ('Dining', '#f59e0b', 'dining'),
  ('Transport', '#3b82f6', 'transport'),
  ('Utilities', '#8b5cf6', 'utilities'),
  ('Entertainment', '#ec4899', 'entertainment'),
  ('Shopping', '#f43f5e', 'shopping'),
  ('Healthcare', '#06b6d4', 'healthcare'),
  ('Income', '#22c55e', 'income'),
  ('Other', '#6b7280', 'other');

-- Create transactions table
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create statements table (for uploaded files)
CREATE TABLE statements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Households: Users can see households they're members of
CREATE POLICY "Users can view their households"
  ON households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = households.id
      AND user_id = auth.uid()
    )
  );

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

-- Household Members: Users can see members of their households
-- Helper function to bypass RLS recursion
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

CREATE POLICY "Users can view household members"
  ON household_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    household_id IN (
      SELECT get_auth_user_household_ids()
    )
  );

-- Allow household owners to add members
CREATE POLICY "Owners can add household members"
  ON household_members FOR INSERT
  WITH CHECK (
    -- Allow if user is adding themselves
    user_id = auth.uid() OR
    -- Or if user is an owner of the household
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = household_members.household_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Accounts: Users can see their personal accounts or joint accounts in their household
CREATE POLICY "Users can view their accounts"
  ON accounts FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = accounts.household_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create accounts"
  ON accounts FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_id = accounts.household_id
      AND user_id = auth.uid()
    )
  );

-- Transactions: Inherit account visibility rules
CREATE POLICY "Users can view transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE id = transactions.account_id
      AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_id = accounts.household_id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE id = transactions.account_id
      AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_id = accounts.household_id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Statements: Inherit account visibility rules
CREATE POLICY "Users can view statements"
  ON statements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE id = statements.account_id
      AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_id = accounts.household_id
          AND user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can upload statements"
  ON statements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE id = statements.account_id
      AND (
        owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM household_members
          WHERE household_id = accounts.household_id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- Categories: Public read access
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX idx_accounts_household_id ON accounts(household_id);
CREATE INDEX idx_household_members_user_id ON household_members(user_id);

-- Triggers
-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that calls the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
