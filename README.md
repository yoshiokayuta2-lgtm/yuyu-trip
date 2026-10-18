# ふたりの旅地図 — GitHub Pages + Supabase版

**最初にこのファイルを読んでください。** 今の旅地図の画面・機能を引き継ぎ、ChatGPTアカウントを使わず、ふたりそれぞれのメールアドレス＋パスワードで使える版です。

このZIPは**ソースコード一式**です。GitHub連携は不要で、自分でアップロードできます。現在のChatGPT上のアプリには変更を加えていません。公開するには、ご自身のSupabase設定とGitHub Pages設定が必要です。

## 入っている機能

- 47都道府県の白地図、観光・グルメ・お酒のヒント。
- 「初めて二人で旅した日」を入れると「行った」へ。地図・状態・旅の一覧が連動。
- ふたりの共有メモと、各人の行きたい／食べたいリスト。
- 各都道府県につき一人1枚のベストショット。ひとこと・拡大・ダウンロード・差し替え。
- Supabaseのメール＋パスワードでログイン。ChatGPTアカウントは不要。
- アプリを開いている間は約4秒ごとに同期。日付・状態・メモの変更は端末にも待機保存し、再接続後に同期。
- リストや写真の追加には通信が必要。失敗時は入力を残す。
- 他人のリストや写真は閲覧でき、自分の投稿だけ編集できる。
- パスワード変更、ログアウト、旧アプリのバックアップ読み込み。

## 必要なもの

1. ご自身のGitHubアカウントと新しいリポジトリ。
2. ご自身のSupabaseプロジェクト。専用の新規プロジェクトを推奨します。
3. ふたりそれぞれのメールアドレスと、別々のパスワード。

GitHub Pagesのログイン画面やHTML/CSS/JavaScriptは公開されます。**旅の記録と写真はGitHubには保存せず、Supabaseで利用許可したアカウントだけが読めます。** 公開コードを見ただけではアクセスできないよう、データベースと写真の両方に権限制御を設定します。

GitHub FreeでPagesを使う場合、通常は公開リポジトリが必要です。非公開リポジトリからのPages利用は対象プランが必要です。コード自体も非公開にしたい場合は、GitHubの非公開リポジトリと、別の静的ホスティングの組み合わせも選べます。

## 1. Supabaseでテーブルと写真保存先を作る

1. Supabaseプロジェクトを開く。
2. SQL Editorで `supabase/01_setup.sql` の内容を実行する。
3. `ft_members` / `ft_fields` / `ft_wishes` / `ft_shots` が作成されたことを確認する。
4. Storageに `futari-bestshots` が作られ、**Private** になっていることを確認する。

SQLには、RLS・投稿者制限・型チェック・更新競合を検出するrevision・写真の5MB上限を含めています。既存の別テーブルは変更しません。`ft_*` はこのアプリ専用にしてください。

## 2. ふたりのログインアカウントを作る

1. Supabaseの Authentication → Users からユーザーを2人作る。
2. メールアドレスと初期パスワードをそれぞれ設定する。**メール確認済み（confirmed）のユーザー**として作成する。
3. パスワードは12文字以上を推奨。ログイン後、アプリ右上の名前から変更できます。
4. `supabase/02_members.sql` の **SQL Editorに貼るコピーだけ**を編集する。
   - `YUTA_EMAIL_HERE` → ゆうたの登録アドレス
   - `YUKO_EMAIL_HERE` → ゆうこの登録アドレス
5. 編集したSQLをSQL Editorで実行する。
6. `ft_members` に2人だけが載っていることを確認する。

編集したメール入りSQLやパスワードをGitHubには上げないでください。ZIPにあるSQLファイルはプレースホルダーのままアップロードして構いません。

アプリに新規登録画面はありません。Supabase側でも「Allow new users to sign up」をオフにしてください。仮に他人がAuthアカウントを作れても、`ft_members` に入っていなければRLSで記録・写真へのアクセスを拒否します。

この版はメール送信を使わないパスワードログインです。パスワードを忘れた場合は、管理者がSupabase側で変更してください。メールによる再設定フローは含めていません。したがって初期運用でSMTP設定は不要です。

## 3. SupabaseのURLと公開用キーを控える

Supabaseのプロジェクト設定から次の2つを控えてください。

- Project URL：`https://xxxxx.supabase.co`
- **Publishable key**：`sb_publishable_...`

従来の **anon public key** も使えます。**`service_role` / `sb_secret_...` は絶対に使わないでください。** このアプリの接続値はブラウザへ配信するため、公開可能なキーだけを使います。ビルド時にも誤った秘密キーを拒否します。

## 4. GitHubにアップロードする

1. 新しいリポジトリを作成し、デフォルトブランチを `main` にする。
2. ZIPを解凍し、**解凍したフォルダの中身をリポジトリのルートに**アップロードする。
   - ルートに `package.json` と `index.html` がある状態。
   - `.github/workflows/deploy.yml` も必須。隠しフォルダがアップロード対象から漏れないよう確認する。
   - 見つけにくい場合はGitHubの「Add file → Create new file」で `.github/workflows/deploy.yml` という名前を指定し、同梱ファイルの内容を貼り付けても構いません。
3. `node_modules`、`dist`、バックアップJSON、写真、`.env.local` はアップロードしない。このZIPにも入っていません。

## 5. GitHub Pagesの接続値を設定する

リポジトリの Settings → Secrets and variables → Actions → **Variables** に以下を作成します。

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | SupabaseのProject URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key または従来のanon public key |

