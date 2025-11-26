-- Add has_seen_welcome_tour column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_seen_welcome_tour BOOLEAN DEFAULT FALSE;
