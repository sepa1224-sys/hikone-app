import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/shop.dart';
import '../services/shop_service.dart';
import '../utils/opening_hours.dart';

/// 食べるタブ：彦根の飲食店を地図と一覧で探す
class TaberuScreen extends StatefulWidget {
  const TaberuScreen({super.key});

  @override
  State<TaberuScreen> createState() => _TaberuScreenState();
}

// アプリ共通の色（main_scaffold / home_screen と揃える）
const _accent = Color(0xFFE60033);
const _ink = Color(0xFF1F2933);
const _muted = Color(0xFF5F6B7A);
const _line = Color(0xFFE6E8EB);
const _openGreen = Color(0xFF15803D);

/// 位置が取れないときの基準点（彦根駅）
const _hikoneStation = LatLng(35.2722, 136.2617);
const _initialCenter = LatLng(35.2700, 136.2565);

const _categories = [
  'カフェ',
  '和食',
  'ラーメン・麺',
  '寿司',
  '焼肉・ステーキ',
  '居酒屋・バー',
  '洋食',
  '中華',
  'アジア・カレー',
  'ファストフード',
  'スイーツ・パン',
  'レストラン',
];

const _minSheet = 0.22;

class _TaberuScreenState extends State<TaberuScreen> {
  final _service = ShopService();
  final _mapController = MapController();
  final _sheetController = DraggableScrollableController();
  final _searchController = TextEditingController();

  List<Shop> _shops = [];
  bool _loading = true;
  String? _loadError;

  String? _category;
  String _query = '';
  bool _openOnly = false;
  Shop? _selected;

