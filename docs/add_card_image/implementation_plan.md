 # [Goal Description]
カードの表面に画像を表示するため、適当なデッキリストを公式サイトからスクレイピングしてデフォルトのデッキデータとして保持し、UIでその画像を表示できるようにします。

## Proposed Changes

### データ保持と初期化の変更
#### [NEW] src/data/defaultDeck.json
ポケモンカードの公式サイトからスクレイピングしたデッキデータ（カード名、画像URL、枚数などのリスト）をJSONファイルとして静的に保存します。

#### [MODIFY] src/hooks/useGameState.ts
現在ハードコードされている適当なモックカード（Pikachuなど）の代わりに、`src/data/defaultDeck.json`のデータを読み込み、Player1およびPlayer2の初期状態（山札、手札、サイドなど）を生成するように変更します。カードデータに `imageUrl` と `name` を設定します。

#### [NEW] src/hooks/useGameState.test.ts
`useGameState` の初期化ロジックの単体テストを作成します。`defaultDeck.json` のデータが正しく読み込まれ、デッキ、手札、サイドなどの初期配置が期待通りに行われているか検証します。

### UIの修正
#### [MODIFY] src/components/Card.tsx
現在テキストのみで表示されているカードの表面（`card.f === true` の状態）において、`card.imageUrl` が存在する場合は `<img>` タグを使用してカードの画像を背景として（またはコンテンツとして）表示するように変更します。画像の上にダメージカウンターや状態異常アイコンが重なって表示されるようにスタイルを調整します。

#### [NEW] src/components/Card.test.tsx
`Card` コンポーネントの単体テストを作成します。`imageUrl` が渡された場合に画像がレンダリングされること、および表面・裏面の表示の切り替わりを検証します。

## Verification Plan

### Automated Tests
- `npm run test` コマンドを実行し、新たに追加した `useGameState.test.ts` および `Card.test.tsx` がパスすることを確認します。

### Manual Verification
1. コマンドでスクリプトを実行して適当なデッキ（コード: `Y888cD-AzhZEz-Y8G4xc` 等）のJSONデータを取得・保存します。
2. アプリケーションをローカルで起動し、ブラウザで開きます。
3. 初期状態として、各プレイヤーの場や手札に画像付きのカードが表示されていることを確認します。
4. 画像が表示された状態で、ドラッグ＆ドロップやダメージ追加などの機能がこれまで通り動作し、レイアウトが崩れないことを確認します。
