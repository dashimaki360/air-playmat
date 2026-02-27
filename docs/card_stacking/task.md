# カード重ね（スタック）機能

## Phase 1: データモデル
- [x] `Card` 型に `att?: string` フィールドを追加
- [x] `createMockCard` に `att` の初期値を追加

## Phase 2: ゲームロジック（useGameState）
- [x] `attachCard(cardId, targetCardId)` の実装
- [x] `detachCard(cardId, targetLoc)` の実装
- [x] `getAttachedCards(cardId)` の実装
- [x] `trashWithAttachments(cardId)` の実装
- [x] `moveCard` の拡張（付属カードも一緒に移動）
- [x] `getCardsByLocation` の修正（`att` 付きカードを除外）

## Phase 3: UI
- [x] `CardStack.tsx` 新規作成（ポケモン＋付属カードの表示）
- [x] `Card.tsx` に `isAttached` / `attachedCount` / スタック操作 props を追加
- [x] `CardMenu.tsx` に「つけたカードを見る」「はがす」「きぜつ」追加
- [x] `Board.tsx` の `handleDragEnd` 拡張（カードへのドロップ判定）
- [x] `Board.tsx` の Active/Bench 描画を `CardStack` に置き換え

## Phase 4: テスト・検証
- [x] ビルド確認（`tsc -b && vite build`）
- [x] 既存テスト全パス（`vitest run` — 5件）
- [ ] ブラウザで手動テスト（macOS でブラウザ自動テスト不可のためユーザー確認待ち）
