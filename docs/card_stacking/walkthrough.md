# カード重ね（スタック）機能 — 完了レポート

## 変更概要

ポケモンカードの「進化」「エネルギー付与」「道具付与」を再現するカード重ね機能を実装。

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| [game.ts](file:///Users/takuyay/Documents/air-playmat/src/types/game.ts) | `Card` 型に `att?: string` フィールド追加 |
| [useGameState.ts](file:///Users/takuyay/Documents/air-playmat/src/hooks/useGameState.ts) | `attachCard`, `detachCard`, `getAttachedCards`, `trashWithAttachments` 追加、`moveCard`/`getCardsByLocation` 拡張 |
| [CardStack.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/CardStack.tsx) | **新規** — ポケモン＋付属カードのスタック表示 |
| [Card.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/Card.tsx) | `isAttached`, `attachedCount`, スタック操作 props 追加 |
| [CardMenu.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/CardMenu.tsx) | 「つけたカード一覧」「はがす」「きぜつ」メニュー追加 |
| [Board.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/Board.tsx) | カードへのドロップ判定、Active/Bench を `CardStack` で描画 |

## 検証結果

- ✅ TypeScript ビルド成功
- ✅ Vite プロダクションビルド成功
- ✅ 既存テスト 5件 全パス（`vitest run`）
- ⚠️ ブラウザ自動テストは macOS 制約で実行不可 → **手動テスト推奨**

## 手動テスト手順

`http://localhost:5173` をブラウザで開き、以下を確認：

1. **カードを重ねる**: 手札のカードを Active/Bench のポケモンの上にドラッグ＆ドロップ
2. **スタック表示**: 付属カードがポケモンの上方向にずれて表示されること
3. **バッジ表示**: ポケモンカードに `+N` バッジが表示されること
4. **メニュー**: ポケモンクリック → 「つけたカード」「きぜつ」ボタンが表示されること
5. **はがす**: 「つけたカード」展開 → 「はがす」で手札に戻ること
6. **きぜつ**: 「きぜつ」でポケモンと付属カード全てがトラッシュに移動すること
7. **移動**: Active ↔ Bench 間の移動で付属カードも一緒に動くこと
