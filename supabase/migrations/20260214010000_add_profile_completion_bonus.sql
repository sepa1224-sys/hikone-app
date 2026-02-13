-- プロフィール入力完了ボーナス用カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS faculty TEXT; -- 学部
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nearest_station TEXT; -- 最寄り駅
-- interestsは既存かもしれないが、念のため
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'; 
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE; -- プロフィール完了ボーナス受領フラグ

-- コメント
COMMENT ON COLUMN profiles.faculty IS '学部（学生用）';
COMMENT ON COLUMN profiles.nearest_station IS '最寄り駅';
COMMENT ON COLUMN profiles.is_profile_completed IS 'プロフィール全項目入力完了ボーナス受領済みフラグ';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_is_profile_completed ON profiles(is_profile_completed);
