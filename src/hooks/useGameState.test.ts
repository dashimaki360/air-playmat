import { renderHook, act } from '@testing-library/react';
import { useGameState, createInitialState, applyMoveCard, applyAttachCard, applyDetachCard, applyTrashWithAttachments, applyUpdateCardStatus, applyDrawCard, applyShuffleDeck, applyReturnToDeck, applyReturnAllHandToDeck, queryCardsByLocation, queryAttachedCards } from './useGameState';
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

        expect(p1Active.length).toBe(0);
        expect(p1Hand.length).toBe(7);
        expect(p1Prize.length).toBe(6);
        expect(p1Deck.length).toBe(47);

        expect(p1Hand.every(c => c.f === true)).toBe(true);
        expect(p1Prize.every(c => c.f === false)).toBe(true);
        expect(p1Deck.every(c => c.f === false)).toBe(true);

        const sampleCard = p1Hand[0];
        const cardInDataFile = defaultDeck.cards.find(c => c.id === sampleCard.cId);
        expect(cardInDataFile).toBeDefined();
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
            const [first, second] = getP1Cards(result.current.gameState, 'p1-hand');

            // まず1枚をactiveに配置
            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });
            // 2枚目をactiveに移動（スワップ発生）
            act(() => { result.current.moveCard(second.id, 'p1-hand', 'p1-active'); });

            expect(result.current.gameState.p1.c[second.id].l).toBe('p1-active');
            expect(result.current.gameState.p1.c[first.id].l).toBe('p1-hand');
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
            const [first, second] = getP1Cards(result.current.gameState, 'p1-hand');

            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });
            act(() => { result.current.attachCard(second.id, first.id); });

            expect(result.current.gameState.p1.c[second.id].l).toBe('p1-active');
        });

        it('重ねたカードは表向きになる', () => {
            const { result } = renderHook(() => useGameState());
            const [card, target] = getP1Cards(result.current.gameState, 'p1-hand');

            act(() => { result.current.attachCard(card.id, target.id); });

            expect(result.current.gameState.p1.c[card.id].f).toBe(true);
        });

        it('山札のカードをattachすると山札配列から削除される', () => {
            const { result } = renderHook(() => useGameState());
            const handCard = getP1Card(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(handCard.id, 'p1-hand', 'p1-active'); });

            const deckCardId = result.current.gameState.p1.d[0];
            const initialLen = result.current.gameState.p1.d.length;

            act(() => { result.current.attachCard(deckCardId, handCard.id); });

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
            const handCard = getP1Card(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(handCard.id, 'p1-hand', 'p1-active'); });

            const deckCard = result.current.gameState.p1.d[0];

            act(() => { result.current.attachCard(deckCard, handCard.id); });
            act(() => { result.current.detachCard(deckCard, 'p1-hand'); });

            expect(result.current.gameState.p1.c[deckCard].f).toBe(true);
        });
    });

    // ── trashWithAttachments ─────────────────────────────────────
    describe('trashWithAttachments', () => {
        it('カードがトラッシュに移動する', () => {
            const { result } = renderHook(() => useGameState());
            const handCard = getP1Card(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(handCard.id, 'p1-hand', 'p1-active'); });

            act(() => { result.current.trashWithAttachments(handCard.id); });

            expect(result.current.gameState.p1.c[handCard.id].l).toBe('p1-trash');
        });

        it('ダメージ・状態異常・att がリセットされる', () => {
            const { result } = renderHook(() => useGameState());
            const handCard = getP1Card(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(handCard.id, 'p1-hand', 'p1-active'); });

            act(() => {
                result.current.updateCardStatus(handCard.id, c => ({ ...c, d: 100, cnd: ['burn', 'poison'] }));
            });
            act(() => { result.current.trashWithAttachments(handCard.id); });

            const trashed = result.current.gameState.p1.c[handCard.id];
            expect(trashed.d).toBe(0);
            expect(trashed.cnd).toEqual([]);
            expect(trashed.att).toBeUndefined();
            expect(trashed.f).toBe(true);
        });

        it('付属カードも一緒にトラッシュに移動する', () => {
            const { result } = renderHook(() => useGameState());
            const [first, second] = getP1Cards(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });

            act(() => { result.current.attachCard(second.id, first.id); });
            act(() => { result.current.trashWithAttachments(first.id); });

            expect(result.current.gameState.p1.c[second.id].l).toBe('p1-trash');
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

    // ── getCardsByLocation ───────────────────────────────────────
    describe('getCardsByLocation', () => {
        it('指定locationのカードを返す', () => {
            const { result } = renderHook(() => useGameState());
            const handCards = result.current.getCardsByLocation('p1-hand');
            expect(handCards.length).toBe(7);
            expect(handCards.every(c => c.l === 'p1-hand')).toBe(true);
        });

        it('att が設定された付属カードは除外される', () => {
            const { result } = renderHook(() => useGameState());
            const [first, second] = getP1Cards(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });

            act(() => { result.current.attachCard(second.id, first.id); });

            const handCards = result.current.getCardsByLocation('p1-hand');
            expect(handCards.find(c => c.id === second.id)).toBeUndefined();
        });

        it('orderでソートされる', () => {
            const { result } = renderHook(() => useGameState());
            const handCards = result.current.getCardsByLocation('p1-hand');
            for (let i = 1; i < handCards.length; i++) {
                expect(handCards[i].o).toBeGreaterThanOrEqual(handCards[i - 1].o);
            }
        });

        it('p1とp2両方のカードを含む全体から検索する', () => {
            const { result } = renderHook(() => useGameState());
            const p2Hand = result.current.getCardsByLocation('p2-hand');
            expect(p2Hand.length).toBe(7);
        });
    });

    // ── getAttachedCards ─────────────────────────────────────────
    describe('getAttachedCards', () => {
        it('付属カードがない場合は空配列を返す', () => {
            const { result } = renderHook(() => useGameState());
            const handCard = getP1Card(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(handCard.id, 'p1-hand', 'p1-active'); });
            expect(result.current.getAttachedCards(handCard.id)).toEqual([]);
        });

        it('直接付属した1枚を返す', () => {
            const { result } = renderHook(() => useGameState());
            const [first, second] = getP1Cards(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });

            act(() => { result.current.attachCard(second.id, first.id); });

            const attached = result.current.getAttachedCards(first.id);
            expect(attached.length).toBe(1);
            expect(attached[0].id).toBe(second.id);
        });

        it('複数枚付属している場合は全て返す', () => {
            const { result } = renderHook(() => useGameState());
            const [first, second, third] = getP1Cards(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });

            act(() => { result.current.attachCard(second.id, first.id); });
            act(() => { result.current.attachCard(third.id, first.id); });

            const attached = result.current.getAttachedCards(first.id);
            expect(attached.length).toBe(2);
            expect(attached.map(c => c.id)).toContain(second.id);
            expect(attached.map(c => c.id)).toContain(third.id);
        });

        it('進化チェーン（再帰）を辿って全て返す', () => {
            const { result } = renderHook(() => useGameState());
            const [first, evo1, evo2] = getP1Cards(result.current.gameState, 'p1-hand');
            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });

            act(() => { result.current.attachCard(evo1.id, first.id); });
            act(() => { result.current.attachCard(evo2.id, evo1.id); });

            const attached = result.current.getAttachedCards(first.id);
            expect(attached.length).toBe(2);
            expect(attached.map(c => c.id)).toContain(evo1.id);
            expect(attached.map(c => c.id)).toContain(evo2.id);
        });
    });

    // ── moveCard 追加ケース ──────────────────────────────────────
    describe('moveCard (追加ケース)', () => {
        it('activeスワップ時に既存activeの付属カードも一緒に sourceLoc へ移動する', () => {
            const { result } = renderHook(() => useGameState());
            const [first, second, third] = getP1Cards(result.current.gameState, 'p1-hand');

            // まず1枚をactiveに配置
            act(() => { result.current.moveCard(first.id, 'p1-hand', 'p1-active'); });
            // activeにエネルギー（second）を付ける
            act(() => { result.current.attachCard(second.id, first.id); });
            // thirdをactiveに移動（スワップ発生）
            act(() => { result.current.moveCard(third.id, 'p1-hand', 'p1-active'); });

            // 旧activeはthirdの元の場所（p1-hand）へ
            expect(result.current.gameState.p1.c[first.id].l).toBe('p1-hand');
            // 旧activeの付属カード（second）も一緒にp1-handへ
            expect(result.current.gameState.p1.c[second.id].l).toBe('p1-hand');
        });

        it('targetIndex を指定するとその order になる', () => {
            const { result } = renderHook(() => useGameState());
            const hand = getP1Card(result.current.gameState, 'p1-hand');

            act(() => { result.current.moveCard(hand.id, 'p1-hand', 'p1-bench', 5); });

            expect(result.current.gameState.p1.c[hand.id].o).toBe(5);
        });

        it('p2のカードも正しく移動できる', () => {
            const { result } = renderHook(() => useGameState());
            const p2Hand = Object.values(result.current.gameState.p2.c).find(c => c.l === 'p2-hand')!;

            act(() => { result.current.moveCard(p2Hand.id, 'p2-hand', 'p2-bench'); });

            expect(result.current.gameState.p2.c[p2Hand.id].l).toBe('p2-bench');
        });

        it('存在しないcardIdの場合は状態が変わらない', () => {
            const { result } = renderHook(() => useGameState());
            const before = result.current.gameState;

            act(() => { result.current.moveCard('non-existent', 'p1-hand', 'p1-bench'); });

            expect(result.current.gameState).toBe(before);
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

// ── 純粋関数の直接テスト ──────────────────────────────────────
describe('pure functions (apply*)', () => {
    const getState = () => createInitialState();
    const getP1Card = (state: ReturnType<typeof createInitialState>, loc: string) =>
        Object.values(state.p1.c).find(c => c.l === loc)!;
    const getP1Cards = (state: ReturnType<typeof createInitialState>, loc: string) =>
        Object.values(state.p1.c).filter(c => c.l === loc);

    describe('applyMoveCard', () => {
        it('カードを移動し新しいstateを返す（元のstateは不変）', () => {
            const state = getState();
            const card = getP1Card(state, 'p1-hand');
            const next = applyMoveCard(state, card.id, 'p1-hand', 'p1-bench');

            expect(next).not.toBe(state);
            expect(next.p1.c[card.id].l).toBe('p1-bench');
            expect(state.p1.c[card.id].l).toBe('p1-hand'); // 元は不変
        });

        it('存在しないcardIdでは同じstateを返す', () => {
            const state = getState();
            const next = applyMoveCard(state, 'non-existent', 'p1-hand', 'p1-bench');
            expect(next).toBe(state);
        });
    });

    describe('applyAttachCard', () => {
        it('attフィールドを設定して新しいstateを返す', () => {
            const state = getState();
            const [first, second] = getP1Cards(state, 'p1-hand');
            const withActive = applyMoveCard(state, first.id, 'p1-hand', 'p1-active');
            const next = applyAttachCard(withActive, second.id, first.id);

            expect(next.p1.c[second.id].att).toBe(first.id);
            expect(next.p1.c[second.id].l).toBe('p1-active');
            expect(state.p1.c[second.id].att).toBeUndefined(); // 元は不変
        });
    });

    describe('applyDetachCard', () => {
        it('attを解除して新しい位置に移動する', () => {
            const state = getState();
            const [first, second] = getP1Cards(state, 'p1-hand');
            const withActive = applyMoveCard(state, first.id, 'p1-hand', 'p1-active');
            const attached = applyAttachCard(withActive, second.id, first.id);
            const next = applyDetachCard(attached, second.id, 'p1-hand');

            expect(next.p1.c[second.id].att).toBeUndefined();
            expect(next.p1.c[second.id].l).toBe('p1-hand');
        });
    });

    describe('applyTrashWithAttachments', () => {
        it('カードと付属カードをトラッシュに送る', () => {
            const state = getState();
            const [first, second] = getP1Cards(state, 'p1-hand');
            const withActive = applyMoveCard(state, first.id, 'p1-hand', 'p1-active');
            const attached = applyAttachCard(withActive, second.id, first.id);
            const next = applyTrashWithAttachments(attached, first.id);

            expect(next.p1.c[first.id].l).toBe('p1-trash');
            expect(next.p1.c[second.id].l).toBe('p1-trash');
            expect(next.p1.c[first.id].d).toBe(0);
            expect(next.p1.c[first.id].cnd).toEqual([]);
        });
    });

    describe('applyUpdateCardStatus', () => {
        it('カードのステータスを更新する', () => {
            const state = getState();
            const card = getP1Card(state, 'p1-hand');
            const next = applyUpdateCardStatus(state, card.id, c => ({ ...c, d: 60 }));

            expect(next.p1.c[card.id].d).toBe(60);
            expect(state.p1.c[card.id].d).toBe(0); // 元は不変
        });
    });

    describe('applyDrawCard', () => {
        it('山札の一番上のカードを手札に加える', () => {
            const state = getState();
            const topCardId = state.p1.d[state.p1.d.length - 1];
            const next = applyDrawCard(state, 'p1');

            expect(next.p1.c[topCardId].l).toBe('p1-hand');
            expect(next.p1.d.length).toBe(state.p1.d.length - 1);
        });
    });

    describe('applyShuffleDeck', () => {
        it('シャッフル後も山札のサイズが変わらない', () => {
            const state = getState();
            const next = applyShuffleDeck(state, 'p1');
            expect(next.p1.d.length).toBe(state.p1.d.length);
        });
    });

    describe('applyReturnToDeck', () => {
        it('カードを山札に戻す', () => {
            const state = getState();
            const card = getP1Card(state, 'p1-hand');
            const next = applyReturnToDeck(state, card.id, false);

            expect(next.p1.c[card.id].l).toBe('p1-deck');
            expect(next.p1.c[card.id].f).toBe(false);
            expect(next.p1.d[next.p1.d.length - 1]).toBe(card.id);
        });
    });

    describe('applyReturnAllHandToDeck', () => {
        it('全手札を山札に戻す', () => {
            const state = getState();
            const handCards = getP1Cards(state, 'p1-hand');
            const next = applyReturnAllHandToDeck(state, 'p1');

            handCards.forEach(c => {
                expect(next.p1.c[c.id].l).toBe('p1-deck');
            });
            const nextHand = Object.values(next.p1.c).filter(c => c.l === 'p1-hand');
            expect(nextHand.length).toBe(0);
        });
    });

    describe('queryCardsByLocation', () => {
        it('指定locationのカードを返す', () => {
            const state = getState();
            const handCards = queryCardsByLocation(state, 'p1-hand');
            expect(handCards.length).toBe(7);
            expect(handCards.every(c => c.l === 'p1-hand')).toBe(true);
        });
    });

    describe('queryAttachedCards', () => {
        it('付属カードを返す', () => {
            const state = getState();
            const [first, second] = getP1Cards(state, 'p1-hand');
            const withActive = applyMoveCard(state, first.id, 'p1-hand', 'p1-active');
            const attached = applyAttachCard(withActive, second.id, first.id);

            const result = queryAttachedCards(attached, first.id);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe(second.id);
        });
    });
});
