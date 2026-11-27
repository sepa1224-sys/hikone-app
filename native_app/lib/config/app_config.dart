/// アプリ設定定数
///
/// 値は起動時に env.json から渡す（env.json は Git 管理外）。
///   flutter run --dart-define-from-file=env.json
///
/// Supabase の Anon Key は Row Level Security (RLS) で保護されており、
/// クライアントサイドに置くことが Supabase の設計上の前提です。
/// Service Role Key は絶対にここや env.json に記載しないでください。
class AppConfig {
  AppConfig._();

  // --- Supabase ---
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Deep Link の URL スキーム（OAuth コールバック用）
  static const String deepLinkScheme = String.fromEnvironment(
    'DEEP_LINK_SCHEME',
    defaultValue: 'com.hikone.kurashi',
  );

  static bool get isSupabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
