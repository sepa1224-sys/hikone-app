/// OpenStreetMap の opening_hours 書式（よく使われる部分だけ）を読む。
///
/// 対応: "Mo-Su 11:00-22:00" / "24/7" / 複数時間帯 "11:00-15:00,17:00-22:00"
///       ";" やカンマ区切りの複数ルール / 週またぎ "Th-Tu" / 深夜営業 "15:00-02:00"
///       "We off" / 曜日なし（毎日）。祝日 PH の指定は無視する。
/// 読めない書式は null（不明）を返す。
library;

const _days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const _daysJa = ['月', '火', '水', '木', '金', '土', '日'];

final _dayToken = r'(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)';
final _daySpec = RegExp(
  '^($_dayToken(?:-$_dayToken)?(?:,$_dayToken(?:-$_dayToken)?)*)\\s+(.*)\$',
);
final _ruleSplit = RegExp('\\s*;\\s*|,\\s+(?=$_dayToken\\b)');
final _timeRange = RegExp(r'^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$');

class _Rule {
  _Rule(this.days, this.intervals, this.daysText, this.timesText);

  /// null = 毎日
  final Set<int>? days;

  /// 分単位 [開始, 終了)。終了が開始以下なら翌日にまたがる。空 = 定休
  final List<(int, int)> intervals;
  final String? daysText;
  final String timesText;
}

/// 曜日ごとの営業時間帯（0=月〜6=日）。読めなければ null。
List<List<(int, int)>>? _parse(String? raw) {
  final rules = _parseRules(raw);
  if (rules == null) return null;
  final week = List.generate(7, (_) => <(int, int)>[]);
  for (final r in rules) {
    for (final d in r.days ?? {0, 1, 2, 3, 4, 5, 6}) {
      week[d] = r.intervals;
    }
  }
  return week;
}

List<_Rule>? _parseRules(String? raw) {
  final text = raw?.trim();
  if (text == null || text.isEmpty) return null;
  if (text == '24/7') {
    return [_Rule(null, const [(0, 1440)], null, '24/7')];
  }

  final rules = <_Rule>[];
  for (final part in text.split(_ruleSplit)) {
    if (part.isEmpty) continue;
    String? daysText;
    var timesText = part;
    final m = _daySpec.firstMatch(part);
    if (m != null) {
      daysText = m.group(1);
      timesText = m.group(2)!.trim();
    }

    Set<int>? days;
    if (daysText != null) {
      days = _expandDays(daysText);
      if (days.isEmpty) continue; // PH のみのルールは無視
    }

    final lower = timesText.toLowerCase();
    if (lower == 'off' || lower == 'closed') {
      rules.add(_Rule(days, const [], daysText, timesText));
      continue;
    }

    final intervals = <(int, int)>[];
    for (final t in timesText.split(',')) {
      final tm = _timeRange.firstMatch(t.trim());
      if (tm == null) return null;
      final start = int.parse(tm.group(1)!) * 60 + int.parse(tm.group(2)!);
      var end = int.parse(tm.group(3)!) * 60 + int.parse(tm.group(4)!);
      if (end <= start) end += 1440;
      intervals.add((start, end));
    }
    rules.add(_Rule(days, intervals, daysText, timesText));
  }
  return rules.isEmpty ? null : rules;
}

Set<int> _expandDays(String spec) {
  final result = <int>{};
  for (final item in spec.split(',')) {
    if (item == 'PH') continue;
    final range = item.split('-');
    final from = _days.indexOf(range.first);
    final to = _days.indexOf(range.last);
    if (from < 0 || to < 0) continue;
    for (var i = from;; i = (i + 1) % 7) {
      result.add(i);
      if (i == to) break;
    }
  }
  return result;
}

/// 指定時刻に営業中か。書式が読めなければ null（不明）。
bool? isOpenAt(String? raw, DateTime time) {
  final week = _parse(raw);
  if (week == null) return null;
  final day = time.weekday - 1;
  final minute = time.hour * 60 + time.minute;

  for (final (start, end) in week[day]) {
    if (minute >= start && minute < end) return true;
  }
  // 前日からの深夜営業
  final prev = (day + 6) % 7;
  for (final (start, end) in week[prev]) {
    if (end > 1440 && minute + 1440 >= start && minute + 1440 < end) {
      return true;
    }
  }
  return false;
}

/// 画面表示用の日本語。読めなければ元の文字をそのまま返す。
String formatOpeningHours(String raw) {
  final rules = _parseRules(raw);
  if (rules == null) return raw;
  if (raw.trim() == '24/7') return '24時間営業';

  return rules.map((r) {
    final times = r.intervals.isEmpty
        ? '定休'
        : r.timesText.split(',').map((t) => t.trim()).join(', ');
    if (r.daysText == null) return times;
    var days = r.daysText!;
    for (var i = 0; i < 7; i++) {
      days = days.replaceAll(_days[i], _daysJa[i]);
    }
    days = days.replaceAll('PH', '祝').replaceAll('-', '〜').replaceAll(',', '・');
    return '$days $times';
  }).join(' / ');
}
