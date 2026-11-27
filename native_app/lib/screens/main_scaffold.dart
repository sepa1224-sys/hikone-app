import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'home_screen.dart';
import 'taberu_screen.dart';
import 'ido_screen.dart';
import 'living_screen.dart';
import 'profile_screen.dart';
import 'login_screen.dart';

/// Web版 BottomNavigation に相当するメインスキャフォールド
/// 5タブ: 食べる、移動、ホーム、暮らし、会員情報
class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentIndex = 2; // ホームが中央（デフォルト）

  final _screens = const [
    TaberuScreen(),
    IdoScreen(),
    HomeScreen(),
    LivingScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    final isLoggedIn = Supabase.instance.client.auth.currentSession != null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 64,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _navItem(0, Icons.restaurant, '食べる'),
              _navItem(1, Icons.directions_bus, '移動'),
              _navCenterItem(2, Icons.home, 'ホーム'),
              _navItem(3, Icons.grid_view, '暮らし'),
              _navItem(4, Icons.person, '会員情報', requiresAuth: true, isLoggedIn: isLoggedIn),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label,
      {bool requiresAuth = false, bool isLoggedIn = true}) {
    final isActive = _currentIndex == index;
    final canTap = !requiresAuth || isLoggedIn;

    return Expanded(
      child: InkWell(
        onTap: canTap
            ? () => setState(() => _currentIndex = index)
            : () => _goToLogin(),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 22,
              color: isActive ? const Color(0xFFFF0033) : Colors.grey[400],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.bold,
                color: isActive ? const Color(0xFFFF0033) : Colors.grey[400],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _navCenterItem(int index, IconData icon, String label) {
    final isActive = _currentIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFFFF0000),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(icon, size: 22, color: Colors.white),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                color: isActive ? const Color(0xFFFF0033) : Colors.grey[400],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _goToLogin() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }
}
