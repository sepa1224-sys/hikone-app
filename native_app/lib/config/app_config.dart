/// アプリ設定定数
///
/// Supabase の Anon Key は Row Level Security (RLS) で保護されており、
/// クライアントサイドに置くことが Supabase の設計上の前提です。
/// Service Role Key は絶対にここに記載しないでください。
class AppConfig {
  AppConfig._();

  // --- Supabase ---
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
}
