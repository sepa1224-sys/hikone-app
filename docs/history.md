
2026-02-12: ドキュメント管理基盤の構築と銀行口座設定の適正化

**概要**:
プロジェクトの長期的な保守性と開発効率を向上させるため、ドキュメント駆動開発（Documentation Driven Development）への移行を開始。仕様書（Specs）と意思決定記録（ADR）の格納場所を整備し、現状のコードベースに基づいた正確な仕様をドキュメント化した。また、銀行口座設定画面におけるテストデータの排除とDB実データ連携を完了させた。
さらに、`package.json` の `type: module` 設定に合わせて設定ファイルを ES Module 形式に統一し、起動エラーを解消した。

**変更点**:
- **ドキュメント整備**:
    - `docs/specs/`: 仕様書ディレクトリ作成。
        - `payout.md`: 振込申請フロー、ステータス遷移、個人ID紐付けの仕様。
        - `menu.md`: メニュー画像保存、Storage構成、マップ表示ロジック。
        - `bank-settings.md`: 口座情報のデータ構造、Owner IDによる一意性担保。
    - `docs/adr/`: 意思決定記録ディレクトリ作成。
        - `001-identity-unification.md`: 店舗IDではなく個人ID（Owner ID）を金銭情報の主軸とする設計判断を記録。
- **機能修正**:
    - `app/shop/settings/page.tsx` (銀行口座設定):
        - 初期値のハードコード（testBank等）が完全に排除されていることを確認。
        - `getShopSettings` から取得した `shop_bank_details` の値をフォーム初期値として正しくセットするロジックを検証済み。
        - DBにデータがない場合は空欄となり、ユーザー入力を受け付ける状態であることを確認。
    - **設定ファイルのESM化**:
        - `next.config.js`: `module.exports` → `export default`
        - `postcss.config.js`: `module.exports` → `export default`
        - `tailwind.config.js`: `module.exports` → `export default`

**技術的負債の解消**:
- 金銭関連データの紐付け先（Shop ID vs Owner ID）の曖昧さを仕様書およびADRで明確に定義し、今後の実装における指針を確立した。

2026-02-13: デジタルスタンプカード機能の実装とセキュリティ修正

**概要**:
`docs/specs/stamp-cards.md` の仕様に基づき、ユーザー向けのデジタルスタンプカード画面一式を実装した。
実施店一覧から、スタンプカード詳細、そしてQRスキャン（位置情報チェック含む）までの導線を確立した。
また、店舗側でスタンプカード設定が保存できない問題を調査し、RLSポリシーの不備を修正した。

**変更点**:
- **新規ページ実装**:
    - `app/stamp/shops/page.tsx`: スタンプカード実施店舗の一覧表示。
    - `app/stamp/card/[shopId]/page.tsx`: スタンプカード詳細画面。現在のスタンプ数、特典までの残り、スタンプ履歴（グリッド表示）を実装。
    - `app/stamp/scan/page.tsx` (改修): `?shopId=...` クエリパラメータに対応し、店舗詳細やリストから遷移した場合に、QRコードをスキャンせずに「現在地チェック」のみでスタンプを押せるモードを追加。
- **Server Actions拡充**:
    - `lib/actions/stamp.ts`: `getStampShops`, `getStampCard` 等のデータ取得関数を追加。また、`updateStampCardSettings` にデバッグログを追加し、ID不整合の調査を容易にした。
- **セキュリティ修正 (RLS)**:
    - `supabase/migrations/20260213120000_fix_stamp_cards_rls.sql`: `stamp_cards` テーブルに対し、店舗オーナーが自身のカード設定を作成・更新できるようにするRLSポリシーを追加。
- **データ構造の再定義 (ADR/Spec)**:
    - `docs/adr/002-stamp-card-structure.md`: スタンプカードのデータ構造を3層（Shop → Template → UserCard）に分離する方針を策定。
    - `docs/specs/stamp-cards.md`: `user_stamps` をログから「ユーザー所持状態」テーブルへ再定義し、履歴は `stamp_logs` へ分離することを明文化。

2026-02-13 (Continued): スタンプカード3層構造（Template/User/Log）の実装

**概要**:
ADR-002に基づき、スタンプカードのデータ構造を「店舗設定(stamp_cards)」「ユーザー所持(user_stamps)」「履歴ログ(stamp_logs)」の3層構造に移行する実装を行った。
これにより、スタンプ数の集計コストを削減し、状態管理と履歴記録を明確に分離した。

**変更点**:
- **DBマイグレーション**:
    - `supabase/migrations/20260213130000_implement_stamp_card_structure.sql`: 旧テーブル構成を刷新し、3層構造のテーブル定義とRLSポリシーを作成。
- **Server Actions改修**:
    - `lib/actions/stamp.ts`:
        - `grantStamp`: スタンプ付与時に `user_stamps` のカウントアップと `stamp_logs` への履歴追加をトランザクション的に実行（コード上は順次実行だが整合性を意識）。
        - `registerStampCard`: ユーザーが明示的にカードを使用開始（登録）する機能を追加。
        - `getMyStampCards` (alias `getMyActiveStampCards`): `user_stamps` テーブルから直接所持カード一覧を取得するように変更。
        - `getAvailableStampCards`: 未登録のスタンプカード一覧を取得する機能を追加（`user_stamps` との差分取得）。
- **UI実装**:
    - `app/stamp/cards/page.tsx`: スタンプカード一覧画面をリニューアル。「マイカード」と「新しいカードを探す」の2セクション構成とし、その場で利用開始登録ができるようにした。
- **バグ修正**:
    - `lib/actions/stamp.ts`: `getAvailableStampCards` 内で `shops` テーブルの `category` カラムを取得しようとしてエラーが発生していたため、クエリから除外（UI側でデフォルト値を表示するように対応済み）。
    - 取得条件の検証: ユーザーが所持していないカードを正しく抽出できることをスクリプト (`scripts/debug_stamp_query.ts`) で確認済み。
- **仕様書更新**:
    - `docs/specs/stamp-cards.md`: マイカード一覧とスタンプ付与のロジックを新データ構造に合わせて更新。

**次のステップ**:
- 作成したマイグレーションSQLの適用。
- 実環境での動作検証（検証用スクリプト `scripts/verify_stamp_system.ts` を用意済み）。

2026-02-13 (Continued): Suspense境界の強制的な物理分離によるビルドエラーの完全解消

**概要**:
`npm run build` 実行時に `useSearchParams()` に起因するプリレンダリングエラー（Missing Suspense with CSR Bailout）が再発したため、Next.js の推奨構成に基づき、ロジックを別ファイル（`*Content.tsx`）へ物理的に分離し、Page コンポーネントを純粋な Suspense 境界とする構成に刷新した。

**変更点**:
- **app/shop/stamp/ (店舗側スタンプ設定)**:
    - `ShopStampContent.tsx`: `useSearchParams` を含むすべてのロジックをこのファイルへ移動。
    - `page.tsx`: ロジックを一切持たず、`ShopStampContent` を `Suspense` でラップしてエクスポートするだけの構成に変更。
- **app/stamp/scan/ (スタンプスキャン)**:
    - `ScanContent.tsx`: `useSearchParams` を含むすべてのロジックをこのファイルへ移動。
    - `page.tsx`: 同様に、`ScanContent` を `Suspense` でラップする構成に変更。

**検証**:
- `npm run build` を実行し、静的解析およびプリレンダリングフェーズをエラーなく通過することを確認済み。
