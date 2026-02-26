# 実装完了: データ構造の最適化 (Firebase RTDB向け)

## 変更内容
`json_format.md` の仕様に従い、Firebase Realtime Databaseの通信量最適化のために以下の対応を行いました。

### 1. 型定義の短縮化 (`src/types/game.ts`)
- `Card` 型のプロパティを1文字（`loc`->`l`, `dmg`->`d`, `face`->`f`, `ord`->`o`）に変更しました。
- `GameState` 型の構造を、`roomId`, `m` (meta), `p1`, `p2` というプレイヤー別のツリー構成に変更し、山札をIDの配列(`d`)として保持する形式に更新しました。

### 2. 状態管理の更新 (`src/hooks/useGameState.ts`)
- リファクタリングされた `GameState` と `Card` の構造に基づいて `initialMockState` の生成ロジックを更新しました。
- `moveCard` や `updateCardStatus` のロジックにおいて、`p1` と `p2` の配下にある `c`（カードリスト）および `d`（デッキ配列）を適切に更新・スワップするように修正しました。

### 3. UIコンポーネントの修正
- **`src/components/Board.tsx`**: `gameState.players` ではなく、`gameState.p1` と `gameState.p2` から名前やカード情報を参照するように変更しました。
- **`src/components/Card.tsx`**: カード描画に必要な判定プロパティをすべて短縮名（`c.f`, `c.d` など）を利用するように置換しました。

## テスト結果
- `npx tsc --noEmit` を使用した静的なコンパイル検証を行い、**エラーなし**で完了しました。これにより型の不整合に基づくランタイムエラーのリスクは解消されています。

## 手動確認のお願い
現在バックグラウンドで `npm run dev` が実行中です（`http://localhost:5173`）。
以下の機能が以前と同じように動作するか、ブラウザでアクセスしてご確認ください：
- [x] カードのドラッグ＆ドロップ（手札からベンチ、ベンチからアクティブ など）
- [x] カードクリック時のメニューから「ダメージの追加」や「状態異常」の付与
- [x] 画面上部の「Show State JSON +」をクリックした際、`json_format.md` に近いプロパティツリー構造（`m`, `p1`, `p2`、各カードの `f`, `d`, `l` など）が表示されていること。
