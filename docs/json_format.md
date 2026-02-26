ここまでの対話に基づき、Firebase Realtime Database (RTDB) を活用した、軽量で拡張性の高い対戦カードゲームのデータ構造仕様書をまとめました。

---

# 対戦カードゲーム Data Structure Specification

## 1. 設計指針

* **通信量の最小化**: 試合中に変動しないデータ（カード名、画像等）は Firebase に持たず、クライアント側のマスターデータで管理する。
* **差分更新の活用**: `onChildChanged` を利用し、カード1枚の変更（ダメージ、場所移動）のみを同期する。
* **配列とオブジェクトの使い分け**: 順番が重要な「山札」のみ配列で管理し、それ以外は `loc`（場所）プロパティによる状態管理を行う。

## 2. データ構造 (JSON)

### 2.1 ゲームステート (Firebase RTDB)

プロパティ名は通信量節約のため、1文字に短縮しています。

```json
{
  "rooms": {
    "room-001": {
      "m": {                      // meta: 試合の進行状態
        "t": "p1",                // turn: 現在のターンプレイヤー
        "s": "playing",           // status: 試合状況
        "a": "p1-draw"            // lastAction: 直近のアクション（ログ用）
      },
      "p1": {
        "n": "Takuya",            // name: プレイヤー名
        "d": [159, 102, 144...],  // deck: 山札（カードIDの数値配列、末尾が山札の一番上）
        "c": {                    // cards: 全60枚のカード状態
          "101": { 
            "l": "a",             // loc: 場所 (a:active, b:bench, h:hand, t:trash, p:prizes, d:deck)
            "d": 20,              // dmg: ダメージ
            "f": true             // face: 表裏 (true:表, false:裏)
          },
          "102": { "l": "h", "f": true }
        }
      },
      "p2": { ...同様の構造... }
    }
  }
}

```

### 2.2 カードマスターデータ (Local JSON / Frontend)

Firebaseには保存せず、フロントエンドのソースコードに含めます。

```json
{
  "pika-001": {
    "n": "ピカチュウ",
    "hp": 60,
    "type": "Lightning",
    "img": "/assets/cards/pika001.png"
  },
  "ener-001": { "n": "基本雷エネルギー", "type": "Energy" }
}

```

---

## 3. 主要アクションの実装サンプル (JavaScript)

RTDBの `update()` を使い、複数のパスを一度に更新することでデータの整合性を保ちます。

### 3.1 山札から1枚引く (Draw)

```javascript
import { ref, update, get } from "firebase/database";

async function drawCard(roomId, playerId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  const playerRef = ref(db, `rooms/${roomId}/${playerId}`);
  
  // 1. 現在の山札配列を取得
  const snapshot = await get(ref(db, `rooms/${roomId}/${playerId}/d`));
  let deck = snapshot.val() || [];
  
  if (deck.length === 0) return;

  // 2. 配列の末尾（山札の一番上）を取り出す
  const cardId = deck.pop();

  // 3. 山札の更新と、カードの状態更新を同時に実行
  const updates = {};
  updates[`${playerId}/d`] = deck;
  updates[`${playerId}/c/${cardId}/l`] = "h"; // location -> hand
  updates[`${playerId}/c/${cardId}/f`] = true; // face -> true
  updates["m/a"] = `${playerId}-draw`;         // アクションログ

  await update(roomRef, updates);
}

```

### 3.2 ダメージを与える (Damage)

```javascript
function applyDamage(roomId, playerId, cardId, newDamage) {
  const cardDmgRef = ref(db, `rooms/${roomId}/${playerId}/c/${cardId}/d`);
  update(cardDmgRef, newDamage); // 1つのプロパティだけならシンプルにupdate
}

```

---

## 4. フロントエンドでの受信 (Sync)

`onValue` で全体を取るのではなく、`onChildChanged` でカードの動きを検知します。

```javascript
// カードの状態変化を個別に監視
onChildChanged(ref(db, `rooms/${roomId}/p1/c`), (snapshot) => {
  const cardId = snapshot.key;
  const cardData = snapshot.val();
  
  // UI上の該当するカードコンポーネントだけを再レンダリング
  updateCardUI(cardId, cardData);
  console.log(`カード ${cardId} が ${cardData.l} へ移動しました`);
});

```

---

## 5. まとめ：この仕様のメリット

1. **超軽量**: 文字列を極限まで削ったため、120枚の同期でもパケット消費が極少です。
2. **バグ耐性**: `loc` プロパティ一つで場所が決まるため、「手札にあるはずなのにトラッシュにも名前がある」といった二重存在が起こりません。
3. **拡張性**: 「TCG-Print-Master」で自作したカードを追加する場合も、ローカルのマスターデータを更新するだけで済み、DBの構造を変える必要がありません。

---