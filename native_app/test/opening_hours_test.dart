import 'package:flutter_test/flutter_test.dart';
import 'package:native_app/utils/opening_hours.dart';

/// 2026-11-25 は水曜日
DateTime wed(int h, [int m = 0]) => DateTime(2026, 11, 25, h, m);
DateTime thu(int h, [int m = 0]) => DateTime(2026, 11, 26, h, m);
DateTime sat(int h, [int m = 0]) => DateTime(2026, 11, 28, h, m);
DateTime sun(int h, [int m = 0]) => DateTime(2026, 11, 29, h, m);

void main() {
  group('isOpenAt', () {
    test('書式がない・読めないときは不明(null)', () {
      expect(isOpenAt(null, wed(12)), isNull);
      expect(isOpenAt('', wed(12)), isNull);
      expect(
        isOpenAt('"today is 11:00-15:00. each day is decided day by day"', wed(12)),
        isNull,
      );
    });

    test('毎日同じ時間', () {
      const h = 'Mo-Su 11:00-22:00';
      expect(isOpenAt(h, wed(10, 59)), isFalse);
      expect(isOpenAt(h, wed(11)), isTrue);
      expect(isOpenAt(h, wed(21, 59)), isTrue);
      expect(isOpenAt(h, wed(22)), isFalse);
    });

    test('24時間営業', () {
      expect(isOpenAt('24/7', wed(3)), isTrue);
    });

    test('昼と夜の2部制', () {
      const h = 'Mo-Su 11:00-15:00,17:00-22:30';
      expect(isOpenAt(h, wed(14)), isTrue);
      expect(isOpenAt(h, wed(16)), isFalse);
      expect(isOpenAt(h, wed(22)), isTrue);
    });

    test('曜日の範囲が週をまたぐ（木〜火）', () {
      const h = 'Th-Tu 11:30-15:00,17:00-20:00';
      expect(isOpenAt(h, wed(12)), isFalse); // 水曜は定休
      expect(isOpenAt(h, thu(12)), isTrue);
      expect(isOpenAt(h, sun(18)), isTrue);
    });

    test('曜日指定なし＋定休日(off)', () {
      const h = '11:30-14:30,18:00-23:00; We off';
      expect(isOpenAt(h, wed(12)), isFalse);
      expect(isOpenAt(h, thu(12)), isTrue);
    });

    test('カンマ区切りの複数ルールと深夜営業', () {
      const h = 'Mo-Th 15:00-24:00, Fr,Sa 15:00-02:00';
      expect(isOpenAt(h, wed(23, 30)), isTrue);
      expect(isOpenAt(h, thu(1)), isFalse); // 水曜は24時まで
      expect(isOpenAt(h, sat(1)), isTrue); // 金曜の深夜
      expect(isOpenAt(h, sun(1)), isTrue); // 土曜の深夜
      expect(isOpenAt(h, sun(3)), isFalse);
    });

    test('セミコロン区切りで曜日ごとに違う時間', () {
      const h = 'We-Fr 11:00-15:00; Sa 10:00-16:00';
      expect(isOpenAt(h, wed(12)), isTrue);
      expect(isOpenAt(h, sat(15, 30)), isTrue);
      expect(isOpenAt(h, sun(12)), isFalse);
    });

    test('祝日(PH)の指定は無視して曜日で判定', () {
      const h = 'Mo-Su,PH 08:00-22:00';
      expect(isOpenAt(h, wed(9)), isTrue);
    });
  });

  group('formatOpeningHours', () {
    test('曜日を日本語にする', () {
      expect(formatOpeningHours('Mo-Su 11:00-22:00'), '月〜日 11:00-22:00');
      expect(formatOpeningHours('11:30-14:30,18:00-23:00; We off'),
          '11:30-14:30, 18:00-23:00 / 水 定休');
      expect(formatOpeningHours('24/7'), '24時間営業');
    });
  });
}
