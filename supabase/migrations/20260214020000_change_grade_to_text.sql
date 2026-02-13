-- gradeカラムの型をTEXTに変更し、CHECK制約を削除（院生・その他などに対応するため）
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_grade_check;
ALTER TABLE profiles ALTER COLUMN grade TYPE TEXT;
