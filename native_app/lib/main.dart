import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:native_app/app.dart';
import 'package:native_app/config/app_config.dart';
import 'package:native_app/services/supabase_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (!AppConfig.isSupabaseConfigured) {
    runApp(const _ConfigMissingApp());
    return;
  }

  await SupabaseService.init();

  runApp(const App());
}

/// Deep Link でアプリに戻った際、OAuth コールバックの URL からセッションを確立
Future<void> handleDeepLink(Uri uri) async {
  if (uri.host == 'auth' && uri.pathSegments.contains('callback')) {
    try {
      await Supabase.instance.client.auth.getSessionFromUrl(uri);
    } catch (e) {
      debugPrint('Deep Link セッション復元エラー: $e');
    }
  }
}

/// env.json を渡さずに起動したときの案内画面
class _ConfigMissingApp extends StatelessWidget {
  const _ConfigMissingApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Padding(
          padding: EdgeInsets.all(24),
          child: Center(
            child: Text(
              'Supabase の接続情報がありません。\n'
              'flutter run --dart-define-from-file=env.json で起動してください。',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}