  LatLng? _myLocation;
  bool _locating = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _sheetController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final shops = await _service.fetchShops();
      if (!mounted) return;
      setState(() {
        _shops = shops;
        _loading = false;
      });
    } catch (e) {
      debugPrint('店舗の読み込みに失敗: $e');
      if (!mounted) return;
      setState(() {
        _loadError = 'お店を読み込めませんでした。通信状況を確認して、もう一度お試しください。';
        _loading = false;
      });
    }
  }

  LatLng get _origin => _myLocation ?? _hikoneStation;

  double _distanceTo(Shop s) =>
      const Distance().as(LengthUnit.Meter, _origin, s.position);

  List<Shop> get _visibleShops {
    final now = DateTime.now();
    final q = _query.trim().toLowerCase();
    final list = _shops.where((s) {
      if (_category != null && s.category != _category) return false;
      if (q.isNotEmpty &&
          !s.name.toLowerCase().contains(q) &&
          !(s.category ?? '').toLowerCase().contains(q)) {
        return false;
      }
      if (_openOnly && s.isOpenAt(now) != true) return false;
      return true;
    }).toList();
    list.sort((a, b) => _distanceTo(a).compareTo(_distanceTo(b)));
    return list;
  }

  void _select(Shop shop, {bool moveMap = true}) {
    setState(() => _selected = shop);
    if (moveMap) {
      final zoom = _mapController.camera.zoom < 16 ? 16.0 : _mapController.camera.zoom;
      _mapController.move(shop.position, zoom);
    }
    if (_sheetController.isAttached && _sheetController.size > 0.45) {
      _sheetController.animateTo(
        _minSheet,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  Future<void> _locateMe() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showMessage('位置情報がオフになっています。端末の設定でオンにしてください。');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _showMessage('位置情報の利用が許可されていません。彦根駅から近い順で表示しています。');
        return;
      }
      final pos = await Geolocator.getCurrentPosition()
          .timeout(const Duration(seconds: 15));
      final here = LatLng(pos.latitude, pos.longitude);
      if (!mounted) return;
      setState(() => _myLocation = here);
      _mapController.move(here, 16);
    } on TimeoutException {
      _showMessage('現在地を取得できませんでした。少し待ってからもう一度お試しください。');
    } catch (e) {
      debugPrint('現在地の取得に失敗: $e');
      _showMessage('現在地を取得できませんでした。');
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _showMessage(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    final shops = _visibleShops;

    return Scaffold(
      backgroundColor: Colors.white,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final sheetTop = constraints.maxHeight * _minSheet;
          return Stack(
            children: [
              Positioned.fill(child: _buildMap(shops)),
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                child: _buildTopBar(),
              ),
              Positioned(
                right: 12,
                bottom: sheetTop + (_selected != null ? 168 : 12),
                child: _MapButton(
                  icon: _locating ? null : Icons.my_location,
                  tooltip: '現在地を表示',
                  onPressed: _locating ? null : _locateMe,
                ),
              ),
              Positioned(
                left: 8,
                bottom: sheetTop + 4,
                child: const _Attribution(),
              ),
              if (_selected != null)
                Positioned(
                  left: 12,
                  right: 12,
                  bottom: sheetTop + 12,
                  child: _SelectedShopCard(
                    shop: _selected!,
                    distance: _distanceTo(_selected!),
                    fromHere: _myLocation != null,
                    onClose: () => setState(() => _selected = null),
                  ),
                ),
              _buildSheet(shops),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMap(List<Shop> shops) {
    final selectedId = _selected?.id;
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _initialCenter,
        initialZoom: 14.5,
        minZoom: 11,
        maxZoom: 19,
        onTap: (_, __) => setState(() => _selected = null),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.hikone.kurashi',
        ),
        MarkerLayer(
          markers: [
            for (final s in shops)
              if (s.id != selectedId)
                Marker(
                  point: s.position,
                  width: 28,
                  height: 28,
                  child: _ShopPin(onTap: () => _select(s, moveMap: false)),
                ),
            if (_selected != null)
              Marker(
                point: _selected!.position,
                width: 44,
                height: 44,
                alignment: Alignment.topCenter,
                child: const Icon(Icons.location_on, color: _accent, size: 44),
              ),
            if (_myLocation != null)
              Marker(
                point: _myLocation!,
                width: 22,
                height: 22,
                child: const _MyLocationDot(),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildTopBar() {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Material(
              elevation: 3,
              shadowColor: Colors.black26,
              borderRadius: BorderRadius.circular(28),
              color: Colors.white,
              child: TextField(
                controller: _searchController,
                onChanged: (v) => setState(() => _query = v),
                textInputAction: TextInputAction.search,
                style: const TextStyle(fontSize: 15, color: _ink),
                decoration: InputDecoration(
                  hintText: 'お店の名前やジャンルで探す',
                  hintStyle: const TextStyle(color: _muted),
                  prefixIcon: const Icon(Icons.search, color: _muted),
                  suffixIcon: _query.isEmpty
                      ? null
                      : IconButton(
                          tooltip: '検索をクリア',
                          icon: const Icon(Icons.close, color: _muted),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _query = '');
                          },
                        ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 36,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _FilterChip(
                    label: '営業中',
                    icon: Icons.schedule,
                    selected: _openOnly,
                    onTap: () => setState(() => _openOnly = !_openOnly),
                  ),
                  const SizedBox(width: 6),
                  for (final c in _categories) ...[
                    _FilterChip(
                      label: c,
                      selected: _category == c,
                      onTap: () => setState(
                        () => _category = _category == c ? null : c,
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSheet(List<Shop> shops) {
    return DraggableScrollableSheet(
      controller: _sheetController,
      initialChildSize: _minSheet,
      minChildSize: _minSheet,
      maxChildSize: 0.88,
      snap: true,
      snapSizes: const [_minSheet, 0.5, 0.88],
      builder: (context, scrollController) {
        return DecoratedBox(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            boxShadow: [
              BoxShadow(
                color: Color(0x1F000000),
                blurRadius: 16,
                offset: Offset(0, -4),
              ),
            ],
          ),
          child: CustomScrollView(
            controller: scrollController,
            slivers: [
              SliverToBoxAdapter(child: _sheetHeader(shops.length)),
              ..._sheetBody(shops),
            ],
          ),
        );
      },
    );
  }

  Widget _sheetHeader(int count) {
    final filtered = _category != null || _query.isNotEmpty || _openOnly;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
      child: Column(
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: _line,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                _loading ? 'お店を読み込み中' : '$count 件',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: _ink,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _myLocation != null ? '現在地から近い順' : '彦根駅から近い順',
                  style: const TextStyle(fontSize: 13, color: _muted),
                ),
              ),
              if (filtered)
                TextButton(
                  onPressed: () {
                    _searchController.clear();
                    setState(() {
                      _category = null;
                      _query = '';
                      _openOnly = false;
                    });
                  },
                  style: TextButton.styleFrom(foregroundColor: _accent),
                  child: const Text('条件をクリア'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _sheetBody(List<Shop> shops) {
    if (_loading) {
      return const [
        SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.all(32),
            child: Center(child: CircularProgressIndicator(color: _accent)),
          ),
        ),
      ];
    }
    if (_loadError != null) {
      return [
        SliverToBoxAdapter(
          child: _EmptyMessage(
            text: _loadError!,
            actionLabel: '再読み込み',
            onAction: _load,
          ),
        ),
      ];
    }
    if (shops.isEmpty) {
      return [
        SliverToBoxAdapter(
          child: _EmptyMessage(
            text: _openOnly
                ? '条件に合う営業中のお店が見つかりません。営業時間が登録されているお店はまだ少ないため、「営業中」を外すと多く表示されます。'
                : '条件に合うお店が見つかりません。',
          ),
        ),
      ];
    }
    final now = DateTime.now();
    return [
      SliverList.separated(
        itemCount: shops.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, indent: 20, endIndent: 20, color: _line),
        itemBuilder: (context, i) {
          final s = shops[i];
          return _ShopRow(
            shop: s,
            distance: _distanceTo(s),
            open: s.isOpenAt(now),
            selected: s.id == _selected?.id,
            onTap: () => _select(s),
          );
        },
      ),
      const SliverToBoxAdapter(child: SizedBox(height: 24)),
    ];
  }
}

String _formatDistance(double meters) {
  if (meters < 1000) return '${(meters / 10).round() * 10}m';
  return '${(meters / 1000).toStringAsFixed(1)}km';
}

class _ShopRow extends StatelessWidget {
  const _ShopRow({
    required this.shop,
    required this.distance,
    required this.open,
    required this.selected,
    required this.onTap,
  });

  final Shop shop;
  final double distance;
  final bool? open;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? const Color(0xFFFFF1F3) : Colors.white,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      shop.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: _ink,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text.rich(
                      TextSpan(
                        style: const TextStyle(fontSize: 13, color: _muted),
                        children: [
                          TextSpan(text: shop.category ?? '飲食店'),
                          if (open != null) ...[
                            const TextSpan(text: '　'),
                            TextSpan(
                              text: open! ? '営業中' : '営業時間外',
                              style: TextStyle(
                                color: open! ? _openGreen : _muted,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                _formatDistance(distance),
                style: const TextStyle(
                  fontSize: 13,
                  color: _muted,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SelectedShopCard extends StatelessWidget {
  const _SelectedShopCard({
    required this.shop,
    required this.distance,
    required this.fromHere,
    required this.onClose,
  });

  final Shop shop;
  final double distance;
  final bool fromHere;
  final VoidCallback onClose;

  Future<void> _open(BuildContext context, Uri uri) async {
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('開けませんでした。')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final open = shop.isOpenAt(DateTime.now());
    final hours = shop.openingHours;
    final website = shop.website;
    final phone = shop.phone;

    return Material(
      elevation: 6,
      shadowColor: Colors.black38,
      borderRadius: BorderRadius.circular(16),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        shop.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: _ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${shop.category ?? '飲食店'}　${fromHere ? '現在地' : '彦根駅'}から${_formatDistance(distance)}',
                        style: const TextStyle(fontSize: 13, color: _muted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: '閉じる',
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.close, color: _muted),
                  onPressed: onClose,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              hours == null
                  ? '営業時間：未登録'
                  : '営業時間：${formatOpeningHours(hours)}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                color: open == true ? _openGreen : _muted,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ActionButton(
                  icon: Icons.directions,
                  label: '経路',
                  primary: true,
                  onTap: () => _open(
                    context,
                    Uri.parse(
                      'https://www.google.com/maps/dir/?api=1&destination=${shop.position.latitude},${shop.position.longitude}',
                    ),
                  ),
                ),
                if (phone != null)
                  _ActionButton(
                    icon: Icons.call,
                    label: '電話',
                    onTap: () => _open(
                      context,
                      Uri(scheme: 'tel', path: phone.replaceAll(' ', '')),
                    ),
                  ),
                if (website != null && Uri.tryParse(website)?.hasScheme == true)
                  _ActionButton(
                    icon: Icons.public,
                    label: 'Webサイト',
                    onTap: () => _open(context, Uri.parse(website)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final fg = primary ? Colors.white : _accent;
    return Material(
      color: primary ? _accent : const Color(0xFFFFF1F3),
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: fg),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: fg,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Colors.white : _ink;
    return Material(
      color: selected ? _accent : Colors.white,
      elevation: selected ? 0 : 2,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: selected ? Colors.white : _openGreen),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: fg,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShopPin extends StatelessWidget {
  const _ShopPin({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: _accent,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: const [
              BoxShadow(
                color: Color(0x40000000),
                blurRadius: 3,
                offset: Offset(0, 1),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MyLocationDot extends StatelessWidget {
  const _MyLocationDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF2563EB),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const [
          BoxShadow(color: Color(0x40000000), blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
    );
  }
}

class _MapButton extends StatelessWidget {
  const _MapButton({required this.icon, required this.tooltip, this.onPressed});

  /// null のときは読み込み中の表示
  final IconData? icon;
  final String tooltip;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 3,
      shadowColor: Colors.black38,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: icon == null
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: _accent),
              )
            : Icon(icon, color: _accent),
      ),
    );
  }
}

class _Attribution extends StatelessWidget {
  const _Attribution();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => launchUrl(
        Uri.parse('https://www.openstreetmap.org/copyright'),
        mode: LaunchMode.externalApplication,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(4),
        ),
        child: const Text(
          '© OpenStreetMap contributors',
          style: TextStyle(fontSize: 10, color: _muted),
        ),
      ),
    );
  }
}

class _EmptyMessage extends StatelessWidget {
  const _EmptyMessage({required this.text, this.actionLabel, this.onAction});

  final String text;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        children: [
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: _muted, height: 1.6),
          ),
          if (actionLabel != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: onAction,
              style: OutlinedButton.styleFrom(
                foregroundColor: _accent,
                side: const BorderSide(color: _accent),
              ),
              child: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}
