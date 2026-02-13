-- ログインボーナスと誕生日ボーナス用のカラムを追加

-- 最終ログインボーナス付与日時
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_bonus_at TIMESTAMPTZ;

-- 連続ログイン日数
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consecutive_login_days INTEGER DEFAULT 0;

-- 最後に誕生日ボーナスを付与した年（YYYY）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_birthday_bonus_year INTEGER;

COMMENT ON COLUMN profiles.last_login_bonus_at IS '最後にログインボーナスを付与した日時';
COMMENT ON COLUMN profiles.consecutive_login_days IS '連続ログイン日数';
COMMENT ON COLUMN profiles.last_birthday_bonus_year IS '最後に誕生日ボーナスを付与した年';
