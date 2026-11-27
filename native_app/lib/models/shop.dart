import 'package:latlong2/latlong.dart';

import '../utils/opening_hours.dart';

/// 店舗（shops テーブル）
class Shop {
  const Shop({
    required this.id,
    required this.name,
    required this.position,
    this.category,
    this.phone,
    this.openingHours,
    this.website,
    this.status = 'open',
  });

  factory Shop.fromMap(Map<String, dynamic> m) => Shop(
        id: m['id'] as String,
        name: m['name'] as String,
        position: LatLng(
          (m['latitude'] as num).toDouble(),
          (m['longitude'] as num).toDouble(),
        ),
        category: m['category_main'] as String?,
        phone: m['phone'] as String?,
        openingHours: m['opening_hours'] as String?,
        website: m['website'] as String?,
        status: (m['status'] as String?) ?? 'open',
      );

  final String id;
  final String name;
  final LatLng position;
  final String? category;
  final String? phone;
  final String? openingHours;
  final String? website;

  /// open / temporarily_closed / closed
  final String status;

  bool get isTemporarilyClosed => status == 'temporarily_closed';

  /// 営業中なら true、営業時間外なら false、分からなければ null
  bool? isOpenAt(DateTime time) {
    if (status != 'open') return false;
    return openingHoursOpenAt(openingHours, time);
  }
}

/// utils の関数名と Shop のメソッド名がぶつからないように別名で呼ぶ
bool? openingHoursOpenAt(String? raw, DateTime time) => isOpenAt(raw, time);
