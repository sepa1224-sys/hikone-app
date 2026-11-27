import 'package:supabase_flutter/supabase_flutter.dart';

/// ポイント取得サービス（Web版 lib/hooks/usePoints.ts を翻訳）
class PointsService {
  final _client = Supabase.instance.client;

  Future<int> getPoints(String? userId) async {
    if (userId == null) return 0;

    try {
      final data = await _client
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .maybeSingle();

      if (data == null) return 0;
      final points = data['points'];
      if (points == null) return 0;
      return (points is int) ? points : int.tryParse(points.toString()) ?? 0;
    } catch (_) {
      return 0;
    }
  }
}
