# ホーム画面ウィジェット仕様 (Home Widgets Spec)

## 概要
ユーザーの生活スタイル（学生、社会人、主婦等）に合わせて、ホーム画面に必要な情報を「ウィジェット」としてカスタマイズ表示する機能。

## 構成要素
1.  **WidgetGrid**: ホーム画面のメインコンテンツエリア。有効化されたウィジェットを並べて表示。
2.  **WidgetSettingsModal**: ウィジェットの表示/非表示、並び替えを設定するモーダル。
3.  **DBスキーマ**: `user_settings` テーブルの `widget_settings` カラム (JSONB) に設定を保存。

## 実装ウィジェット一覧
### 1. Next Train (電車の時刻表)
-   **機能**: 指定駅（デフォルト: 彦根）の次発時刻、行き先、発車までの分数を表示。
-   **API**: `/api/timetable` (Yahoo路線情報スクレイピング等で取得を想定、現在はモックまたは簡易実装)。
-   **設定**: 将来的に駅名のカスタマイズに対応予定。

### 2. Garbage Info (ゴミ出し情報)
-   **機能**: ユーザーの居住地区に基づき、今日・明日のゴミ収集品目を表示。
-   **データソース**: `HikoneWasteMaster` 定数データ。
-   **依存**: プロフィールの居住地設定。

### 3. Quick Action (クイックアクション)
-   **機能**: よく使う機能へのショートカット。
-   **内容**:
    -   学生: 「学生認証（QRスキャン）」ボタン
    -   一般: 「マイQR」ボタン
    -   共通: 「店舗検索」ボタン

## パーソナライズロジック
初回アクセス時（設定未保存時）は、ユーザータイプに応じて以下のデフォルト構成を適用。

-   **大学生/高校生**: Next Train, Quick Action, Garbage Info
-   **その他**: Garbage Info, Quick Action (Next TrainはデフォルトOFFまたは下位)

## データ構造 (JSONB)
```json
{
  "widgets": [
    { "id": "next_train", "enabled": true, "order": 0 },
    { "id": "garbage_info", "enabled": true, "order": 1 },
    { "id": "quick_action", "enabled": true, "order": 2 }
  ]
}
```

## 拡張方法
1.  `components/home/widgets/` に新規コンポーネントを作成。
2.  `lib/actions/user-settings.ts` の `DEFAULT_WIDGETS` および `WIDGET_LABELS` に追加。
3.  `WidgetGrid.tsx` のレンダリングロジックに追加。
