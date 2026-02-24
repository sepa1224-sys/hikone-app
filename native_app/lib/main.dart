import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/supabase_config.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

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