この2つは公開用の値です。秘密キーは不要です。ファイルに直接書かず、Variablesへ設定してください。

## 6. 公開する

1. リポジトリ Settings → Pages → Source を **GitHub Actions** にする。
2. Actions → **Deploy travel map** → Run workflow を実行する。
3. テスト・ビルド・公開が完了したら、Pagesに表示されたURLを開く。
4. Supabase AuthenticationのURL設定にある **Site URL** をその公開URLに合わせる。プロジェクト型のPagesなら末尾のリポジトリ名も含める。
5. ゆうたのメール＋パスワードでログインする。
6. 別ブラウザ／別端末でゆうこがログインし、地図・メモ・投稿が共有されることを確認する。

相対パスを使っているため、`https://USER.github.io/REPO/` の形式にも対応します。Cloudflare PagesやNetlifyなどへ静的ビルド `dist` を出す場合も、同じ2つの環境変数・`npm ci && npm run build`・出力 `dist` で構成できます。

## 7. 今の旅地図からデータを移す

### 日付・チェック・メモだけなら

1. 前のアプリの「バックアップ」からJSONをダウンロードする。
2. 新しいアプリでログインし、右上の名前 → **前のアプリから記録を移す**。
3. JSONを選び「旅の状態・日付・メモも引き継ぐ」をオンにして実行する。
4. すでに保存されているフィールドは上書きせず、そのまま残す。

### リスト・写真もまとめて移すなら

1. PCのChromeなどで**前のアプリ**を開き、今までのChatGPTアカウントでログインする。
2. 同梱 `scripts/export-current-app.js` をテキストエディターで開く。
3. 前のアプリのページで開発者ツールのConsoleを開き、ファイルの内容を実行する。
4. `futari-tabi-private.migration.json` がダウンロードされる。記録・リスト・写真をこのPCへ保存する処理で、別のサービスへは送信しない。
5. **このファイルは個人データそのものです。GitHubへは絶対にアップロードしないでください。**
6. 新アプリでゆうたがログインし、右上の名前 →「前のアプリから記録を移す」でそのJSONを選ぶ。
7. 「このアカウントに引き継ぐ投稿者」で、旧アプリのゆうたに当たる投稿者を選ぶ。自動では推測しないので、リスト件数や写真を見て確認する。
8. 共有記録のチェックをオンにして実行する。
9. ゆうこも自分の新アカウントでログインし、同じファイルから**ゆうこに当たる投稿者**を選んで実行する。
10. 共有記録は既存のものを上書きしない。個人リスト・写真は、選んだ旧投稿者の分だけ現在のログイン名で引き継ぐ。
11. 旧アプリに同じ人の複数アカウントがある場合は、その投稿者を1つずつ選んで追加できる。
12. 移行後に新アプリを再読み込みし、内容を確認する。旧アプリは確認が済むまで残す。

途中で通信が切れても保存できた分は残ります。再実行時、既存の写真や共有記録は上書きしません。同じ県にすでに自分の写真がある場合、旧写真はスキップします。旧アプリのメール／ChatGPTアカウント／ログイン情報は新アプリに移しません。

## ローカルで確認する場合

Node.js 22以上で実行します。

```sh
npm ci
cp .env.example .env.local
# .env.local の2つの値を自分のSupabaseへ変更する
npm run dev
```

PowerShell等では`.env.example`をエクスプローラーなどでコピーして`.env.local`にしても構いません。

```sh
npm test
npm run build
npm run preview
```

`.env.local`はGit管理対象外です。ソースにパスワードや秘密キーを書く必要はありません。

## 検証したこと／残る確認

- 実際のPostgreSQL（PGlite）で、全SQLの構文、メンバー制限、他人の投稿の更新・削除拒否、Storage方針、日付と状態の型チェック、競合検出を検証済み。
- アプリのSupabase用アダプターを同じPostgreSQLへつなぎ、2アカウントの同期・リスト・写真の差し替え／削除・移行データ変換を検証済み。Storage APIはモック。
- 設定値を与えた本番ビルドに成功。GitHub Pages用ワークフローとlockfileを同梱。
- **実際のあなたのSupabase、GitHub Pages、スマホでのログイン・写真アップロードは未検証**です。URLとキーを設定してから2人の端末で確認してください。

## 運用メモ

- データと写真を守るのはSupabaseのRLSです。`ft_members`の登録者とStorageのPrivate設定を保ってください。
- 写真の表示には5分間だけ有効な署名URLを使います。メンバー削除後も、すでに発行済みのリンクは最大5分間有効なことがあります。
- 旅メモ等のJSONバックアップには個人データが入ります。コード用リポジトリとは分けて保管してください。
- アカウントごとに端末内キャッシュを分けています。共有端末では使い終わったらログアウトしてください。
- Supabaseの料金・容量・停止条件などは利用プランによります。写真枚数は「47県 × 各人1枚」が基本です。

## 主なファイル

- `index.html` / `src/app.css` / `public/*`：旅地図の画面
- `src/main.js`：ログイン・アカウント・アプリ起動
- `src/backend.js`：Supabaseのデータ・写真アダプター
- `src/migration.js`：前のアプリの記録読み込み
- `supabase/01_setup.sql`：テーブル・権限制御・写真保存先
- `supabase/02_members.sql`：利用するふたりの登録
- `scripts/export-current-app.js`：前のアプリのデータ書き出し
- `.github/workflows/deploy.yml`：GitHub Pagesへの公開

公式資料：
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
