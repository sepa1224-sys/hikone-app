# Android Studio と Android SDK の設定ガイド

`flutter doctor` で「Android SDK がない」と表示される場合の手順です。

---

## 1. Android Studio をインストール

1. https://developer.android.com/studio にアクセス
2. **「Download Android Studio」** をクリックしてダウンロード
3. ダウンロードした `.exe` を実行
4. インストールウィザードに従い、**「Standard」** を選択して進める
5. **Android SDK**、**Android SDK Platform**、**Android Virtual Device** にチェックが入っていることを確認してインストール

---

## 2. Android SDK のパスを Flutter に教える

### 方法A: flutter doctor で自動設定（推奨）

1. **PowerShell** または **コマンドプロンプト** を開く
2. 次を実行:

   ```
   flutter doctor
   ```

3. 表示された **「[!] Android toolchain」** の行に、設定方法が書いてある場合があります
4. 次のコマンドで Android のライセンスに同意:

   ```
   flutter doctor --android-licenses
   ```

5. すべて **y** を入力して Enter

### 方法B: ANDROID_HOME を手動設定

1. **スタートメニュー** → 「環境変数」と入力 → **「システム環境変数を編集」**
2. **「環境変数(N)」** をクリック
3. **「新規」** でユーザー環境変数を追加:
   - 変数名: `ANDROID_HOME`
   - 変数値: `C:\Users\PC_User\AppData\Local\Android\Sdk`  
     （Android Studio のデフォルトインストール先）
4. **Path** を編集し、以下を追加:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`
5. **OK** で閉じる
6. **PowerShell を再起動** してから `flutter doctor` を再実行

---

## 3. 動作確認

```
flutter doctor
```

次のように表示されれば OK です:

```
[✓] Flutter (Channel stable, 3.x.x)
[✓] Android toolchain - develop for Android devices
[✓] Chrome - develop for the web
...
```

---

## 4. エミュレータで実行する場合

1. **Android Studio** を起動
2. **More Actions** → **Virtual Device Manager**
3. **Create Device** で仮想デバイスを作成（例: Pixel 6）
4. 作成したデバイスの **▶** をクリックしてエミュレータを起動
5. ターミナルで:

   ```
   cd native_app
   flutter run
   ```

---

## 5. 実機で実行する場合

1. スマートフォンの **開発者向けオプション** を有効化
2. **USB デバッグ** を有効化
3. USB ケーブルで PC に接続
4. `flutter devices` でデバイスが表示されることを確認
5. `flutter run` で実機にインストール
