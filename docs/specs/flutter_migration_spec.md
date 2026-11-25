# Flutter 移行仕様書
## hikone-app ロジック再実装ガイド (TypeScript → Dart)

> 本書は `lib/_actions_backup_final/` の実装を分析し、Flutter (Dart) で再実装するための仕様書です。
> 各機能の「入力・処理・出力」を定義します。

---

## 目次

1. [共通定義](#1-共通定義)
2. [スタンプカード機能](#2-スタンプカード機能)
3. [ひこポ送金機能](#3-ひこポ送金機能)
4. [招待コード機能](#4-招待コード機能)
5. [月次ミッション機能](#5-月次ミッション機能)
6. [統計・ランキング機能](#6-統計ランキング機能)
7. [掲示板機能](#7-掲示板機能)
8. [学生ポータル機能](#8-学生ポータル機能)
9. [店舗管理機能](#9-店舗管理機能)
10. [DBテーブル早見表](#10-dbテーブル早見表)

---

## 1. 共通定義

### 1.1 Supabase 接続

```dart
// Dart 実装イメージ
// パッケージ: supabase_flutter
// 初期化: main.dart で Supabase.initialize() を呼ぶ
// クライアント取得: Supabase.instance.client
```

### 1.2 共通レスポンス型

```dart
class ActionResult<T> {
  final bool success;
  final String message;
  final String? error;   // エラーコード (例: 'NOT_LOGGED_IN')
  final T? data;

  const ActionResult({
    required this.success,
    required this.message,
    this.error,
    this.data,
  });
}
```

### 1.3 Haversine 距離計算

```dart
// stamp.ts の calculateDistance() を移植
double calculateDistance(
  double lat1, double lon1,
  double lat2, double lon2,
) {
  const R = 6371e3; // 地球の半径(m)
  final phi1 = lat1 * pi / 180;
  final phi2 = lat2 * pi / 180;
  final dPhi = (lat2 - lat1) * pi / 180;
  final dLambda = (lon2 - lon1) * pi / 180;

  final a = sin(dPhi / 2) * sin(dPhi / 2) +
      cos(phi1) * cos(phi2) *
      sin(dLambda / 2) * sin(dLambda / 2);
  final c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return R * c;
}
```

### 1.4 管理者バイパス (ADR-006)

| 条件 | 動作 |
|------|------|
| ログインユーザーのメールが `sepa1224@gmail.com` | GPS距離チェックをスキップ |
| それ以外 | 通常通り距離チェックを実施 |

---

## 2. スタンプカード機能

**ソースファイル**: `lib/_actions_backup_final/actions/stamp.ts`

### 2.1 DB テーブル構造 (3層)

```
stamp_cards (テンプレート)
  shop_id (PK, FK → shops.id)
  target_count    : INTEGER  // 目標スタンプ数 (デフォルト 10)
  reward_description : TEXT
  expiry_days     : INTEGER  // クーポン有効期限(日) デフォルト 180

user_stamps (ユーザー所持状態)
  id (PK, UUID)
  user_id         : UUID  (FK → auth.users)
  stamp_card_id   : UUID  (FK → stamp_cards.shop_id)
  current_count   : INTEGER
  is_completed    : BOOLEAN
  updated_at      : TIMESTAMPTZ

stamp_logs (スタンプ押印履歴)
  id (PK, UUID)
  user_stamp_id   : UUID  (FK → user_stamps.id)
  stamped_at      : TIMESTAMPTZ
  location_lat    : FLOAT
  location_lng    : FLOAT

coupons (特典)
  id (PK, UUID)
  user_id         : UUID
  shop_id         : UUID
  status          : TEXT  ('unused' | 'used')
  title           : TEXT
  description     : TEXT
  expires_at      : TIMESTAMPTZ
```

---

### 2.2 `grantStamp` — スタンプ付与

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `shopId` | `String` (UUID) | スタンプを押す店舗のID |
| `userLat` | `double` | ユーザーの現在緯度 |
| `userLng` | `double` | ユーザーの現在経度 |

#### 処理フロー

```
1. 認証チェック
   └─ 未ログイン → エラー返却

2. 店舗の位置情報を取得 (shops テーブル)
   └─ 店舗が見つからない / 位置情報未登録 → エラー返却

3. GPS距離チェック
   ├─ calculateDistance() で距離を計算
   ├─ 管理者バイパスチェック (email === 'sepa1224@gmail.com')
   └─ 距離 > 50m かつ管理者でない → エラー返却

4. user_stamps からユーザーのカードを取得
   └─ カードが存在しない → INSERT で新規作成 (current_count=0, is_completed=false)

5. 24時間重複チェック
   ├─ stamp_logs を直近1件取得
   └─ 前回スタンプから 24時間未満 → エラー返却

6. stamp_logs に履歴を INSERT
   (user_stamp_id, stamped_at=now(), location_lat, location_lng)

7. user_stamps の current_count を +1 UPDATE

8. クーポン判定
   ├─ stamp_cards から target_count を取得 (デフォルト 10)
   ├─ current_count % target_count === 0 の場合 → クーポンを発行
   │   └─ coupons テーブルに INSERT
   │       status='unused', expires_at=今日+expiry_days
   └─ 達成時: success=true, isCompleted=true のレスポンス
```

#### 出力

```dart
class GrantStampResult {
  final bool success;
  final String message;
  final String? shopName;
  final bool isCompleted; // true = スタンプコンプリートでクーポン獲得
}
```

| ケース | success | message |
|--------|---------|---------|
| 成功 | true | 'スタンプを獲得しました！' |
| コンプリート | true | 'スタンプが貯まりました！特典チケットを獲得しました！' |
| 未ログイン | false | 'ログインが必要です' |
| 店舗未登録 | false | '店舗情報が見つかりません' |
| 位置情報なし | false | '店舗の位置情報が登録されていません' |
| 距離超過 | false | '店舗からの距離が遠すぎます（現在地から約NNm）' |
| 24時間制限 | false | 'この店舗のスタンプは1日1回までです。明日またお越しください！' |

---

### 2.3 `getStampCard` — スタンプカード設定取得

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `shopId` | `String` (UUID) | 店舗ID |

#### 処理

```
stamp_cards テーブル + shops テーブルを JOIN して取得
  SELECT stamp_cards.*, shops.name, shops.image_url
  WHERE stamp_cards.shop_id = shopId
```

#### 出力

```dart
class StampCardConfig {
  final String shopId;
  final String shopName;
  final String? shopImageUrl;
  final int targetCount;
  final String? rewardDescription;
  final int? expiryDays;
}
```

---

### 2.4 `getUserStamps` — ユーザーのスタンプ履歴取得

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `shopId` | `String` (UUID) | 店舗ID |

#### 処理

```
1. auth.getUser() でログインユーザー取得
2. user_stamps から (user_id, stamp_card_id=shopId) を検索
3. user_stamps.id を使って stamp_logs を取得 (降順)
```

#### 出力

```dart
class StampLog {
  final String id;
  final String userStampId;
  final DateTime stampedAt;
  final double? locationLat;
  final double? locationLng;
}
// List<StampLog> を返す
```

---

### 2.5 `getMyStampCards` — 所持カード一覧

#### 入力

なし（ログインユーザーを自動取得）

#### 処理

```
user_stamps
  JOIN stamp_cards ON stamp_cards.shop_id = user_stamps.stamp_card_id
  JOIN shops ON shops.id = stamp_cards.shop_id
WHERE user_stamps.user_id = ログインユーザーID
ORDER BY user_stamps.updated_at DESC
```

#### 出力

```dart
class MyStampCard {
  final String shopId;
  final String shopName;
  final String? thumbnailUrl;
  final DateTime lastStampedAt;
  final int stampCount;
  final int targetCount;
  final String? reward;
}
// List<MyStampCard>
```

---

### 2.6 `getAvailableStampCards` — 未取得カード一覧

#### 処理

```
1. 自分が既に持っているカードの shopId 一覧を取得
2. stamp_cards + shops を取得
   WHERE stamp_cards.shop_id NOT IN (自分の所持shopId一覧)
```

---

### 2.7 `registerStampCard` — カード登録

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `shopId` | `String` (UUID) | 登録したい店舗ID |

#### 処理

```
1. ログインチェック
2. user_stamps に (user_id, stamp_card_id=shopId) が既に存在するか確認
3. 存在する → cardId を返して終了
4. 存在しない → INSERT (current_count=0, is_completed=false)
```

---

### 2.8 `updateStampCardSettings` — カード設定更新 (店舗オーナー/管理者)

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `userId` | `String` | 操作者のユーザーID |
| `targetCount` | `int` | 目標スタンプ数 |
| `rewardDescription` | `String?` | 特典説明 |
| `expiryDays` | `int?` | クーポン有効期限(日) |
| `impersonateShopId` | `String?` | 管理者が代理設定する場合の店舗ID |

#### 処理

```
管理者モード (impersonateShopId 指定時):
  └─ profiles.is_admin または role='admin' を確認

通常モード:
  └─ shops テーブルから owner_id=userId の店舗IDを取得

stamp_cards に UPSERT (shop_id を主キーとして重複時は UPDATE)
```

---

## 3. ひこポ送金機能

**ソースファイル**: `lib/_actions_backup_final/actions/transfer.ts`

### 3.1 `sendHikopo` — ポイント送金

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `senderId` | `String` (UUID) | 送金者のユーザーID |
| `receiverReferralCode` | `String` | 受取人の招待コード (8桁、大文字に正規化) |
| `amount` | `int` | 送金額 (1以上の整数) |

#### バリデーション (クライアント側で実施)

| 条件 | エラーコード | メッセージ |
|------|------------|-----------|
| senderId が空 | `NOT_LOGGED_IN` | ログインが必要です |
| receiverReferralCode が空 | `EMPTY_CODE` | 送り先のコードを入力してください |
| amount <= 0 | `INVALID_AMOUNT` | 送金額は1以上で入力してください |
| amount が整数でない | `NOT_INTEGER` | 送金額は整数で入力してください |

#### 処理フロー

```
1. バリデーション (上記)

2. receiverReferralCode → 大文字に正規化 (.trim().toUpperCase())

3. profiles テーブルから受取人を検索
   WHERE referral_code = code
   └─ 見つからない → RECEIVER_NOT_FOUND エラー

4. Supabase RPC 'transfer_hikopo' を呼び出し
   引数: {
     sender_id: senderId,
     receiver_referral_code: code,
     amount: amount
   }
   └─ 戻り値: 送金後の新残高

5. エラーハンドリング (英語メッセージ → 日本語変換)
```

#### エラー変換テーブル

| RPCエラーメッセージ | 日本語メッセージ |
|-------------------|----------------|
| `Insufficient balance` | ヒコポが足りません！ |
| `Receiver not found` | 送り先のコードが見つかりません |
| `Cannot send to yourself` | 自分自身にはヒコポを送れません |
| `Amount must be positive` | 送金額は1ポイント以上で入力してください |
| `Sender not found` | ユーザー情報が見つかりません。ログインし直してください |
| `network` / `fetch` | 通信エラーが発生しました |
| `timeout` | 処理がタイムアウトしました |

#### 出力

```dart
class TransferResult {
  final bool success;
  final String message;
  final String? error;    // エラーコード
  final int? newBalance;  // 送金後の残高
}
```

---

### 3.2 `getReceiverInfo` — 送金相手のプレビュー取得

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `referralCode` | `String` | 入力された招待コード |

#### 処理

```
profiles テーブルから
  SELECT full_name, avatar_url
  WHERE referral_code = code.trim().toUpperCase()
```

#### 出力

```dart
class ReceiverInfo {
  final bool found;
  final String? name;
  final String? avatarUrl;
}
```

> **用途**: 送金確認画面で相手の名前・アバターをプレビュー表示するために使用

---

## 4. 招待コード機能

**ソースファイル**: `lib/_actions_backup_final/actions/referral.ts`

### 4.1 定数

```dart
const int referralBonusPoints = 500; // 招待ボーナス (招待者・被招待者 両方に付与)
```

### 4.2 `applyReferralCode` — 招待コード適用

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `currentUserId` | `String` | 招待コードを入力したユーザー (被招待者) のID |
| `referralCode` | `String` | 入力された招待コード |

#### 処理フロー

```
1. バリデーション
   ├─ userId が空 → USER_NOT_LOGGED_IN エラー
   └─ referralCode が空 → EMPTY_CODE エラー

2. 招待コードを正規化 (.trim().toUpperCase())

3. 優先: Supabase RPC 'apply_referral_bonus' を呼び出し
   引数: {
     invitee_id: currentUserId,
     referral_code_to_use: code,
     bonus_amount: 500
   }
   └─ 成功 → RPCの結果をそのまま返却

4. RPC失敗時 → フォールバックロジック:

   4-1. 自分のプロフィールを取得 (profiles WHERE id=currentUserId)
        └─ has_used_referral=true → ALREADY_USED エラー

   4-2. 自分自身のコードと一致するか確認
        └─ 一致 → SELF_REFERRAL エラー

   4-3. 招待者 (referral_code=code) を検索
        └─ 見つからない → INVALID_CODE エラー

   4-4. 以下を順次実行:
        ① 招待者の points を +500 UPDATE
        ② point_history に INSERT (招待者分)
        ③ 被招待者の points を +500 UPDATE
           + has_used_referral=true, referred_by=招待者ID を SET
        ④ point_history に INSERT (被招待者分)
```

#### 出力

```dart
class ApplyReferralResult {
  final bool success;
  final String message;
  final String? error;
}
```

| ケース | success | error |
|--------|---------|-------|
| 成功 | true | — |
| 未ログイン | false | `USER_NOT_LOGGED_IN` |
| コード空 | false | `EMPTY_CODE` |
| 使用済み | false | `ALREADY_USED` |
| 自己適用 | false | `SELF_REFERRAL` |
| コード無効 | false | `INVALID_CODE` |

---

### 4.3 `checkReferralUsed` — 使用済み確認

#### 入力

| パラメータ | 型 |
|-----------|-----|
| `userId` | `String` |

#### 処理

```
profiles WHERE id=userId を取得
has_used_referral カラムを返す
エラー時は true (使用済み扱い、安全側に倒す)
```

#### 出力

`bool` — true: 使用済み / false: 未使用

---

## 5. 月次ミッション機能

**ソースファイル**: `lib/_actions_backup_final/actions/missions.ts`

### 5.1 データモデル

```dart
enum MissionType { qr, photo }

class Mission {
  final String id;
  final String title;
  final String? description;
  final MissionType missionType;
  final int points;
  final String month;   // 形式: 'YYYY-MM'
  final DateTime createdAt;
}

enum SubmissionStatus { pending, approved, rejected }

class MissionSubmission {
  final String id;
  final String userId;
  final String missionId;
  final SubmissionStatus status;
  final String? imageUrl;
  final String? reviewerComment;
  final DateTime createdAt;
}
```

### 5.2 `createMission` — ミッション作成 (管理者用)

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `title` | `String` | ミッション名 |
| `description` | `String?` | 説明 |
| `missionType` | `MissionType` | `qr` or `photo` |
| `points` | `int` | 獲得ポイント |
| `month` | `String` | 対象月 ('YYYY-MM') |

#### 処理

```
monthly_missions テーブルに INSERT
```

---

### 5.3 `getMissions` — ミッション一覧取得

#### 入力

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `month` | `String?` | 絞り込む月 (省略時: 全件) |

#### 処理

```
monthly_missions SELECT *
  [WHERE month = month]
  ORDER BY created_at DESC
```

#### 出力

`List<Mission>`

---

### 5.4 `getUserMissionStatus` — ユーザーのミッション投稿状況

#### 入力

なし（ログインユーザーを自動取得）

#### 処理

```
mission_submissions
  SELECT mission_id, status
  WHERE user_id = ログインユーザーID
```

#### 出力

`Map<String, String>` — `{ missionId: status }` の形式

---

## 6. 統計・ランキング機能

**ソースファイル**: `lib/_actions_backup_final/actions/stats.ts` / `student.ts`

### 6.1 `getUniversityStats` — 大学別統計

#### 入力

| パラメータ | 型 |
|-----------|-----|
| `universityName` | `String` |

#### 処理

```
profiles WHERE university_name = universityName
  → grade カラムを全取得
  → 学年ごとの人数を集計
  → 学年順にソート
```

#### 出力

```dart
class UniversityStats {
  final String universityName;
  final int totalCount;
  final List<GradeBreakdown> gradeBreakdown;
}

class GradeBreakdown {
  final String grade;
  final int count;
}
```

---

### 6.2 `getSchoolRanking` — 学校内ランキング (今月の走行距離)

#### 入力

| パラメータ | 型 |
|-----------|-----|
| `schoolId` | `String` |

#### 処理

```
1. profiles WHERE school_id = schoolId → 生徒一覧取得
2. activity_logs
   WHERE user_id IN (生徒IDリスト)
     AND activity_type = 'run'
     AND created_at >= 今月1日
   → ユーザーごとに distance を合計
3. 距離で降順ソート → 上位5名 → rank を付与 (1-based)
```

#### 出力

```dart
class RankingUser {
  final String id;
  final String nickname;
  final String? avatarUrl;
  final double distance;
  final int rank;
}
// List<RankingUser>
```

---

### 6.3 `getSchoolGradeDistribution` — 学年分布

#### 入力

| パラメータ | 型 |
|-----------|-----|
| `schoolId` | `String` |

#### 出力

```dart
class GradeDistribution {
  final String name;  // 例: '1年生'
  final int value;    // 人数
}
// List<GradeDistribution>
```

---

## 7. 掲示板機能

**ソースファイル**: `lib/_actions_backup_final/actions/board.ts`

### 7.1 データモデル

```dart
class Post {
  final String id;
  final String userId;
  final String content;
  final String universityName;
  final DateTime createdAt;
  final PostAuthor? author;
}

class PostAuthor {
  final String? fullName;
  final String? avatarUrl;
  final String? grade;
}
```

### 7.2 `getPosts` — 投稿一覧取得

#### 入力

| パラメータ | 型 |
|-----------|-----|
| `universityName` | `String` |

#### 処理

```
posts JOIN profiles (full_name, avatar_url, grade)
WHERE posts.university_name = universityName
ORDER BY created_at DESC
```

#### 出力

`List<Post>`

---

### 7.3 `createPost` — 投稿作成

#### 入力

| パラメータ | 型 |
|-----------|-----|
| `content` | `String` |
| `universityName` | `String` |

#### 処理

```
1. ログインチェック
2. posts INSERT {
     user_id: ログインユーザーID,
     content: content,
     university_name: universityName
   }
```

---

## 8. 学生ポータル機能

**関連ファイル**: `student.ts`, `specs/student_v1.md`

> `student.ts` は現時点ではスタブ。`student_v1.md` の仕様に基づき実装予定。

### 8.1 実装予定の機能

| 機能 | 説明 |
|------|------|
| 学生認証 | 大学メールアドレス検証 |
| ランキング表示 | 学校内の走行距離ランキング |
| 学校限定クーポン | `school_id` に紐づくクーポン |
| 学年分布グラフ | pie chart / bar chart |
| コミュニティ掲示板 | `board.ts` と統合 |

---

## 9. 店舗管理機能

**ソースファイル**: `lib/_actions_backup_final/actions/shop.ts`

> `shop.ts` は現在スタブのみ (`getShops`, `getShop` の骨格のみ)。
> `specs/shop-management.md` と `specs/menu.md` に詳細仕様あり。

### 9.1 実装予定の関数

| 関数名 | 概要 |
|--------|------|
| `getShops()` | 店舗一覧取得 (カテゴリ/エリア絞り込み対応) |
| `getShop(shopId)` | 店舗詳細取得 |
| `getMenuItems(shopId)` | メニュー一覧取得 |
| `createMenuItem(shopId, item)` | メニュー追加 |
| `updateMenuItem(itemId, item)` | メニュー更新 |
| `deleteMenuItem(itemId)` | メニュー削除 |
| `uploadMenuImage(shopId, file)` | メニュー画像アップロード |

### 9.2 メニューテーブル構造

```sql
menu_items:
  id          UUID (PK)
  shop_id     UUID (FK → shops.id)
  name        VARCHAR(255)
  price       INTEGER
  category    VARCHAR(50)
  image_url   TEXT
  sort_order  INTEGER
  created_at  TIMESTAMPTZ
```

---

## 10. DBテーブル早見表

| テーブル名 | 主な用途 | 主なFK |
|-----------|---------|--------|
| `profiles` | ユーザープロフィール, ポイント残高 | `auth.users.id` |
| `shops` | 店舗情報 (位置情報含む) | `owner_id → auth.users.id` |
| `stamp_cards` | スタンプカードテンプレート | `shop_id → shops.id` |
| `user_stamps` | ユーザーのカード所持状態 | `user_id`, `stamp_card_id` |
| `stamp_logs` | スタンプ押印履歴 | `user_stamp_id → user_stamps.id` |
| `coupons` | スタンプ特典クーポン | `user_id`, `shop_id` |
| `menu_items` | 店舗メニュー | `shop_id → shops.id` |
| `shop_bank_details` | 振込先口座 (オーナーID紐付け) | `shop_id → auth.users.id` |
| `payout_requests` | 振込申請 | `shop_id → auth.users.id` |
| `monthly_missions` | 月次ミッション定義 | — |
| `mission_submissions` | ミッション投稿 | `user_id`, `mission_id` |
| `point_history` | ポイント履歴 | `user_id` |
| `posts` | 掲示板投稿 | `user_id` |
| `activity_logs` | 活動ログ (走行距離等) | `user_id` |

---

## 付録: Flutter 実装ディレクトリ構成 (推奨)

```
lib/
├── main.dart
├── core/
│   ├── supabase_client.dart      // Supabase 初期化
│   ├── result.dart               // ActionResult<T> 共通型
│   └── distance.dart             // Haversine 計算
│
├── features/
│   ├── stamp/
│   │   ├── stamp_repository.dart // ← stamp.ts を移植
│   │   ├── stamp_model.dart
│   │   └── stamp_notifier.dart   // Riverpod / Provider
│   │
│   ├── transfer/
│   │   ├── transfer_repository.dart // ← transfer.ts を移植
│   │   └── transfer_model.dart
│   │
│   ├── referral/
│   │   └── referral_repository.dart // ← referral.ts を移植
│   │
│   ├── mission/
│   │   └── mission_repository.dart  // ← missions.ts を移植
│   │
│   ├── shop/
│   │   ├── shop_repository.dart
│   │   └── menu_repository.dart
│   │
│   ├── student/
│   │   └── student_repository.dart
│   │
│   └── board/
│       └── board_repository.dart    // ← board.ts を移植
│
└── ui/
    ├── stamp/
    ├── transfer/
    ├── shop/
    └── ...
```

---

*生成日: 2026-02-24*
*元ソース: `lib/_actions_backup_final/actions/`*
