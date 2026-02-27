# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
npm run dev        # 開発サーバー起動 (Vite HMR)
npm run build      # TypeScript型チェック + Viteビルド
npm run lint       # ESLint実行
npm run test       # Vitest（全テスト）

# 特定のテストファイルのみ実行
npx vitest src/hooks/useGameState.test.ts
npx vitest src/components/CardStack.test.ts
```

## アーキテクチャ概要

**air-playmat** はポケモンTCGのデジタル対戦用プレイマットアプリ。React + TypeScript + Vite で構成。

### 状態管理

- `src/hooks/useGameState.ts` がゲーム状態の唯一の管理元
- `GameState` → `p1: PlayerState` / `p2: PlayerState` の2プレイヤー構造
- `PlayerState.c: Record<string, Card>` が全カードを持つ（フィールド・手札・山札すべて）
- `PlayerState.d: string[]` は山札の順序管理用ID配列（末尾が山札の一番上）
- すべてのstate更新は `setGameState` に純粋関数を渡すイミュータブルパターン

### Cardの短縮フィールド名

Firebase通信量削減のため物理キー名を短縮している：
- `tId` = templateId（カード画像・名前のマスターID）
- `f` = isFaceUp（表向きか）
- `d` = damageCounters
- `cnd` = statusConditions（`CardStatusCondition[]`）
- `l` = location（カードの現在地）
- `o` = order / zIndex
- `att` = attachedTo（進化元・エネルギー/道具の付け先カードID）

### カード位置（location）の命名規則

`{playerId}-{area}` 形式: `p1-active`, `p2-hand`, `p1-bench`, `p2-deck`, `stadium`（スタジアムのみプレイヤープレフィックスなし）

### プレイヤーIDの二重表現

- ゲーム状態内: `"p1"` / `"p2"`
- UI/DnDデータ内（`DraggableItemData.playerId`）: `"player-1"` / `"player-2"`
- `Board.tsx` の変換: `playerId === 'player-1' ? 'p1' : 'p2'`

### カードのスタック構造（進化・エネルギー付与）

`att` フィールドで親子関係を形成：
- ドラッグでカードの上にカードをドロップ → `attachCard()` で `att` を設定
- `getCardsByLocation()` は `att` が設定されているカード（付属カード）を除外して返す
- `CardStack` コンポーネントがbaseCard + 付属カードを1つのビジュアルスタックとして表示
- `buildEvolutionChain()` が進化チェーンを辿り最上位進化カードを特定
- エネルギー・道具は上方向にずらして表示、進化元は非表示

### ドラッグ＆ドロップ（dnd-kit）

- `DndContext` / `DragOverlay` は `Board.tsx` で一元管理
- ドロップ先は2種類：
  - `DroppableArea` (`type: 'area'`): deck, hand, bench, active, prize, trash, stadium
  - `CardStack` 内の `useDroppable` (`type: 'card'`): カードへのカード重ね置き
- `handleDragEnd` でドロップ先タイプを判定し `attachCard` または `moveCard` を呼び分け

### Vercel APIエンドポイント

`api/getDeck.ts` はサーバーレス関数。`?code={deckCode}` でポケモンカード公式サイトからデッキリストをスクレイピングして返す。スクレイピングロジックは `src/lib/pokemon-tcg/deck-scraper.ts`。

### テスト

テストファイルはソースファイルと同階層に配置（`*.test.ts` / `*.test.tsx`）。vitest + jsdom環境。`vitest.setup.ts`（プロジェクトルート）でセットアップ。
