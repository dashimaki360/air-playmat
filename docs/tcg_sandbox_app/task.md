# TCG Sandbox App - Task List

## Step 1: UIとモックデータの作成 (完了)
- [x] 1. プロジェクトのセットアップ
  - [x] React (TypeScript) + Vite プロジェクトの初期化
  - [x] Tailwind CSS の導入
  - [x] dnd-kit, lucide-react 等の必要ライブラリインストール
- [x] 2. 型定義とモックデータの作成
  - [x] `GameState`, `Card` 型の定義
  - [x] Step 1用の初期モックデータの作成（手札、バトル場、ベンチ、山札、トラッシュ等を適当なカードデータで埋める）
- [x] 3. 基本UIコンポーネントの実装
  - [x] `Card` コンポーネント（見た目、ダメージ数表示、状態異常アイコン、表裏の表現）
  - [x] 各種エリア（山札、手札、バトル場、ベンチ、トラッシュ、サイド）のUI枠組み実装
  - [x] コンテキストメニュー/ポップオーバー機能（カードクリック時にステータス変更UIを表示）
- [x] 4. ドラッグ＆ドロップ機能 (dnd-kit)
  - [x] `DndContext` の設定
  - [x] エリア間のカード移動ロジック（`onDragEnd` で State を更新）
- [x] 5. ステータス変更機能の実装
  - [x] メニューからの「表/裏の切り替え」
  - [x] メニューからの「ダメージカウンター増減」
  - [x] メニューからの「状態異常の付与/解除」
- [x] 6. 動作確認
  - [x] `npm run dev` でローカルサーバーを起動し、ボード上でカードのD&Dやステータス変更がエラーなく行えるかブラウザで確認する

---

## Step 2: データ構造最適化とFirebase Realtime Databaseの統合
- [x] 1. 通信量削減のためのデータ構造リファクタリング (Flat State)
  - [x] `GameState`, `Card` 型を再定義し、Cardsをツリー配列から `{ [cardId]: Card }` のMap構造（辞書型）に変更する
  - [x] 各カードが自身が属する場所（`location`: 例 `p1-hand`, `p1-deck`）と並び順（`order`または`zIndex`）のプロパティを保持する仕組みにする
  - [x] `useGameState` と `Board.tsx` の関連ロジックを新構造に合わせて書き換える
- [ ] 2. Firebaseのセットアップ
  - [ ] Firebaseプロジェクトの準備完了およびConfig情報の適用 (`src/lib/firebase.ts`, `.env.local`)
  - [ ] `npm install firebase`
- [ ] 3. 状態管理のFirebase化 (`useGameState`)
  - [ ] 初期ロード時に `onValue` で盤面を同期
  - [ ] カードの移動時やステータス変更時に `update` メソッドを使用して、差分（変わったカードの `location` 等のキーのみ）だけをFirebaseに送信する（通信量の極小化）
- [ ] 4. マルチプレイヤー対応と複数端末での同期テスト
  - [ ] `Opponent Board` 領域を、`player-2` の実際のFirebaseデータと連動させる
  - [ ] 複数ウィンドウで開き、差分更新によってリアルタイムに反映されるか確認する
