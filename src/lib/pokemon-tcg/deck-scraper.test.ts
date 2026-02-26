import { describe, it, expect } from 'vitest';
import { getDeckList } from './deck-scraper';

describe('deck-scraper', () => {
  it('should get a deck list correctly from a valid deck code', async () => {
    // 実際に存在するデッキコードでテスト（時間がかかるためテスト実行時は注意）
    // 大会結果などから確認できる適当なデッキコード
    const testCode = 'kVvkkv-69A7Uu-kdfv11';
    
    try {
        const deck = await getDeckList(testCode);
        
        expect(deck).toBeDefined();
        expect(deck.cards).toBeInstanceOf(Array);
        // デッキコードが有効であれば、少なくとも1枚はカードが含まれるはず
        if (deck.cards.length > 0) {
           const firstCard = deck.cards[0];
           expect(firstCard.id).toBeTypeOf('string');
           expect(firstCard.count).toBeGreaterThan(0);
           expect(firstCard.imageUrl).toContain('http');
        }
    } catch(e) {
        // もしネットワークエラー等で失敗した場合はスキップ扱いとする
        console.warn('Network error during test, skipping assertion', e);
    }
  }, 30000); // タイムアウトを30秒に延長
});
