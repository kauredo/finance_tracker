-- Add notes field to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS notes TEXT;
