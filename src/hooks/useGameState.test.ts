import { renderHook, act } from '@testing-library/react';
import { useGameState } from './useGameState';
import defaultDeck from '../data/defaultDeck.json';

describe('useGameState hook', () => {
    it('初期状態が正しく生成される', () => {
        const { result } = renderHook(() => useGameState());
        const state = result.current.gameState;

        expect(state.p1).toBeDefined();
        expect(state.p2).toBeDefined();

        const p1Cards = Object.values(state.p1.c);
        expect(p1Cards.length).toBe(60);

        const expectedTotalCards = defaultDeck.cards.reduce((sum: number, card: { count: number }) => sum + card.count, 0);
        expect(expectedTotalCards).toBe(60);

        const p1Active = p1Cards.filter(c => c.l === 'p1-active');
        const p1Hand   = p1Cards.filter(c => c.l === 'p1-hand');
        const p1Prize  = p1Cards.filter(c => c.l === 'p1-prize');
        const p1Deck   = p1Cards.filter(c => c.l === 'p1-deck');

        expect(p1Active.length).toBe(1);
        expect(p1Hand.length).toBe(7);
        expect(p1Prize.length).toBe(6);
        expect(p1Deck.length).toBe(46);

        expect(p1Active[0].f).toBe(true);
        expect(p1Hand.every(c => c.f === true)).toBe(true);
        expect(p1Prize.every(c => c.f === false)).toBe(true);
        expect(p1Deck.every(c => c.f === false)).toBe(true);

        const sampleCard = p1Active[0];
        const cardInDataFile = defaultDeck.cards.find(c => c.name === sampleCard.name);
        expect(sampleCard.imageUrl).toBe(cardInDataFile?.imageUrl);
    });

    // ── helpers ──────────────────────────────────────────────────
    const getP1Card = (state: ReturnType<typeof useGameState>['gameState'], loc: string) =>
        Object.values(state.p1.c).find(c => c.l === loc)!;

    const getP1Cards = (state: ReturnType<typeof useGameState>['gameState'], loc: string) =>
        Object.values(state.p1.c).filter(c => c.l === loc);

    // ── moveCard ─────────────────────────────────────────────────
    describe('moveCard', () => {
        it('指定したlocationにカードが移動する', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.moveCard(card.id, 'p1-hand', 'p1-bench'); });

            expect(result.current.gameState.p1.c[card.id].l).toBe('p1-bench');
        });

        it('手札に移動したカードは表向きになる', () => {
            const { result } = renderHook(() => useGameState());
            const deckCardId = result.current.gameState.p1.d[0];

            act(() => { result.current.moveCard(deckCardId, 'p1-deck', 'p1-hand'); });

            expect(result.current.gameState.p1.c[deckCardId].f).toBe(true);
        });

        it('山札に移動したカードは裏向きになる', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.moveCard(card.id, 'p1-hand', 'p1-deck'); });

            expect(result.current.gameState.p1.c[card.id].f).toBe(false);
        });

        it('ベンチに移動したカードの状態異常がクリアされる', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.updateCardStatus(card.id, c => ({ ...c, cnd: ['poison'] })); });
            act(() => { result.current.moveCard(card.id, 'p1-hand', 'p1-bench'); });

            expect(result.current.gameState.p1.c[card.id].cnd).toEqual([]);
        });

        it('山札からの移動で山札配列から削除される', () => {
            const { result } = renderHook(() => useGameState());
            const deckCardId = result.current.gameState.p1.d[0];
            const initialDeckLength = result.current.gameState.p1.d.length;

            act(() => { result.current.moveCard(deckCardId, 'p1-deck', 'p1-hand'); });

            expect(result.current.gameState.p1.d.length).toBe(initialDeckLength - 1);
            expect(result.current.gameState.p1.d).not.toContain(deckCardId);
        });

        it('アクティブに移動したカードは既存のアクティブカードとスワップされる', () => {
            const { result } = renderHook(() => useGameState());
            const activeCard = getP1Card(result.current.gameState, 'p1-active');
            const handCard   = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.moveCard(handCard.id, 'p1-hand', 'p1-active'); });

            expect(result.current.gameState.p1.c[handCard.id].l).toBe('p1-active');
            expect(result.current.gameState.p1.c[activeCard.id].l).toBe('p1-hand');
        });
    });

    // ── attachCard ───────────────────────────────────────────────
    describe('attachCard', () => {
        it('attフィールドに親カードIDが設定される', () => {
            const { result } = renderHook(() => useGameState());
            const [card, target] = getP1Cards(result.current.gameState, 'p1-hand');

            act(() => { result.current.attachCard(card.id, target.id); });

            expect(result.current.gameState.p1.c[card.id].att).toBe(target.id);
        });

        it('重ねたカードは親カードと同じlocationになる', () => {
            const { result } = renderHook(() => useGameState());
            const active = getP1Card(result.current.gameState, 'p1-active');
            const hand   = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.attachCard(hand.id, active.id); });

            expect(result.current.gameState.p1.c[hand.id].l).toBe('p1-active');
        });

        it('重ねたカードは表向きになる', () => {
            const { result } = renderHook(() => useGameState());
            const [card, target] = getP1Cards(result.current.gameState, 'p1-hand');

            act(() => { result.current.attachCard(card.id, target.id); });

            expect(result.current.gameState.p1.c[card.id].f).toBe(true);
        });

        it('山札のカードをattachすると山札配列から削除される', () => {
            const { result } = renderHook(() => useGameState());
            const deckCardId = result.current.gameState.p1.d[0];
            const active     = getP1Card(result.current.gameState, 'p1-active');
            const initialLen = result.current.gameState.p1.d.length;

            act(() => { result.current.attachCard(deckCardId, active.id); });

            expect(result.current.gameState.p1.d.length).toBe(initialLen - 1);
            expect(result.current.gameState.p1.d).not.toContain(deckCardId);
        });
    });

    // ── detachCard ───────────────────────────────────────────────
    describe('detachCard', () => {
        const setupAttached = () => {
            const { result } = renderHook(() => useGameState());
            const [card, target] = getP1Cards(result.current.gameState, 'p1-hand');
            act(() => { result.current.attachCard(card.id, target.id); });
            return { result, cardId: card.id };
        };

        it('attフィールドが解除される', () => {
            const { result, cardId } = setupAttached();
            act(() => { result.current.detachCard(cardId, 'p1-hand'); });
            expect(result.current.gameState.p1.c[cardId].att).toBeUndefined();
        });

        it('指定したlocationに移動する', () => {
            const { result, cardId } = setupAttached();
            act(() => { result.current.detachCard(cardId, 'p1-hand'); });
            expect(result.current.gameState.p1.c[cardId].l).toBe('p1-hand');
        });

        it('山札に戻すとf=falseになり山札配列に追加される', () => {
            const { result, cardId } = setupAttached();
            const deckLenBefore = result.current.gameState.p1.d.length;

            act(() => { result.current.detachCard(cardId, 'p1-deck'); });

            expect(result.current.gameState.p1.c[cardId].f).toBe(false);
            expect(result.current.gameState.p1.d).toContain(cardId);
            expect(result.current.gameState.p1.d.length).toBe(deckLenBefore + 1);
        });

        it('手札に戻すとf=trueになる', () => {
            const { result } = renderHook(() => useGameState());
            const active   = getP1Card(result.current.gameState, 'p1-active');
            const deckCard = result.current.gameState.p1.d[0];

            act(() => { result.current.attachCard(deckCard, active.id); });
            act(() => { result.current.detachCard(deckCard, 'p1-hand'); });

            expect(result.current.gameState.p1.c[deckCard].f).toBe(true);
        });
    });

    // ── trashWithAttachments ─────────────────────────────────────
    describe('trashWithAttachments', () => {
        it('カードがトラッシュに移動する', () => {
            const { result } = renderHook(() => useGameState());
            const active = getP1Card(result.current.gameState, 'p1-active');

            act(() => { result.current.trashWithAttachments(active.id); });

            expect(result.current.gameState.p1.c[active.id].l).toBe('p1-trash');
        });

        it('ダメージ・状態異常・att がリセットされる', () => {
            const { result } = renderHook(() => useGameState());
            const active = getP1Card(result.current.gameState, 'p1-active');

            act(() => {
                result.current.updateCardStatus(active.id, c => ({ ...c, d: 100, cnd: ['burn', 'poison'] }));
            });
            act(() => { result.current.trashWithAttachments(active.id); });

            const trashed = result.current.gameState.p1.c[active.id];
            expect(trashed.d).toBe(0);
            expect(trashed.cnd).toEqual([]);
            expect(trashed.att).toBeUndefined();
            expect(trashed.f).toBe(true);
        });

        it('付属カードも一緒にトラッシュに移動する', () => {
            const { result } = renderHook(() => useGameState());
            const active = getP1Card(result.current.gameState, 'p1-active');
            const hand   = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.attachCard(hand.id, active.id); });
            act(() => { result.current.trashWithAttachments(active.id); });

            expect(result.current.gameState.p1.c[hand.id].l).toBe('p1-trash');
        });
    });

    // ── updateCardStatus ─────────────────────────────────────────
    describe('updateCardStatus', () => {
        it('アップデーター関数がカードに適用される', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => {
                result.current.updateCardStatus(card.id, c => ({ ...c, d: 60, cnd: ['poison'] }));
            });

            const updated = result.current.gameState.p1.c[card.id];
            expect(updated.d).toBe(60);
            expect(updated.cnd).toContain('poison');
        });
    });

    // ── drawCard ─────────────────────────────────────────────────
    describe('drawCard', () => {
        it('山札の一番上のカードが手札に追加される', () => {
            const { result } = renderHook(() => useGameState());
            const topCardId = result.current.gameState.p1.d[result.current.gameState.p1.d.length - 1];

            act(() => { result.current.drawCard('p1'); });

            expect(result.current.gameState.p1.c[topCardId].l).toBe('p1-hand');
        });

        it('山札のサイズが1減る', () => {
            const { result } = renderHook(() => useGameState());
            const initialLen = result.current.gameState.p1.d.length;

            act(() => { result.current.drawCard('p1'); });

            expect(result.current.gameState.p1.d.length).toBe(initialLen - 1);
        });

        it('引いたカードは表向きになる', () => {
            const { result } = renderHook(() => useGameState());
            const topCardId = result.current.gameState.p1.d[result.current.gameState.p1.d.length - 1];

            act(() => { result.current.drawCard('p1'); });

            expect(result.current.gameState.p1.c[topCardId].f).toBe(true);
        });
    });

    // ── shuffleDeck ──────────────────────────────────────────────
    describe('shuffleDeck', () => {
        it('シャッフル後も山札のサイズが変わらない', () => {
            const { result } = renderHook(() => useGameState());
            const initialLen = result.current.gameState.p1.d.length;

            act(() => { result.current.shuffleDeck('p1'); });

            expect(result.current.gameState.p1.d.length).toBe(initialLen);
        });

        it('シャッフル後、各カードのo値がdeck配列のインデックスと一致する', () => {
            const { result } = renderHook(() => useGameState());

            act(() => { result.current.shuffleDeck('p1'); });

            const { d, c } = result.current.gameState.p1;
            d.forEach((id, index) => {
                expect(c[id].o).toBe(index);
            });
        });
    });

    // ── returnToDeck ─────────────────────────────────────────────
    describe('returnToDeck', () => {
        it('bottom=falseで山札の末尾（一番上）に追加される', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.returnToDeck(card.id, false); });

            const deck = result.current.gameState.p1.d;
            expect(deck[deck.length - 1]).toBe(card.id);
        });

        it('bottom=trueで山札の先頭（一番下）に追加される', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.returnToDeck(card.id, true); });

            expect(result.current.gameState.p1.d[0]).toBe(card.id);
        });

        it('f=falseになり状態異常がクリアされる', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => {
                result.current.updateCardStatus(card.id, c => ({ ...c, cnd: ['paralyzed'] }));
            });
            act(() => { result.current.returnToDeck(card.id); });

            const returned = result.current.gameState.p1.c[card.id];
            expect(returned.f).toBe(false);
            expect(returned.cnd).toEqual([]);
        });
    });

    // ── returnAllHandToDeck ──────────────────────────────────────
    describe('returnAllHandToDeck', () => {
        it('手札のカードが全て山札に移動する', () => {
            const { result } = renderHook(() => useGameState());
            const handIds = getP1Cards(result.current.gameState, 'p1-hand').map(c => c.id);

            act(() => { result.current.returnAllHandToDeck('p1'); });

            handIds.forEach(id => {
                expect(result.current.gameState.p1.c[id].l).toBe('p1-deck');
            });
        });

        it('実行後、手札が空になる', () => {
            const { result } = renderHook(() => useGameState());

            act(() => { result.current.returnAllHandToDeck('p1'); });

            expect(getP1Cards(result.current.gameState, 'p1-hand').length).toBe(0);
        });

        it('移動したカードはf=false, d=0, cnd=[]になる', () => {
            const { result } = renderHook(() => useGameState());
            const card = getP1Card(result.current.gameState, 'p1-hand');

            act(() => {
                result.current.updateCardStatus(card.id, c => ({ ...c, d: 30, cnd: ['asleep'] }));
            });
            act(() => { result.current.returnAllHandToDeck('p1'); });

            const returned = result.current.gameState.p1.c[card.id];
            expect(returned.f).toBe(false);
            expect(returned.d).toBe(0);
            expect(returned.cnd).toEqual([]);
        });
    });
});
