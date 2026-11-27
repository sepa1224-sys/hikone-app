import 'package:flutter/material.dart';

/// 暮らしタブ（Web版 /living）
/// ゴミ収集・イベント・クーポン等を翻訳予定
class LivingScreen extends StatelessWidget {
  const LivingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('暮らし'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.grey[800],
        elevation: 0,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.grid_view, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'ゴミ収集・イベント・クーポン',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '（Web版 living, WasteScheduleCard 等を翻訳予定）',
              style: TextStyle(fontSize: 12, color: Colors.grey[400]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
