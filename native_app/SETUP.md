# native_app セットアップ手順

## 1. Flutter のインストール

Flutter が未インストールの場合:

- https://docs.flutter.dev/get-started/install/windows を参照
- インストール後 `flutter doctor` で確認

## 2. プロジェクトの初期化

```bash
cd native_app
flutter pub get
```

**重要**: プラットフォームファイル（android/, ios/）が不完全な場合、以下で補完できます:

```bash
flutter create .
```

これにより、不足している Gradle / Xcode 設定が自動生成されます。
既存の `lib/` は上書きされません。

## 3. Supabase ダッシュボードの設定

1. Supabase ダッシュボード → Authentication → URL Configuration
2. **Redirect URLs** に以下を追加:
   - `com.hikone.kurashi://auth/callback`

## 4. 実行

```bash
# Android
flutter run -d android

# iOS（Mac のみ）
flutter run -d ios
```

## トラブルシューティング

- **Flutter が見つからない**: PATH に Flutter の `bin` を追加
- **日本語パスでエラー**: プロジェクトを英語パスのフォルダに移動して試す
- **Android ビルド失敗**: `flutter create .` でプラットフォームファイルを再生成
