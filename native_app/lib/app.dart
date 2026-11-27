import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'main.dart' as main_app;
import 'screens/login_screen.dart';
import 'screens/main_scaffold.dart';

/// アプリ本体
/// Web版（app/, components/）の設計図に基づく。
class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '彦根くらしアプリ',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.red,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const AuthGate(),
    );
  }
}

/// 認証状態に応じて表示を切り替えるゲート
/// Web版 AuthProvider のロジックを翻訳
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    _appLinks = AppLinks();
    _initDeepLinks();
    // ログイン・ログアウトのたびに画面を切り替える
    _authSubscription =
        Supabase.instance.client.auth.onAuthStateChange.listen((_) {
      if (mounted) setState(() {});
    });
  }

  Future<void> _initDeepLinks() async {
    // アプリが既に起動している状態で Deep Link で開かれた場合
    final initialUri = await _appLinks.getInitialLink();
    if (initialUri != null) {
      await main_app.handleDeepLink(initialUri);
      if (mounted) setState(() {});
    }

    // バックグラウンドから Deep Link で復帰した場合
    _linkSubscription = _appLinks.uriLinkStream.listen((uri) async {
      await main_app.handleDeepLink(uri);
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _authSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = Supabase.instance.client.auth.currentSession;

    if (session != null) {
      return const MainScaffold();
    }
    return const LoginScreen();
  }
}
