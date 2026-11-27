import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/shop.dart';

/// 店舗データの取得（「食べる」タブ用）
class ShopService {
  final _client = Supabase.instance.client;

  /// 地図に載せる全店舗。閉店した店は除く。
  Future<List<Shop>> fetchShops() async {
    final rows = await _client
        .from('shops')
        .select(
          'id, name, latitude, longitude, category_main, phone, opening_hours, website, status',
        )
        .neq('status', 'closed')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('name')
        .limit(2000);
    return rows.map(Shop.fromMap).toList();
  }
}
