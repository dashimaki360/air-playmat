# air-playmat メモリ

## 概要
- **アプリ**: ポケモンTCGのデジタル対戦用プレイマットアプリ
- **スタック**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Firebase Realtime Database + Vercel

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
├── types/
│   ├── game.ts                # ゲーム型定義
│   └── room.ts                # ルーム型定義（オンライン対戦）
├── hooks/
│   ├── useGameState.ts        # ゲーム状態管理 + 純粋関数エクスポート
│   ├── useGameLog.ts          # ゲームログ管理（操作履歴）
│   ├── useDeckManager.ts      # デッキインポート・選択・削除
│   ├── useKeyboardShortcuts.ts # キーボードショートカット
│   ├── useRoom.ts             # ルーム作成・参加・監視
│   └── useFirebaseSync.ts     # Firebase 状態同期（delta書き込み+購読）
├── components/
│   ├── Board.tsx              # メインレイアウト + DnDコンテキスト + perspective対応
│   ├── Lobby.tsx              # オンライン対戦ロビー（ルーム作成/参加/待機）
│   ├── Card.tsx               # 個別カード
│   ├── CardStack.tsx          # ポケモン+付属カードのスタック
│   ├── CardMenu.tsx           # カード操作メニュー（portal）
│   ├── CardListModal.tsx      # 汎用カードリストモーダル（アクション付き）
│   ├── CoinToss.tsx           # コイントス（表/裏ランダム判定）
│   ├── DeckManager.tsx        # デッキインポート・一覧・詳細表示
│   ├── GameLog.tsx            # ゲームログ表示パネル
│   └── DroppableArea.tsx      # ドロップ可能エリア
├── lib/
│   ├── firebase.ts            # Firebase初期化（環境変数）
│   ├── firebaseDelta.ts       # delta計算（純粋関数）
│   └── pokemon-tcg/deck-scraper.ts  # デッキスクレイピング
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

**エクスポート関数（純粋関数 + hook メソッド）:**
- 純粋関数: `applyMoveCard`, `applyAttachCard`, `applyDetachCard`, `applyTrashWithAttachments`, `applyUpdateCardStatus`, `applyDrawCard`, `applyShuffleDeck`, `applyReturnToDeck`, `applyReturnAllHandToDeck`
- クエリ: `queryCardsByLocation(state, loc)`, `queryAttachedCards(state, cardId)`
- 初期化: `createInitialState(deckCards?)`, `generateInitialPlayer(prefix, name, deckCards?)`
- hook は `syncedUpdate` パターンで純粋関数を呼び出し、Firebase 同期を差し込み可能

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
- 現在: 173テスト、13テストファイル

## デッキ管理（DeckManager + useDeckManager）
- デッキコード入力でポケモンカード公式サイトからインポート
- インポート済みデッキ一覧: サムネイル（1枚目のカード画像）+ コード + 枚数 + タイプ別内訳
- 「詳細」ボタンでカードリスト展開（タイプ別グループ化、画像・名前・枚数表示）
- 選択したデッキで対戦開始（Board に `deckCards` を渡す）
- デフォルトタブは「対戦」

## オンライン対戦（Firebase Realtime Database）

### 対戦フロー
1. モード選択: ローカル / オンライン
2. ルーム作成 or 参加（4桁ルームID）
3. 両プレイヤーReady → p1が対戦開始
4. p1が `generateInitialPlayer` で両プレイヤーの初期状態を生成し Firebase に書き込み
5. Board が perspective に応じて p1/p2 の視点を切り替え

### Firebase DB 構造
```
rooms/{roomId}/
  meta/  { createdAt, status, p1Connected, p2Connected }
  p1/    { n, deck, deckCards[], ready }
  p2/    { n, deck, deckCards[], ready }
  state/ { m/, p1/ { n, d[], c/{cardId}/ }, p2/ { ... } }
```

### 同期戦略
- **書き込み**: `computeFirebaseUpdates()` で prev/next の差分パスのみを `update()` で送信
- **購読**: `onValue()` で `state/` 全体を監視（Firebase が差分のみ転送）
- **エコーループ防止**: `m.a`（lastAction）を比較
- **syncedUpdate**: useGameState 内で状態変更時に `firebaseSync.pushUpdate(prev, next)` を呼び出し

### perspective
- `Board` に `perspective` prop で p1/p2 の視点を指定
- p2 視点: 自分(p2) = PlayerArea（下）、相手(p1) = OpponentArea（上）
- `PlayerArea` / `OpponentArea` に `playerId` / `dndPlayerId` を動的に渡す

### 接続管理
- `onDisconnect()` で切断検知
- `sessionStorage` にルームID/プレイヤーID保存
- ヘッダーに接続状態インジケーター（緑/赤ドット）

## API
- `GET /api/getDeck?code={deckCode}` - ポケモンカード公式サイトからスクレイピング（キャッシュ: 3600秒）
