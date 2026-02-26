# 実装計画 (Step 2: Firebase Realtime DB 統合)

## 概要
Step 1 で作成したReactローカルステート (`useState`) ベースの盤面データを、Firebase Realtime Database のデータと同期するように改修します。これにより、2つのブラウザを開いた際に変更内容が即座にお互いの画面に反映されるようになります。

## User Review Required
> [!IMPORTANT]
> - Firebase のプロジェクト準備が完了しているか、または「Firebaseの接続設定 (APIキーやプロジェクトIDなど)」をご提供いただく必要があります。（本計画進行のために `.env.local` ファイルを作成します）
> - セキュリティルール（誰でも読み書き可能なテスト用にするのか、認証を挟むのか）について方向性をお聞かせください。今回は「サンドボックス形式ですぐに遊べる」ことを重視して、**匿名認証（Anonymous Auth）または認証なし（誰でも読み書き可）の公開ルール**とすることを推奨します。

## Proposed Changes

### 1. データ構造の最適化（Flat State Pattern）
#### [MODIFY] `src/types/game.ts`
- 現在の配列ベースのツリー構造から、`{ [cardId]: Card }` というMap（辞書）を用いたフラットな状態管理に変更します。
- `Card` 型に、自身が存在する場所を表す `location` (`p1-deck`, `p1-hand` 等) や、スタック内の順序を示す `order` を持たせます。

#### [MODIFY] `src/hooks/useGameState.ts` & `src/components/Board.tsx`
- 新しい構造に合わせて初期モックデータの生成ロジックを変更します。
- Board側で各エリアにカードを描画する際、全体のMapから `location` をキーにフィルタリング（および `order` に基づくソート）してレンダリングする形に書き換えます。

### 2. Firebaseセットアップ
#### [NEW] `src/lib/firebase.ts`
- `firebase/app`, `firebase/database` を使用し、アプリの初期化とRealtime DBインスタンスのエクスポートを行うモジュールを作成します。

#### [NEW] `.env.local` (Git管理外)
- 提供いただく Firebase のConfig情報を環境変数として記述します。

### 3. 状態管理のFirebase化（通信量の最小化）
#### [MODIFY] `src/hooks/useGameState.ts`
- 初期化時に `onValue` で全カードを読み込みます。
- ドラッグやステータス変更があった際は、全体を上書き(`set()`)するのではなく、`update()` メソッドを用いて「変更のあったカード（あるいはプロパティ）」だけを差分更新します。
- シャッフル時は「山札(`p1-deck`)」内にあるカード全ての `order` のみをランダム値で一括更新します。

### 3. ルームおよび対戦相手（Player 2）の機能調整
#### [MODIFY] `src/components/Board.tsx`
- 自分が `player-1` か `player-2` かを選択して盤面に入る簡単なUIまたはURLパラメータ判定を加えます。
- 相手プレイヤー（例えば自分が `player-1` なら `player-2`）のベンチやバトル場を、画面上部の「相手の盤面」エリアに表示するようにレンダリングを拡張します。

---

## Verification Plan
### Automated Tests
- TypeScript エラーが発生しないか `npm run build` で静的検証を行います。

### Manual Verification
1. `npm run dev` でローカルサーバーを起動。
2. ブラウザを **2つのウィンドウ（またはシークレットウィンドウ）で開く**。
3. 一方の画面でカードを動かしたり、ダメージカウンターを変更したりする。
4. もう一方の画面で、リロードすることなく即座（リアルタイム）に盤面の変更が反映されていることを目視確認する。
