# 相互学生認証システム（ソーシャルバリデーション）仕様書

## 1. 概要
中央集権的な審査ではなく、同じ学校の学生同士が相互に認証し合うことで、学生としての信頼性を担保するシステム。

## 2. データベース設計

### profiles テーブル拡張
- `verified_status` (text): 'unverified' (初期値) | 'verified'

### student_verifications テーブル (新規)
- `id` (uuid): PK
- `validator_id` (uuid): 認証したユーザー (FK -> profiles.id)
- `target_id` (uuid): 認証されたユーザー (FK -> profiles.id)
- `created_at` (timestamptz): 認証日時
- 制約: `UNIQUE(validator_id, target_id)` - 重複認証不可

## 3. ロジック

### 認証条件
- 操作者(validator)と対象者(target)が異なること。
- 両者が同じ `school_id` を持っていること。
- 過去に認証していないこと。

### プロセス
1. **認証実行**:
   - `student_verifications` にレコード追加。
   - 操作者に **100ポイント** 付与。
   - 対象者の被認証数をカウント。
2. **ステータス更新**:
   - 被認証数が **3** に達した場合、対象者の `verified_status` を `'verified'` に更新。

## 4. UI仕様

### 他人のプロフィール画面
- **認証ボタン**:
  - 表示条件: 同じ学校、未認証。
  - ラベル: 「この人を学生として認証する (+100pt)」
  - アクション: 確認ダイアログ -> 実行 -> 完了メッセージ。
- **バッジ**:
  - `verified_status` が 'verified' の場合、名前の横に認証バッジを表示。

### 自分のプロフィール画面
- **プログレスバー**:
  - 「学生認証まであと X 人」を表示。
  - 3人認証済みなら「認証済み」と表示。
- **QRコード認証セクション**:
  - **QR表示**: 自分の認証用QRコードを表示（5分間有効）。
  - **スキャナー**: 相手のQRコードを読み取るためのカメラ起動ボタン。

## 5. API / Server Actions

### `verifyStudent(targetId: string)`
- 認証実行、ポイント付与、ステータス更新をアトミックに行う（理想）。
- Service Role Keyを使用してRLSをバイパスし、厳密な条件チェックを行う。

### `getVerificationStatus(userId: string)`
- 現在の認証数、認証済みかどうかを返す。

### `verifyStudentWithQR(qrData: string)`
- QRコード文字列 (`student-verification:{userId}:{timestamp}`) を検証。
- タイムスタンプの有効期限（10分）をチェック。
- 有効であれば `verifyStudent` を内部的に呼び出す。

## 6. QRコード認証 (対面認証)

### データフォーマット
- `student-verification:{user_id}:{timestamp}`
- 例: `student-verification:uuid-v4-xxx:1700000000000`

### セキュリティ
- **有効期限**: 生成から10分間（クライアント側では5分ごとに再生成）。
- **なりすまし防止**: アプリ内生成のみ対応（外部生成QRの不正利用防止は完全ではないが、timestampで抑制）。
- **バリデーション**:
  - フォーマットチェック
  - タイムスタンプチェック
  - 同一ユーザーチェック
  - 同一学校チェック（`verifyStudent` 内で実施）
