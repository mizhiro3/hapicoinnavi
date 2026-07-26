# はぴコイン使えるお店ナビ

ハピコインなどのコインを利用できる店舗を検索する静的サイトです。

## リポジトリ構成

```text
apps/site/                  GitHub Pages等で公開する静的サイト
  public/data/              生成済みの公開用JSON
tools/data-builder/         入力データの検証・公開用JSON生成ツール
  input/                    運用者が更新する元データ
  sources/                  取得元とクロール許可状態の設定
docs/spec.md                プロダクト仕様
```

Node.js 20以降を使用します。外部パッケージのインストールは不要です。

## データの更新

1. コイン一覧を参考サイトから更新する場合は、次のコマンドを実行します。

   ```sh
   npm run import:coins
   ```

   この処理は `https://shoplist.fukuappli.jp/` の「サイフ・ポイント選択」に現在掲載されている名称、掲載順、元サイト上の識別子とロゴURLを取得し、SVGアイコンを `apps/site/public/assets/coins/` へ保存して `tools/data-builder/input/coins.json` を更新します。SVGの形式・サイズ・危険な要素を検査し、取得に失敗した場合や識別子が重複した場合はコインJSONを上書きしません。

2. 必要に応じて `tools/data-builder/input/coins.json` と `stores.json` を更新します。
3. 次のコマンドで入力を検証し、公開用JSONを生成します。

   ```sh
   npm run build:data
   ```

4. `apps/site/public/data/coins.json` と `stores.json` の差分をレビューします。
5. 次のコマンドですべての検証を実行します。

   ```sh
   npm test
   ```

`npm run validate:data` は公開用ファイルを書き換えず、入力データの検証だけを行います。入力に不備がある場合は終了コード1となり、公開用ファイルは更新されません。

同梱データには、参考サイトの公開情報から取得した実在店舗4,733件が含まれます。
店舗名、住所、位置情報、電話番号、営業時間などが含まれるため、公開・再配布する前に、
取得元の最新の利用条件とデータ利用許諾を必ず確認してください。

## 外部サイトからの取得について

参考サイトの検索画面が使用している公開JSON APIから店舗情報を取得するクローラーを用意しています。通常は全店舗を一度だけ取得し、各店舗に含まれるサイフ・ポイント情報からコイン種類別のJSONへ分類します。

全コインを取得する場合:

```sh
npm run crawl:stores
```

取得状況は画面と `tools/data-builder/crawled/fukuappli/crawl.log` の両方へ時刻付きで出力されます。公開可能な店舗だけをアプリの入力JSONへ反映する場合は、完全取得時に次を実行します。

```sh
npm run crawl:stores -- \
  --write-input tools/data-builder/input/stores.json
npm run build:data
```

1種類だけ検索して取得する場合:

```sh
npm run crawl:stores -- --coin main-wallet
```

動作確認として最初の1ページだけ取得する場合:

```sh
npm run crawl:stores -- --max-pages 1 --output /tmp/hapicoin-crawl
```

結果は既定で `tools/data-builder/crawled/fukuappli/` に出力します。

```text
summary.json                 取得件数、ページ数、コイン別件数
stores.json                  重複を除いた全店舗
publishable-stores.json      必須項目を満たす公開用形式の店舗
by-coin/<coin-id>.json       コイン種類別の店舗
_pages/<条件>/<page>.json    途中再開用のページキャッシュ
crawl.log                    時刻付き進捗ログ
```

`--max-pages` を指定した結果は `summary.json` の `incomplete` が `true` となり、本番データとして使用できません。完全取得は約238リクエストとなるため、3秒以上の間隔を強制し、失敗時は保存済みページから再開します。最新のオプションは `npm run crawl:stores -- --help` で確認できます。

robots.txtでは公開APIの取得は禁止されていませんが、取得データを公開または再配布する前に、サイトの最新の利用条件、データの利用許諾、ロゴ・画像の権利、適切な連絡先を運用者が確認してください。ページキャッシュや取得結果には公開サイト上の情報が含まれるため、不要になったデータは適切に管理してください。

取得結果は出典を保持した中間JSONです。アプリへ公開する前に、住所分割、必須項目、コイン参照、緯度・経度、URL、公開可否を検証し、検証済みのレコードだけを `tools/data-builder/input/stores.json` へ反映してください。

## ライセンス

本リポジトリで独自に作成したソースコードは、[MIT License](./LICENSE)で公開します。

次のデータや素材はMIT Licenseの対象外です。それぞれの権利者が定める利用条件に従ってください。

- `apps/site/public/data/` および `tools/data-builder/input/` の店舗・コインデータ
- `apps/site/public/assets/coins/` の公式コインロゴ
- Material Symbols Rounded（ライセンスは `apps/site/public/assets/LICENSE-material-symbols.txt`）
