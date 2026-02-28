# CLAUDE.md

## クイックスタート
```bash
npm run dev        # 開発サーバー
npm run build      # ビルド
npm run test       # テスト実行
npm run test -- --coverage  # カバレッジ付き
```

## 開発方針
- **TDD**: テスト先行 → 失敗確認 → 実装 → テスト通過確認 → コミット
- テストは `*.test.ts` / `*.test.tsx` をソースと同階層に配置

## ドキュメント
- 設計・アーキテクチャ仕様: `ARCHITECTURE.md`
- セッション横断メモリ: `MEMORY.md`
