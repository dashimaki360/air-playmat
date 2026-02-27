# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## コマンド

```bash
npm run dev        # 開発サーバー起動 (Vite HMR)
npm run build      # TypeScript型チェック + Viteビルド
npm run lint       # ESLint実行
npm run test       # Vitest（全テスト）
npm run test -- --coverage  # カバレッジ付きテスト実行

# 特定のテストファイルのみ実行
npx vitest src/hooks/useGameState.test.ts
npx vitest src/components/CardStack.test.ts
npx vitest src/components/Card.test.tsx
npx vitest src/components/CardMenu.test.tsx
```

## アーキテクチャ概要

**air-playmat** はポケモンTCGのデジタル対戦用プレイマットアプリ。React 19 + TypeScript + Vite + Tailwind CSS v4 で構成。デプロイは Vercel。

### ファイル構成

```
src/
├── types/game.ts              # 全型定義
├── hooks/useGameState.ts      # ゲーム状態の唯一の管理元
├── components/
│   ├── Board.tsx              # メインレイアウト・DnDコンテキスト管理
│   ├── Card.tsx               # 個別カード（ドラッグ・メニュー）
│   ├── CardStack.tsx          # ポケモン+付属カードのスタック表示
│   ├── CardMenu.tsx           # カードクリック時の操作メニュー（portal描画）
│   └── DroppableArea.tsx      # ドロップ可能エリア
├── lib/pokemon-tcg/
│   └── deck-scraper.ts        # 公式サイトスクレイピング
└── data/defaultDeck.json      # デフォルトデッキ（60枚）
api/getDeck.ts                 # Vercelサーバーレス関数
```

### 型定義（src/types/game.ts）

```typescript
type CardStatusCondition = 'poison' | 'burn' | 'asleep' | 'paralyzed' | 'confused';
type CardType = 'pokemon' | 'item' | 'pokemon-tool' | 'supporter' | 'stadium' | 'energy' | 'technical-machine';
type AreaId = 'deck' | 'hand' | 'trash' | 'active' | 'bench' | 'prize' | 'stadium';

type Card = {
  id: string; tId: string; f: boolean; d: number; cnd: CardStatusCondition[];
  l: string; o: number; att?: string; tp?: CardType; name?: string; imageUrl?: string;
};
type PlayerState = { n: string; d: string[]; c: Record<string, Card>; };
type GameState = { roomId: string; m: { t: string; s: string; a: string; }; p1: PlayerState; p2: PlayerState; };
type DraggableItemData = { type: 'card'; card: Card; sourceArea: AreaId; playerId: string; index?: number; stackBaseCardId?: string; };
```

### Cardの短縮フィールド名（Firebase通信量削減）

| フィールド | 意味 |
|---|---|
| `tId` | templateId（カード画像・名前のマスターID）|
| `f` | isFaceUp（表向きか）|
| `d` | damageCounters |
| `cnd` | statusConditions（CardStatusCondition[]）|
| `l` | location（現在地）|
| `o` | order / zIndex |
| `att` | attachedTo（付け先カードID）|
| `tp` | CardType |

### カード位置（location）の命名規則

`{playerId}-{area}` 形式: `p1-active`, `p2-hand`, `p1-bench`, `p2-deck`, `p1-prize`, `p1-trash`
スタジアムのみ例外: `stadium`（プレイヤープレフィックスなし）

### プレイヤーIDの二重表現

- ゲーム状態内: `"p1"` / `"p2"`
- UI/DnDデータ内（`DraggableItemData.playerId`）: `"player-1"` / `"player-2"`
- `Board.tsx` の変換: `playerId === 'player-1' ? 'p1' : 'p2'`

### 状態管理（useGameState.ts）

- `GameState` → `p1: PlayerState` / `p2: PlayerState` の2プレイヤー構造
- `PlayerState.c: Record<string, Card>` が全カードを持つ（フィールド・手札・山札すべて）
- `PlayerState.d: string[]` は山札の順序管理用ID配列（**末尾が山札の一番上**）
- すべてのstate更新は `setGameState(prev => ...)` に純粋関数を渡すイミュータブルパターン

