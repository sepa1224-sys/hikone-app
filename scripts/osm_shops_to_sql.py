"""OpenStreetMap の彦根市内の飲食店を shops テーブル用の SQL に変換する。

使い方:
  1. Overpass API から取得（scripts/README 参照）して hikone_food.json を作る
  2. python3 -I scripts/osm_shops_to_sql.py hikone_food.json > out.sql
  3. out.sql を Supabase の SQL エディタ等で実行（同じ店は上書き更新）

データ: © OpenStreetMap contributors（ODbL）。アプリ内に出典表示が必要。
"""

import json
import sys

# OSM の amenity / shop / cuisine → アプリのジャンル
CUISINE_MAP = [
    (("ramen", "noodle", "udon", "soba"), "ラーメン・麺"),
    (("sushi",), "寿司"),
    (("yakiniku", "barbecue", "steak_house"), "焼肉・ステーキ"),
    (("chinese",), "中華"),
    (("italian", "pizza", "pasta", "french", "western", "hamburger_steak"), "洋食"),
    (("curry", "indian", "nepalese", "thai", "korean", "vietnamese", "asian"), "アジア・カレー"),
    (("japanese", "tempura", "tonkatsu", "okonomiyaki", "takoyaki", "unagi",
      "teishoku", "regional", "omi_beef"), "和食"),
]


def category_for(tags):
    amenity = tags.get("amenity")
    shop = tags.get("shop")
    cuisine = (tags.get("cuisine") or "").lower()

    if shop in ("bakery", "confectionery", "pastry") or amenity == "ice_cream":
        return "スイーツ・パン"
    if amenity == "cafe":
        return "カフェ"
    if amenity in ("bar", "pub", "izakaya"):
        return "居酒屋・バー"
    if amenity == "fast_food":
        if any(k in cuisine for k in ("ramen", "noodle", "udon", "soba")):
            return "ラーメン・麺"
        return "ファストフード"
    for keys, label in CUISINE_MAP:
        if any(k in cuisine for k in keys):
            return label
    return "レストラン"


def sql_str(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"


def main(path):
    data = json.load(open(path, encoding="utf-8"))
    rows = []
    for el in data["elements"]:
        tags = el.get("tags", {})
        name = tags.get("name:ja") or tags.get("name")
        if not name:
            continue
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue
        rows.append("(" + ", ".join([
            sql_str(name),
            sql_str(category_for(tags)),
            sql_str(tags.get("cuisine")),
            f"{float(lat):.7f}",
            f"{float(lon):.7f}",
            sql_str(tags.get("phone") or tags.get("contact:phone")),
            sql_str(tags.get("opening_hours")),
            sql_str(tags.get("website") or tags.get("contact:website")),
            "'osm'",
            sql_str(f"{el['type']}/{el['id']}"),
        ]) + ")")

    print("insert into public.shops "
          "(name, category_main, category_sub, latitude, longitude, phone, "
          "opening_hours, website, source, source_id) values")
    print(",\n".join(rows))
    print("on conflict (source, source_id) do update set "
          "name = excluded.name, category_main = excluded.category_main, "
          "category_sub = excluded.category_sub, latitude = excluded.latitude, "
          "longitude = excluded.longitude, phone = excluded.phone, "
          "opening_hours = excluded.opening_hours, website = excluded.website;")
    print(f"-- {len(rows)} 件", file=sys.stderr)


if __name__ == "__main__":
    main(sys.argv[1])
