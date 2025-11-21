-- Add preferences columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'DD/MM/YYYY';

-- Update existing profiles with defaults
UPDATE profiles SET currency = 'EUR' WHERE currency IS NULL;
UPDATE profiles SET date_format = 'DD/MM/YYYY' WHERE date_format IS NULL;
