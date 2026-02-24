/// Supabase 接続設定
///
/// Web版（app/, lib/）の設計図に基づく。
/// 親プロジェクトの .env.local の値を参照して設定すること。
///
/// ビルド時: flutter run --dart-define=SUPABASE_URL=xxx --dart-define=SUPABASE_ANON_KEY=xxx
/// または lib/config/env.dart で読み込み（.env は .gitignore 推奨）
class SupabaseConfig {
  SupabaseConfig._();

  /// Supabase プロジェクト URL（NEXT_PUBLIC_SUPABASE_URL と同一）
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://kawntunevmabyxqmhqnv.supabase.co',
  );

  /// Supabase 匿名キー（NEXT_PUBLIC_SUPABASE_ANON_KEY と同一）
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTI3ODYsImV4cCI6MjA4NDA2ODc4Nn0.OTwRa687dfxOpDs22NcS8BO2EXZYq-4pBIEh7_7RJow',
  );

  /// Deep Link の URL スキーム（Google OAuth コールバック用）
  /// com.googleusercontent.apps.XXX の形式（Google Cloud Console で取得）
  static const String deepLinkScheme = String.fromEnvironment(
    'DEEP_LINK_SCHEME',
    defaultValue: 'com.hikone.kurashi',
  );
}
