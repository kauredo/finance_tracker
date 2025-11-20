-- Create a storage bucket for statements
INSERT INTO storage.buckets (id, name, public) 
VALUES ('statements', 'statements', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the storage bucket
CREATE POLICY "Users can upload their own statements"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'statements' AND
  auth.uid() = owner
);

CREATE POLICY "Users can view their own statements"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'statements' AND
  auth.uid() = owner
);
