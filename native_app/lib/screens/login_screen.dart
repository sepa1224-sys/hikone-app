import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/auth_service.dart';

/// ログイン画面
/// Web版 app/login/page.tsx のロジックを翻訳
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _authService = AuthService();
  bool _googleLoading = false;
  bool _lineLoading = false;
  bool _emailLoading = false;
  String? _error;
  String? _success;

  bool _isLogin = true;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _googleLoading = true;
      _error = null;
    });

    try {
      await _authService.signInWithGoogle();
      if (!mounted) return;
      setState(() => _googleLoading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Googleログインに失敗しました';
        _googleLoading = false;
      });
    }
  }

  Future<void> _handleLineSignIn() async {
    setState(() {
      _lineLoading = true;
      _error = null;
    });

    try {
      await _authService.signInWithLine();
      if (!mounted) return;
      setState(() => _lineLoading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().contains('UnimplementedError')
            ? 'LINEログインは準備中です'
            : 'LINEログインに失敗しました';
        _lineLoading = false;
      });
    }
  }

  Future<void> _handleEmailSubmit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'メールアドレスとパスワードを入力してください');
      return;
    }

    setState(() {
      _emailLoading = true;
      _error = null;
      _success = null;
    });

    try {
      if (_isLogin) {
        await Supabase.instance.client.auth.signInWithPassword(
          email: email,
          password: password,
        );
        setState(() => _success = 'ログインしました！');
      } else {
        await Supabase.instance.client.auth.signUp(
          email: email,
          password: password,
        );
        setState(() => _success = '確認メールを送信しました。メールをご確認ください。');
      }
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'エラーが発生しました');
    } finally {
      if (mounted) setState(() => _emailLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFFFFF5F5),
              Colors.white,
              Color(0xFFFFF8F0),
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                // ロゴ・タイトル
                const Text(
                  '彦根くらしアプリ',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isLogin ? 'アカウントにログイン' : '新規アカウント作成',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 32),

                // LINE ログイン
                _buildOAuthButton(
                  label: 'LINEでログイン',
                  color: const Color(0xFF06C755),
                  isLoading: _lineLoading,
                  onPressed: _handleLineSignIn,
                ),
                const SizedBox(height: 12),

                // Google ログイン
                _buildOAuthButton(
                  label: 'Googleでサインイン',
                  color: Colors.white,
                  isOutlined: true,
                  isLoading: _googleLoading,
                  onPressed: _handleGoogleSignIn,
                ),
                const SizedBox(height: 24),

                // 区切り線
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'または',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 24),

                // メールフォーム
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'メールアドレス',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(Radius.circular(16)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'パスワード',
                    border: const OutlineInputBorder(
                      borderRadius: BorderRadius.all(Radius.circular(16)),
                    ),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off : Icons.visibility,
                      ),
                      onPressed: () {
                        setState(() => _obscurePassword = !_obscurePassword);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                if (_error != null)
                  _buildMessage(_error!, isError: true),
                if (_success != null)
                  _buildMessage(_success!, isError: false),
                if (_error != null || _success != null) const SizedBox(height: 12),

                // メールログイン/登録ボタン
                FilledButton(
                  onPressed: _emailLoading ? null : _handleEmailSubmit,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: _emailLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(_isLogin ? 'メールでログイン' : 'メールで新規登録'),
                ),
                const SizedBox(height: 16),

                // 切り替え
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isLogin = !_isLogin;
                      _error = null;
                      _success = null;
                    });
                  },
                  child: Text(
                    _isLogin
                        ? 'アカウントをお持ちでない方はこちら'
                        : 'すでにアカウントをお持ちの方はこちら',
                    style: const TextStyle(color: Colors.grey),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOAuthButton({
    required String label,
    required Color color,
    bool isOutlined = false,
    required bool isLoading,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 52,
      child: isOutlined
          ? OutlinedButton(
              onPressed: isLoading ? null : onPressed,
              style: OutlinedButton.styleFrom(
                backgroundColor: color,
                side: BorderSide(color: Colors.grey[300]!),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(label),
            )
          : FilledButton(
              onPressed: isLoading ? null : onPressed,
              style: FilledButton.styleFrom(
                backgroundColor: color,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(label),
            ),
    );
  }

  Widget _buildMessage(String text, {required bool isError}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError ? Colors.red[50] : Colors.green[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: isError ? Colors.red[700] : Colors.green[700],
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
