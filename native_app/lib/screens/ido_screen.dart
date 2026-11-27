import 'package:flutter/material.dart';

/// 移動タブ（Web版 /ido）
/// 経路検索・電車時刻表を翻訳予定
class IdoScreen extends StatelessWidget {
  const IdoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('移動'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.grey[800],
        elevation: 0,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.directions_bus, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              '経路検索・電車時刻',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '（Web版 RouteSearchResults, 電車時刻表を翻訳予定）',
              style: TextStyle(fontSize: 12, color: Colors.grey[400]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
