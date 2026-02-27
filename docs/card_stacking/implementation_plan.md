# カード重ね（スタック）機能の実装

ポケモンカードの「進化」「エネルギー付与」「道具付与」を再現する。カードをポケモンの上に重ねて管理し、UI上ではエネルギー・道具がポケモンの上方向にずらして表示される。

## 確定方針

- **進化元**: 完全に隠す（メニューから確認可能）
- **エネルギー・道具**: ポケモンカードの上方向にずらして表示（カード上端が見える）
- **ポケモン本体**: 最前面に表示
- **データモデル**: `Card` 型に `att?` フィールドを追加（親カードID）

---

## Proposed Changes

### データモデル

#### [MODIFY] [game.ts](file:///Users/takuyay/Documents/air-playmat/src/types/game.ts)

- `Card` 型に `att?: string` フィールドを追加（attachedTo: 親カードのID）
- `DraggableItemData` に `type: 'card'` に加えてドロップ先カード判定用の情報を保持

---

### ゲームロジック

#### [MODIFY] [useGameState.ts](file:///Users/takuyay/Documents/air-playmat/src/hooks/useGameState.ts)

新規関数の追加:

1. **`attachCard(cardId, targetCardId)`** — カードをポケモンに重ねる
   - `cardId` の `att` を `targetCardId` に設定
   - `cardId` の `l` を `targetCardId` と同じ location に変更
   - `f` を `true` に設定（表向き）

2. **`detachCard(cardId, targetLoc)`** — 重ねたカードを外す
   - `att` を `undefined` に戻す
   - `l` を `targetLoc` に変更

3. **`getAttachedCards(cardId)`** — 指定カードに付いている全カードを取得
   - `att` が `cardId` と一致するカードをフィルタ
   - 進化カード（チェーンの最上位）とエネルギー・道具を区別して返す

4. **`trashWithAttachments(cardId)`** — ポケモンと付いているカードを全てトラッシュ
   - `cardId` とそれに `att` されている全カード（再帰的）の `l` を trash に移動
   - 全カードの `att` を `undefined` にリセット

既存関数の修正:

5. **`moveCard` 拡張** — ベースポケモン移動時、`att` されているカード全てを一緒に移動
6. **`getCardsByLocation` 拡張** — `att` が設定されているカードはフィルタ対象外にする（独立カードのみ返す）
7. **`createMockCard` 修正** — `att` フィールドの初期値を含める

---

### UI コンポーネント

#### [MODIFY] [Card.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/Card.tsx)

- カードコンポーネントに `useDroppable` を追加（カードの上にカードをドロップ可能に）
- ドロップ先がカードの場合のハイライト表示（緑の枠など）

#### [NEW] [CardStack.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/CardStack.tsx)

ポケモン + 付いているカードをまとめて表示する新コンポーネント:

- ポケモンカードを最前面（z-index最上位）に表示
- エネルギー・道具カードは上方向にずらして背面に表示（カード上端が覗く）
- 進化元カードは非表示
- 付属カード数が多い場合はずらし幅を自動縮小
- カード全体としてドラッグ可能（ポケモンを掴んだ時、重なっているカードも一緒に移動）

#### [MODIFY] [CardMenu.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/CardMenu.tsx)

- 「つけたカードを見る」ボタン追加（モーダルで一覧表示）
- 「カードをはがす」操作（個別のカードを手札やトラッシュに戻す）
- 「きぜつ（全てトラッシュ）」ボタン追加

#### [MODIFY] [Board.tsx](file:///Users/takuyay/Documents/air-playmat/src/components/Board.tsx)

- `handleDragEnd` を拡張: ドロップ先が `type: 'card'` の場合に `attachCard` を呼ぶ
- Active / Bench エリアの描画を `CardStack` コンポーネントに置き換え

---

## Verification Plan

### 自動テスト

既存テスト: `npx vitest run`

#### 追加テスト内容（`useGameState.test.ts` を拡張）

1. `attachCard` — カードを重ねた後、`att` と `l` が正しいことを検証
2. `detachCard` — 外したカードの `att` が `undefined`、`l` が正しいことを検証
3. `getAttachedCards` — 付いているカードが正しく取得されることを検証
4. `moveCard`（拡張後） — ベースポケモンを移動した時、付属カードも一緒に移動することを検証
5. `trashWithAttachments` — ポケモンと付属カード全てがトラッシュに移動されることを検証

```bash
npx vitest run
```

### 手動テスト（ブラウザ）

`npm run dev` で起動後、ブラウザで確認:

1. 手札からエネルギーカードをActive/Benchのポケモンの上にドラッグ＆ドロップ → ポケモンの上方向にずれて表示されること
2. 同じポケモンに複数枚のカードを重ねる → ずらし幅が自動調整されること
3. ポケモンをクリック → メニューに「つけたカードを見る」が表示されること
4. ベースポケモンをBench↔Active間でドラッグ → 付属カードも一緒に移動すること
5. 「きぜつ」操作 → ポケモンと付属カードが全てトラッシュに移動すること