**エクスポートされる関数一覧:**

| 関数 | 説明 |
|---|---|
| `getCardsByLocation(loc)` | 指定位置のカード一覧（`att`付き除外・`o`順ソート）|
| `getAttachedCards(cardId)` | 指定カードに付属する全カードを再帰取得 |
| `moveCard(cardId, src, dst, index?)` | カード移動。active移動時はスワップ、trash/deck/hand移動時はスタック解消 |
| `attachCard(cardId, targetCardId)` | 進化・エネルギー・道具付与（`att`を設定）|
| `detachCard(cardId, targetLoc)` | スタックを外して指定位置に移動 |
| `trashWithAttachments(cardId)` | きぜつ処理（付属カード含め全トラッシュ・ダメージ/ステータスリセット）|
| `updateCardStatus(cardId, updater)` | ダメージ・ステータス異常の更新 |
| `drawCard(playerId)` | 山札の一番上（d配列末尾）を手札へ |
| `shuffleDeck(playerId)` | 山札シャッフル |
| `returnToDeck(cardId, bottom?)` | 手札を山札へ戻す（`bottom=true`で一番下）|
| `returnAllHandToDeck(playerId)` | 手札全てを山札へ戻す |

### カードのスタック構造（進化・エネルギー付与）

`att` フィールドで親子関係を形成:
- `attachCard()` で `att` を設定 → ドロップで自動呼び出し
- `getCardsByLocation()` は `att` が設定されたカード（付属カード）を除外して返す
- `CardStack` コンポーネントがbaseCard + 付属カードを1つのビジュアルスタックとして表示
- `buildEvolutionChain()` が進化チェーン（tp=pokemon かつ att チェーン）を辿り最上位進化カードを特定
- エネルギー・道具は上方向にずらして表示、進化元は非表示（最上位進化のみ表示）
- スタックをトラッシュ・山札・手札に移動するとスタック解消（`att` がクリアされ個別カードに戻る）

### ドラッグ＆ドロップ（dnd-kit）

- `DndContext` / `DragOverlay` は `Board.tsx` で一元管理
- ドロップ先は2種類:
  - `DroppableArea` (`type: 'area'`): `{playerId}-{areaId}` をIDとして登録
  - `CardStack` 内の `useDroppable` (`type: 'card'`): `card-drop-{cardId}` をIDとして登録
- `handleDragEnd` のロジック:
  1. `over.type === 'card'` → `attachCard()` でカードに重ねる
  2. `over.type === 'area'` → `moveCard()` でエリアに移動（スタックの場合は `stackBaseCardId` を使用）

### CardMenuの表示制御

`CardMenu` は **active / bench エリアのみ** 表示される（hand / prize / trash / deck では非表示）。
portal（`createPortal`）で `document.body` 直下に固定描画し、他カードのstacking contextの影響を受けない。

| エリア | ダメージ操作 | 状態異常 | スタック操作（きぜつ・はがす）|
|---|---|---|---|
| active | ✓ | ✓ | ✓ |
| bench | ✓ | ✗ | ✓ |
| それ以外 | — | — | — |

### ゲーム初期化

`defaultDeck.json`（60枚）から各プレイヤーの初期状態を生成:
- Active: 1枚（`f=true`）
- Hand: 7枚（`f=true`）
- Prize: 6枚（`f=false`）
- Deck: 46枚（`f=false`、`d` 配列で順序管理）

### Vercel APIエンドポイント

`api/getDeck.ts` はサーバーレス関数。`GET /api/getDeck?code={deckCode}` でポケモンカード公式サイトからデッキリストをスクレイピングして返す（キャッシュ: s-maxage=3600）。スクレイピングロジックは `src/lib/pokemon-tcg/deck-scraper.ts`。

### テスト

テストファイルはソースファイルと同階層に配置（`*.test.ts` / `*.test.tsx`）。vitest + jsdom環境。`vitest.setup.ts`（プロジェクトルート）でセットアップ（`@dnd-kit/core` のグローバルモックを含む）。カバレッジは `@vitest/coverage-v8` で計測。

現在のカバレッジ（目安）: 全体 Statements 87%、Functions 85%、Branch 69%
