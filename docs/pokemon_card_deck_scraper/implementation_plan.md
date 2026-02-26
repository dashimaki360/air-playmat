# ポケモンカード デッキスクレイピング API 実装計画

## ゴール
ポケモンカード公式のデッキ作成ツール（pokemon-card.com）のデッキコードから、該当デッキのカードリストを抽出してJSON形式で返すAPIを実装する。
Vercelへのデプロイを前提とし、フロントエンド（React/Vite）から独立したAPIエンドポイントとして構成する。

## ユーザーレビューが必要な項目
特にありませんが、以下の技術選定と構成で問題ないかご確認をお願いします：
- **HTMLパースライブラリ**: `cheerio` を追加します。
- **デプロイ環境**: `api/` ディレクトリ配下にVercel Serverless Functions用のエンドポイント（`api/getDeck.ts`）を作成します。（現在Vite環境のため、ローカルでのAPIテストはVercel CLI、または専用のテストスクリプトを用います）

## 提案する変更

### パッケージ依存関係
#### [MODIFY] package.json
- `cheerio` を dependencies に追加
- `@vercel/node` を devDependencies に追加（型定義・Vercel APIのローカル開発用）
- **テスト用**: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` を devDependencies に追加
- `scripts` に `"test": "vitest"` を追加

### スクレイピング機能（独立モジュール）
#### [NEW] src/lib/pokemon-tcg/deck-scraper.ts
- ポケモンカード公式のURL（`https://www.pokemon-card.com/deck/deck.html?deckID={deckCode}`）をfetchで取得。
- `cheerio` を使ってHTMLをパースし、必要なカード情報（ID、名前、枚数、画像URLなど）を抽出して配列として返す独立した関数 `getDeckList(deckCode)` を実装。

### APIエンドポイント（Vercel Functions）
#### [NEW] api/getDeck.ts
- `?code={deckCode}` を受け取り、上記の `getDeckList` を呼び出す。
- 取得したカードリストをJSONフォーマットでフロントエンド（または任意のクライアント）に返却する。

### テストの設定とスクリプト
#### [NEW] vite.config.ts (更新) または vitest.config.ts
- Vitestのテスト環境として `jsdom` を設定。
#### [NEW] src/lib/pokemon-tcg/deck-scraper.test.ts
- `deck-scraper.ts` の単体テスト。Vitestを使用して、特定のHTMLモックデータまたは実データ（外部アクセス）に対して正しい結果が返るか検証します。

## 検証計画

### 自動テスト (Vitest)
- `npm run test` コマンドでテストを実行します。
- `deck-scraper.ts` に実装したスクレイピング関数の返り値が期待通りの形式と内容になっているかをアサートします。

### 手動検証
- 開発後に `npm install -g ts-node` などを利用して、`npx tsx scripts/test-scraper.ts <適当なデッキコード>` を実行します。
- コンソールに想定通りの各種カードデータ（名前・枚数などの配列）が出力されるかを確認します。
- （可能であれば）Vercel CLI (`vercel dev`) を使って `http://localhost:3000/api/getDeck?code=<デッキコード>` にアクセスし、JSONレスポンスが返ることを確認します。
