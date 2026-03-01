import { describe, it, expect } from 'vitest';
import { computeFirebaseUpdates } from '../lib/firebaseDelta';
import { createInitialState, applyMoveCard, applyDrawCard, applyAttachCard, applyUpdateCardStatus } from './useGameState';

describe('computeFirebaseUpdates', () => {
    const roomId = '1234';

    it('変更がない場合は空のオブジェクトを返す', () => {
        const state = createInitialState();
        const updates = computeFirebaseUpdates(roomId, state, state);
        expect(Object.keys(updates).length).toBe(0);
    });

    it('カード移動で変更されたカードとデッキ配列のみを含む', () => {
        const state = createInitialState();
        const handCard = Object.values(state.p1.c).find(c => c.l === 'p1-hand')!;
        const next = applyMoveCard(state, handCard.id, 'p1-hand', 'p1-bench');

        const updates = computeFirebaseUpdates(roomId, state, next);

        // カード + lastAction は含まれるべき
        expect(updates[`rooms/${roomId}/state/p1/c/${handCard.id}`]).toBeDefined();
        expect(updates[`rooms/${roomId}/state/m/a`]).toBeDefined();

        // p2側のカードは含まれないべき
        const p2Keys = Object.keys(updates).filter(k => k.includes('/p2/c/'));
        expect(p2Keys.length).toBe(0);
    });

    it('drawCardでデッキ配列とカードの差分のみを含む', () => {
        const state = createInitialState();
        const next = applyDrawCard(state, 'p1');

        const updates = computeFirebaseUpdates(roomId, state, next);

        // デッキ配列の変更
        expect(updates[`rooms/${roomId}/state/p1/d`]).toBeDefined();
        // lastAction
        expect(updates[`rooms/${roomId}/state/m/a`]).toBeDefined();
    });

    it('attachCardで変更されたカードのみを含む', () => {
        const state = createInitialState();
        const active = Object.values(state.p1.c).find(c => c.l === 'p1-active')!;
        const hand = Object.values(state.p1.c).find(c => c.l === 'p1-hand')!;
        const next = applyAttachCard(state, hand.id, active.id);

        const updates = computeFirebaseUpdates(roomId, state, next);

        // attach されたカードの変更
        expect(updates[`rooms/${roomId}/state/p1/c/${hand.id}`]).toBeDefined();
        // lastAction
        expect(updates[`rooms/${roomId}/state/m/a`]).toBeDefined();
    });

    it('updateCardStatusでダメージ変更のみ', () => {
        const state = createInitialState();
        const card = Object.values(state.p1.c).find(c => c.l === 'p1-hand')!;
        const next = applyUpdateCardStatus(state, card.id, c => ({ ...c, d: 60 }));

        const updates = computeFirebaseUpdates(roomId, state, next);

        expect(updates[`rooms/${roomId}/state/p1/c/${card.id}`]).toBeDefined();
        // updateCardStatus では m.a は変わらないので含まれない
        expect(updates[`rooms/${roomId}/state/m/a`]).toBeUndefined();
    });
});
