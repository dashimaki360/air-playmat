import { useState } from 'react';
import type { GameState, Card } from '../types/game';

// Utility to generate a basic mock card with loc and ord
const createMockCard = (id: string, name: string, loc: string, ord: number = 0): Card => ({
    id,
    tId: 'mock-template',
    face: true,
    dmg: 0,
    cnd: [],
    name,
    loc,
    ord,
});

const generateInitialCards = (): Record<string, Card> => {
    const cards: Record<string, Card> = {};

    // Helper to add card to the map
    const add = (c: Card) => { cards[c.id] = c; };

    // Player 1 Hand (7)
    add(createMockCard('p1-hand-1', 'Pikachu', 'p1-hand', 0));
    add(createMockCard('p1-hand-2', 'Potion', 'p1-hand', 1));
    add(createMockCard('p1-hand-3', 'Professor Oak', 'p1-hand', 2));
    add(createMockCard('p1-hand-4', 'Water Energy', 'p1-hand', 3));
    add(createMockCard('p1-hand-5', 'Water Energy', 'p1-hand', 4));
    add(createMockCard('p1-hand-6', 'Water Energy', 'p1-hand', 5));
    add(createMockCard('p1-hand-7', 'Pokeball', 'p1-hand', 6));

    // Player 1 Deck (44)
    for (let i = 0; i < 44; i++) {
        add({ ...createMockCard(`p1-deck-${i + 1}`, `Deck Card ${i + 1}`, 'p1-deck', i), face: false });
    }

    // Player 1 Active (1), Bench (2), Prize (6)
    add(createMockCard('p1-active-1', 'Charizard', 'p1-active', 0));
    add(createMockCard('p1-bench-1', 'Charmander', 'p1-bench', 0));
    add(createMockCard('p1-bench-2', 'Bulbasaur', 'p1-bench', 1));
    for (let i = 0; i < 6; i++) {
        add({ ...createMockCard(`p1-prize-${i + 1}`, `Prize ${i + 1}`, 'p1-prize', i), face: false });
    }

    // Player 2 Hand (4), Deck (47), Active (1), Bench (1), Prize (6)
    add(createMockCard('p2-hand-1', 'Eevee', 'p2-hand', 0));
    add(createMockCard('p2-hand-2', 'Switch', 'p2-hand', 1));
    add(createMockCard('p2-hand-3', 'Great Ball', 'p2-hand', 2));
    add(createMockCard('p2-hand-4', 'Fire Energy', 'p2-hand', 3));
    for (let i = 0; i < 47; i++) {
        add({ ...createMockCard(`p2-deck-${i + 1}`, `P2 Deck Card ${i + 1}`, 'p2-deck', i), face: false });
    }
    add(createMockCard('p2-active-1', 'Blastoise', 'p2-active', 0));
    add(createMockCard('p2-bench-1', 'Meowth', 'p2-bench', 0));
    for (let i = 0; i < 6; i++) {
        add({ ...createMockCard(`p2-prize-${i + 1}`, `P2 Prize ${i + 1}`, 'p2-prize', i), face: false });
    }

    return cards;
};

const initialMockState: GameState = {
    roomId: 'mock-room-1',
    players: {
        'player-1': { name: 'Player 1' },
        'player-2': { name: 'Player 2 (Opponent)' },
    },
    cards: generateInitialCards(),
};

export function useGameState() {
    const [gameState, setGameState] = useState<GameState>(initialMockState);

    // Get cards grouped/sorted by location for easy UI rendering
    const getCardsByLocation = (loc: string): Card[] => {
        return Object.values(gameState.cards)
            .filter(c => c.loc === loc)
            .sort((a, b) => a.ord - b.ord);
    };

    const moveCard = (
        cardId: string,
        sourceLoc: string, // e.g., "p1-hand"
        targetLoc: string, // e.g., "p1-active"
        targetIndex?: number
    ) => {
        setGameState((prev) => {
            const newState = { ...prev, cards: { ...prev.cards } };
            const cardToMove = newState.cards[cardId];
            if (!cardToMove) return prev;

            // Optional: スワップロジックの適応（Activeに既にカードがある場合、元の配置に戻す）
            if (targetLoc.includes('-active')) {
                const existingActive = Object.values(newState.cards).find(c => c.loc === targetLoc);
                if (existingActive && existingActive.id !== cardId) {
                    newState.cards[existingActive.id] = {
                        ...existingActive,
                        loc: sourceLoc, // 元の場所に押し戻す
                        ord: 999 // ひとまず末尾へ
                    };
                }
            }

            // カードの移動先とOrderを更新
            // ※本来は配列のようにtargetIndexに挿入するためのOrder再計算が必要ですが、一旦簡易的に末尾移動としています
            const targetCards = Object.values(newState.cards).filter(c => c.loc === targetLoc);
            const newOrder = targetIndex !== undefined ? targetIndex : targetCards.length;

            newState.cards[cardId] = {
                ...cardToMove,
                loc: targetLoc,
                ord: newOrder
            };

            return newState;
        });
    };

    const updateCardStatus = (cardId: string, updater: (c: Card) => Card) => {
        setGameState((prev) => {
            if (!prev.cards[cardId]) return prev;
            
            const newState = { ...prev, cards: { ...prev.cards } };
            newState.cards[cardId] = updater(newState.cards[cardId]);
            return newState;
        });
    };

    return { gameState, getCardsByLocation, moveCard, updateCardStatus };
}
