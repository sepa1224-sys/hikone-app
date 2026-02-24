# 彦根くらしアプリ - Flutter ネイティブ版

Web版（`app/`, `components/`, `lib/`）の設計図を基に構築した iOS/Android ネイティブアプリです。

## 前提条件

- [Flutter SDK](https://docs.flutter.dev/get-started/install) をインストール
- `flutter doctor` が通ること

## セットアップ

```bash
cd native_app
flutter pub get
```

プラットフォームファイルが不足している場合（Flutter 未使用で手動作成した場合）:

```bash
flutter create .
```

**Android SDK がない場合**: [SETUP_ANDROID.md](SETUP_ANDROID.md) を参照。

詳細は [SETUP.md](SETUP.md) を参照。

## 実行

```bash
# Android
flutter run

# iOS（Mac のみ）
flutter run -d ios
```

## 環境変数（オプション）

親プロジェクトの `.env.local` と同じ Supabase 設定を使用します。
ビルド時に上書きする場合:

```bash
flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co --dart-define=SUPABASE_ANON_KEY=eyJ...
```

## 構成

| パス | 説明 |
|------|------|
| `lib/config/supabase_config.dart` | Supabase URL/Key 設定 |
| `lib/main.dart` | エントリーポイント、Supabase 初期化 |
| `lib/app.dart` | アプリ本体、認証ゲート |
| `lib/screens/login_screen.dart` | ログイン画面（Web版 `app/login/page.tsx` を翻訳） |
| `lib/screens/home_screen.dart` | ホーム画面 |
| `lib/services/auth_service.dart` | Google/LINE OAuth 認証 |

## Deep Link

OAuth コールバック用に `com.hikone.kurashi://auth/callback` を設定済み。

- **Android**: `AndroidManifest.xml` の intent-filter
- **iOS**: `Info.plist` の CFBundleURLTypes

Supabase ダッシュボードの「Authentication > URL Configuration」に  
`com.hikone.kurashi://auth/callback` を Redirect URL として追加してください。

## 今後の実装予定

- [ ] 地図・レストラン検索（google_maps_flutter）
- [ ] 歩数計・ポイント（pedometer）
- [ ] 店舗一覧・地図表示の翻訳
