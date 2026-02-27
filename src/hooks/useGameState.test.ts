import { renderHook } from '@testing-library/react';
import { useGameState } from './useGameState';
import defaultDeck from '../data/defaultDeck.json';

describe('useGameState hook', () => {
    it('initializes game state with flat deck from defaultDeck.json', () => {
        const { result } = renderHook(() => useGameState());

        const state = result.current.gameState;

        // Both players are initialized
        expect(state.p1).toBeDefined();
        expect(state.p2).toBeDefined();

        const p1Cards = Object.values(state.p1.c);
        expect(p1Cards.length).toBe(60);

        // Calculate expected card count from defaultDeck.json
        const expectedTotalCards = defaultDeck.cards.reduce((sum: number, card: any) => sum + card.count, 0);
        expect(expectedTotalCards).toBe(60);

        // Check locations based on logic: 1 active, 7 hand, 6 prize, 46 deck
        const p1Active = p1Cards.filter(c => c.l === 'p1-active');
        const p1Hand = p1Cards.filter(c => c.l === 'p1-hand');
        const p1Prize = p1Cards.filter(c => c.l === 'p1-prize');
        const p1Deck = p1Cards.filter(c => c.l === 'p1-deck');

        expect(p1Active.length).toBe(1);
        expect(p1Hand.length).toBe(7);
        expect(p1Prize.length).toBe(6);
        expect(p1Deck.length).toBe(46);

        // verify facedown status
        expect(p1Active[0].f).toBe(true);
        expect(p1Hand.every(c => c.f === true)).toBe(true);
        expect(p1Prize.every(c => c.f === false)).toBe(true);
        expect(p1Deck.every(c => c.f === false)).toBe(true);

        // Check the imageUrl exists (from defaultDeck)
        const sampleCard = p1Active[0];
        expect(sampleCard.imageUrl).toBeDefined();
        expect(typeof sampleCard.imageUrl).toBe('string');
        const cardInDataFile = defaultDeck.cards.find(c => c.name === sampleCard.name);
        expect(cardInDataFile).toBeDefined();
        expect(sampleCard.imageUrl).toBe(cardInDataFile?.imageUrl);
    });
});
