-- Add verified_status to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_status text DEFAULT 'unverified';

-- Create student_verifications table
CREATE TABLE IF NOT EXISTS student_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  validator_id uuid REFERENCES profiles(id) NOT NULL,
  target_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(validator_id, target_id)
);

-- Enable RLS
ALTER TABLE student_verifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view verifications they are involved in" ON student_verifications
  FOR SELECT USING (auth.uid() = validator_id OR auth.uid() = target_id);

-- Note: Insertions will be handled via Server Actions using Service Role Key to ensure strict logic validation
