import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// 会員情報タブ（Web版 /profile）
/// プロフィール・ポイント・スタンプ等を翻訳予定
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('会員情報'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.grey[800],
        elevation: 0,
      ),
      body: user == null
          ? _buildGuestView(context)
          : _buildLoggedInView(context, user),
    );
  }

  Widget _buildGuestView(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.person_outline, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'ログインすると会員情報を表示できます',
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildLoggedInView(BuildContext context, User user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                child: Icon(Icons.person),
              ),
              title: Text(user.email ?? '不明'),
              subtitle: const Text('プロフィールを編集'),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('ログアウト'),
              onTap: () async {
                await Supabase.instance.client.auth.signOut();
              },
            ),
          ),
        ],
      ),
    );
  }
}
