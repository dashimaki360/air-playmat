# 実装計画: データ構造の最適化 (Firebase RTDB向け)

## 目的
`json_format.md` の仕様に従い、Firebase Realtime Database (RTDB) の通信量を最小化するため、アプリケーション内の状態管理およびデータ構造（`GameState`, `Card`）を最適化します。プロパティ名を1文字に短縮し、カードの情報をプレイヤーごとにネストする形式に変更します。

## ユーザーレビュー依頼
以下の仕様変更について問題がないかご確認ください。
> [!IMPORTANT]
> `json_format.md` に従ってプロパティ名を大幅に短縮（`loc` -> `l`, `dmg` -> `d` など）するため、現在の一部のモックUI表示機能（`name` や `imageUrl` といったプロパティ）はマスターデータ側（フロント内部）から引く想定で、状態からは削除するかオプショナルなまま残すか検討が必要です。今回はフロント側の影響を最小限にするため、オプショナルのまま残しつつ、主力の状態管理のプロパティキーのみを更新する方針とします。

## 変更内容

### 1. 型定義の更新
#### [MODIFY] [game.ts](file:///Users/takuyay/Documents/air-playmat/src/types/game.ts)
- `Card` 型のプロパティを短縮名に変更（`loc` -> `l`, `dmg` -> `d`, `face` -> `f`, `ord` -> `o` など）。
- `GameState` 型を `Room` 単位の構造（`m`, `p1`, `p2`）に変更。山札は `d` (配列) として持つように修正する。

### 2. 状態管理フックの更新
#### [MODIFY] [useGameState.ts](file:///Users/takuyay/Documents/air-playmat/src/hooks/useGameState.ts)
- `initialMockState` の生成ロジックを新しい `GameState` に合わせて更新。
- `getCardsByLocation` メソッドを更新し、`p1.c` と `p2.c` の双方からカードを検索するよう修正。
- `moveCard` メソッドで山札(`d`)からの移動やプレイヤーオブジェクト配下のカード情報の更新に対応。

### 3. UIコンポーネントへの適用
#### [MODIFY] [Board.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/Board.tsx)
- `gameState.players` へのアクセスを `gameState.p1`, `gameState.p2` に変更。
- 表示ロジックにおいて各種短縮プロパティ（`f`, `l`, `d` など）へのアクセスに合わせて更新。

#### [MODIFY] [Card.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/Card.tsx)
- プロップスや内部でのプロパティ名アクセス（`card.loc`, `card.dmg`, `card.face`）を新しい短縮名に変更。

## 検証計画

### 手動検証
1. 開発サーバー (`npm run dev`) を起動。
2. ブラウザでアプリを開き、UI エラーがないことを確認。
3. 以下のゲームアクションが正常に機能することを検証：
   - デッキから手札へのカード移動
   - 手札からベンチ、ベンチからアクティブへのカード移動
   - ダメージカウンターの加算・減算（テスト用UIがある場合）
   - コンソールにエラーが出ないこと。
