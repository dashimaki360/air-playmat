# air-playmat メモリ

## 概要
- **アプリ**: ポケモンTCGのデジタル対戦用プレイマットアプリ
- **スタック**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Vercel

## コマンド集
```bash
npm run dev        # 開発サーバー（Vite HMR）
npm run build      # TypeScript型チェック + ビルド
npm run lint       # ESLint
npm run test       # Vitest全テスト
npm run test -- --coverage  # カバレッジ付き
npx vitest <ファイル>  # 特定テスト実行
```

## ファイル構成
```
src/
├── types/game.ts              # 全型定義
├── hooks/
│   ├── useGameState.ts        # ゲーム状態管理（唯一の管理元）
│   └── useGameLog.ts          # ゲームログ管理（操作履歴）
├── components/
│   ├── Board.tsx              # メインレイアウト + DnDコンテキスト
│   ├── Card.tsx               # 個別カード
│   ├── CardStack.tsx          # ポケモン+付属カードのスタック
│   ├── CardMenu.tsx           # カード操作メニュー（portal）
│   ├── CardListModal.tsx      # 汎用カードリストモーダル（アクション付き）
│   ├── CoinToss.tsx           # コイントス（表/裏ランダム判定）
│   ├── GameLog.tsx            # ゲームログ表示パネル
│   └── DroppableArea.tsx      # ドロップ可能エリア
├── lib/pokemon-tcg/deck-scraper.ts  # デッキスクレイピング
└── data/defaultDeck.json      # デフォルトデッキ（60枚）
api/getDeck.ts                 # Vercel サーバーレス
```

## 型定義（game.ts）
```typescript
type CardStatusCondition = 'poison' | 'burn' | 'asleep' | 'paralyzed' | 'confused';
type CardType = 'pokemon' | 'item' | 'pokemon-tool' | 'supporter' | 'stadium' | 'energy' | 'technical-machine';
type AreaId = 'deck' | 'hand' | 'trash' | 'active' | 'bench' | 'prize' | 'stadium';

type Card = {
  id: string; tId: string; f: boolean; d: number; cnd: CardStatusCondition[];
  l: string; o: number; att?: string; tp?: CardType; name?: string; imageUrl?: string;
};
```

### Card フィールド短縮名
- `tId`: templateId（カード画像・名前の共通ID）
- `f`: isFaceUp（表向きか）
- `d`: damageCounters
- `cnd`: statusConditions（配列）
- `l`: location（位置）
- `o`: order / zIndex
- `att`: attachedTo（付け先カードID）
- `tp`: CardType

### location の形式
- 通常: `{playerId}-{area}` 例: `p1-active`, `p2-hand`, `p1-bench`, `p2-deck`, `p1-prize`, `p1-trash`
- スタジアム: `stadium`（プレイヤープレフィックスなし）

## useGameState.ts の機能

**プレイヤーID表記:**
- ゲーム状態内: `"p1"` / `"p2"`
- UI/DnD: `"player-1"` / `"player-2"`
- 変換: `Board.tsx` で行う

**エクスポート関数:**
- `getCardsByLocation(loc)` - 指定位置のカード（`att`付き除外・`o`順）
- `getAttachedCards(cardId)` - 付属カード全取得（再帰）
- `moveCard(cardId, src, dst, index?)` - カード移動（active スワップ、他はスタック解消）
- `attachCard(cardId, targetCardId)` - 進化・エネルギー・道具付与
- `detachCard(cardId, targetLoc)` - スタック外して指定位置に移動
- `trashWithAttachments(cardId)` - きぜつ（付属含め全トラッシュ・リセット）
- `updateCardStatus(cardId, updater)` - ダメージ・ステータス更新
- `drawCard(playerId)` - 山札→手札
- `shuffleDeck(playerId)` - 山札シャッフル
- `returnToDeck(cardId, bottom?)` - 手札→山札
- `returnAllHandToDeck(playerId)` - 全手札→山札

## スタック構造（進化・エネルギー付与）
- `att` で親子関係を形成
- `getCardsByLocation()` は `att` 設定カード（付属カード）を除外
- `CardStack` がbase + 付属カードを1つのビジュアルとして表示
- スタック→ trash/deck/hand 時にスタック解消（`att`クリア）

## DnD（dnd-kit）
- `DndContext` / `DragOverlay` は `Board.tsx` で一元管理
- ドロップ先:
  - `DroppableArea` (`type: 'area'`): ID = `{playerId}-{areaId}`
  - `CardStack` 内 (`type: 'card'`): ID = `card-drop-{cardId}`
- `handleDragEnd` ロジック:
  1. `over.type === 'card'` → `attachCard()`
  2. `over.type === 'area'` → `moveCard()`（`stackBaseCardId` 使用可）

## CardMenu 表示制御
- **active / bench のみ** 表示
- portal で `document.body` 直下に描画（stacking context 独立）
- active: ダメージ ✓、状態異常 ✓、スタック操作 ✓
- bench: ダメージ ✓、状態異常 ✗、スタック操作 ✓
- 他: すべて非表示

## ゲーム初期化（defaultDeck.json）
- Active: 1枚（`f=true`）
- Hand: 7枚（`f=true`）
- Prize: 6枚（`f=false`）
- Deck: 46枚（`f=false`、`d` 配列で順序管理・末尾が一番上）

## ゲームログ（useGameLog）
- `addLog(playerId, action, message)` でログを記録
- アクション種別: `draw`, `move`, `attach`, `detach`, `trash`, `shuffle`, `coin`, `damage`, `status`, `return`, `system`
- 新しいログが先頭（降順）、最大100件（超過分は古いものから削除）
- `GameLog` コンポーネントで折りたたみ可能なパネルとして表示

## コイントス（CoinToss）
- ボタンクリックで表/裏をランダム判定（Math.random < 0.5 → 表）
- アニメーション中（800ms）は再クリック不可
- 結果は `onResult` コールバックで親に通知、ゲームログにも記録

## CardListModal
- 山札・トラッシュの中身を一覧表示する汎用モーダル
- `actions` prop でカードごとにアクションボタンを表示
- 山札: 手札に加える / トラッシュ
- トラッシュ: 手札に加える / 山札の上へ / 山札の下へ / ベンチへ

## テスト
- vitest + jsdom
- `*.test.ts` / `*.test.tsx` をソースと同階層に配置
- `vitest.setup.ts` で dnd-kit グローバルモック設定
- TDD（テスト先行 → 失敗確認 → 実装 → 通過確認 → コミット）
- 現在: 124テスト、9テストファイル

## API
- `GET /api/getDeck?code={deckCode}` - ポケモンカード公式サイトからスクレイピング（キャッシュ: 3600秒）
