import 'package:flutter/material.dart';

/// 食べるタブ（Web版 /taberu）
/// 店舗一覧・地図検索を翻訳予定
class TaberuScreen extends StatelessWidget {
  const TaberuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('食べる'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.grey[800],
        elevation: 0,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              '店舗検索・地図',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '（Web版 components/ShopList, ShopMap を翻訳予定）',
              style: TextStyle(fontSize: 12, color: Colors.grey[400]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
