-- Add fields to support custom categories
ALTER TABLE categories ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Mark existing categories as non-custom (global defaults)
UPDATE categories SET is_custom = FALSE WHERE is_custom IS NULL;

-- Update RLS policies for custom categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;

-- Users can view all default categories and their own custom ones
CREATE POLICY "Users can view all categories"
  ON categories FOR SELECT
  USING (is_custom = FALSE OR owner_id = auth.uid());

-- Users can create custom categories
CREATE POLICY "Users can create custom categories"
  ON categories FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND is_custom = TRUE);

-- Users can update only their own custom categories
CREATE POLICY "Users can update own custom categories"
  ON categories FOR UPDATE
  USING (owner_id = auth.uid() AND is_custom = TRUE);

-- Users can delete only their own custom categories
CREATE POLICY "Users can delete own custom categories"
  ON categories FOR DELETE
  USING (owner_id = auth.uid() AND is_custom = TRUE);

-- Create index for performance
CREATE INDEX idx_categories_owner_id ON categories(owner_id);
