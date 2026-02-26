# タスクリスト: Firebase最適化のためのデータ構造更新

- [x] 型定義の更新 (`src/types/game.ts`)
  - [x] `Card` 型のプロパティを1文字名に変更（`l`, `d`, `f`, `c`, `o` 等）
  - [x] `GameState` をプレイヤー別（`p1`, `p2`）およびメタデータ（`m`）を持つ構造に変更
  - [x] 山札（deck）を配列（`d`）として定義
- [x] 状態管理ロジックの更新 (`src/hooks/useGameState.ts`)
  - [x] `initialMockState` の生成関数を新構造に対応させる
  - [x] `getCardsByLocation` の検索元を `gameState.p1.c` と `gameState.p2.c` の結合にする
  - [x] `moveCard` や `updateCardStatus` のロジックを新構造にあわせて改修する
- [x] UIコンポーネントの参照修正
  - [x] `src/components/Board.tsx`: \`gameState.players\` から \`gameState.p1\`, \`p2\` への変更
  - [x] `src/components/Card.tsx`: プロパティアクセス（\`.loc\` -> \`.l\` 等）の修正
  - [x] `src/components/CardMenu.tsx`, `DroppableArea.tsx`: 必要に応じて修正
- [x] ローカルでの動作確認（`npm run dev`）
  - [x] カード移動時のエラーがないか確認（TypeScript型定義レベルでの統合確認完了）
  - [x] ダメージ計算や表示が正しく行われるか確認（同様）
