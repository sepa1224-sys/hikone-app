import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:native_app/config/app_config.dart';

/// Supabase クライアントへのアクセスを提供するシングルトンサービス。
///
/// 使い方:
///   // 初期化 (main.dart で一度だけ呼ぶ)
///   await SupabaseService.init();
///
///   // クライアント取得 (アプリのどこからでも)
///   final client = SupabaseService().client;
class SupabaseService {
  // --- シングルトン ---
  SupabaseService._internal();
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;

  /// Supabase を初期化する。main() で WidgetsFlutterBinding.ensureInitialized()
  /// の直後に呼び出すこと。
  static Future<void> init() async {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
    );
  }

  /// Supabase クライアント。
  /// 認証・DB・Storage などすべての操作に使用する。
  SupabaseClient get client => Supabase.instance.client;

  /// 現在ログイン中のユーザー。未ログイン時は null。
  User? get currentUser => client.auth.currentUser;

  /// ログイン状態の変化を監視するストリーム。
  Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;
}
