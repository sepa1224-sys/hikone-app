import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/supabase_config.dart';

/// 認証サービス
/// Web版 app/login/page.tsx のロジックを翻訳
/// - signInWithOAuth(provider: 'google') → signInWithOAuth(provider: OAuthProvider.google)
/// - redirectTo: Deep Link の URL スキーム（ネイティブアプリ用）
class AuthService {
  final _client = Supabase.instance.client;

  /// Google ログイン（Supabase OAuth）
  /// ネイティブでは launchUrl でブラウザが開き、Deep Link でアプリに戻る
  Future<void> signInWithGoogle() async {
    await _client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: '${SupabaseConfig.deepLinkScheme}://auth/callback',
    );
  }

  /// LINE ログイン（Supabase OAuth）
  /// 注: OAuthProvider に line が含まれるまで準備中
  Future<void> signInWithLine() async {
    throw UnimplementedError(
      'LINE ログインは Supabase Dart SDK の OAuthProvider 拡張後に実装予定です',
    );
  }
}
