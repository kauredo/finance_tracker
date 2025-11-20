-- WARNING: This will delete ALL data in your finance tracker tables
-- Only run this in development!

-- Drop all policies first
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their households" ON households;
DROP POLICY IF EXISTS "Users can view household members" ON household_members;
DROP POLICY IF EXISTS "Users can view their accounts" ON accounts;
DROP POLICY IF EXISTS "Users can create accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view statements" ON statements;
DROP POLICY IF EXISTS "Users can upload statements" ON statements;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;

-- Drop all tables (order matters due to foreign keys)
DROP TABLE IF EXISTS statements CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS household_members CASCADE;
DROP TABLE IF EXISTS households CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
