# 山札（デッキ）機能の実装計画

## 要件
1. 山札のシャッフル機能
2. 手札を山札の下に戻す機能
3. 手札を山札に戻してシャッフルする機能
4. 山札にはダメージなど乗らないため、UIを非表示にする
5. 山札をクリックすると1枚ドローする（手札に加える）
6. 山札の中身を表側で一覧で見る機能

## 提案する変更

### src/hooks/useGameState.ts
- 新規関数 `shuffleDeck(playerId: string)` を追加
  - 対象プレイヤーのデッキ（配列 `d`）と、対応するカードオブジェクト群の `o`（順番）をシャッフル・更新する。
- 新規関数 `returnToDeck(cardId: string, bottom: boolean, shuffleAfter: boolean)` を追加
  - 指定したカードを山札に戻す処理。
  - `bottom: true` の場合は、デッキ配列の先頭（末尾をトップとした場合、インデックス0）に挿入し `o` を調整する。
  - `shuffleAfter: true` の場合はカード追加後に `shuffleDeck` を呼び出す。
- 新規関数 `drawCard(playerId: string)` を追加
  - デッキの一番上（配列の末尾）のカードを手札（`l: '{p}-hand'`）に移動し、`f: true` 等に更新する。

### src/components/Board.tsx
- 山札（`deck`）エリアのクリックイベントハンドラを追加
  - クリックされたら `drawCard('p1')` を発動する。
- デッキ用の専用メニューボタン（例: シャッフル、デッキ確認）を山札の近辺（またはクリックメニュー）に追加する。
- デッキ一覧確認モーダルの状態 (`showDeckModal`) の追加と、モーダルUIの表示実装。モーダル内では `getCardsByLocation('p1-deck')` を表向きのUIでリスト表示する。

### src/components/CardMenu.tsx
- 手札（`area === 'hand'`）表示時に、以下のボタンを追加する：
  - 「山札の下に戻す」
  - 「山札に戻してシャッフル」
- これらをクリックした際、`useGameState` で定義した関数を呼び出す。

### src/components/Card.tsx
- プロパティ `area === 'deck'` の場合、ダメージカウンター、状態異常アイコン等のUIを描画しないよう条件分岐を追加する。
- また、デッキのトップ以外のカードもドローイベントと競合しないように設定する。

## 確認事項
なし
