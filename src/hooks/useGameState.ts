import { useState } from 'react';
import type { GameState, Card, PlayerState } from '../types/game';

// Utility to generate a basic mock card with loc and ord
const createMockCard = (id: string, name: string, l: string, o: number = 0): Card => ({
    id,
    tId: 'mock-template',
    f: true,
    d: 0,
    cnd: [],
    name,
    l,
    o,
});

const generateInitialPlayer1 = (): PlayerState => {
    const p1: PlayerState = {
        n: 'Player 1',
        d: [],
        c: {},
    };

    const add = (c: Card) => { p1.c[c.id] = c; };

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
        const id = `p1-deck-${i + 1}`;
        p1.d.push(id);
        add({ ...createMockCard(id, `Deck Card ${i + 1}`, 'p1-deck', i), f: false });
    }

    // Player 1 Active (1), Bench (2), Prize (6)
    add(createMockCard('p1-active-1', 'Charizard', 'p1-active', 0));
    add(createMockCard('p1-bench-1', 'Charmander', 'p1-bench', 0));
    add(createMockCard('p1-bench-2', 'Bulbasaur', 'p1-bench', 1));
    for (let i = 0; i < 6; i++) {
        add({ ...createMockCard(`p1-prize-${i + 1}`, `Prize ${i + 1}`, 'p1-prize', i), f: false });
    }

    return p1;
};

const generateInitialPlayer2 = (): PlayerState => {
    const p2: PlayerState = {
        n: 'Player 2 (Opponent)',
        d: [],
        c: {},
    };

    const add = (c: Card) => { p2.c[c.id] = c; };

    // Player 2 Hand (4), Deck (47), Active (1), Bench (1), Prize (6)
    add(createMockCard('p2-hand-1', 'Eevee', 'p2-hand', 0));
    add(createMockCard('p2-hand-2', 'Switch', 'p2-hand', 1));
    add(createMockCard('p2-hand-3', 'Great Ball', 'p2-hand', 2));
    add(createMockCard('p2-hand-4', 'Fire Energy', 'p2-hand', 3));
    for (let i = 0; i < 47; i++) {
        const id = `p2-deck-${i + 1}`;
        p2.d.push(id);
        add({ ...createMockCard(id, `P2 Deck Card ${i + 1}`, 'p2-deck', i), f: false });
    }
    add(createMockCard('p2-active-1', 'Blastoise', 'p2-active', 0));
    add(createMockCard('p2-bench-1', 'Meowth', 'p2-bench', 0));
    for (let i = 0; i < 6; i++) {
        add({ ...createMockCard(`p2-prize-${i + 1}`, `P2 Prize ${i + 1}`, 'p2-prize', i), f: false });
    }

    return p2;
};

const initialMockState: GameState = {
    roomId: 'mock-room-1',
    m: {
        t: 'p1',
        s: 'playing',
        a: '',
    },
    p1: generateInitialPlayer1(),
    p2: generateInitialPlayer2(),
};

export function useGameState() {
    const [gameState, setGameState] = useState<GameState>(initialMockState);

    // Get cards grouped/sorted by location for easy UI rendering
    const getCardsByLocation = (loc: string): Card[] => {
        const allCards = [
            ...Object.values(gameState.p1.c),
            ...Object.values(gameState.p2.c)
        ];
        return allCards
            .filter(c => c.l === loc)
            .sort((a, b) => a.o - b.o);
    };

    const moveCard = (
        cardId: string,
        sourceLoc: string, // e.g., "p1-hand"
        targetLoc: string, // e.g., "p1-active"
        targetIndex?: number
    ) => {
        setGameState((prev) => {
            const newState = { ...prev };
            
            // Determine which player owns the card
            let pPlayer = 'p1';
            if (prev.p2.c[cardId]) pPlayer = 'p2';
            else if (!prev.p1.c[cardId]) return prev;

            const targetPlayerObj = pPlayer as 'p1' | 'p2';
            
            newState[targetPlayerObj] = {
                ...prev[targetPlayerObj],
                c: { ...prev[targetPlayerObj].c },
                d: [...prev[targetPlayerObj].d]
            };
            
            const pState = newState[targetPlayerObj];
            const cardToMove = pState.c[cardId];

            // Optional: スワップロジックの適応（Activeに既にカードがある場合、元の配置に戻す）
            if (targetLoc.includes('-active')) {
                const existingActive = Object.values(pState.c).find(c => c.l === targetLoc);
                if (existingActive && existingActive.id !== cardId) {
                    pState.c[existingActive.id] = {
                        ...existingActive,
                        l: sourceLoc, // 元の場所に押し戻す
                        o: 999 // ひとまず末尾へ
                    };
                }
            }

            // カードの移動先とOrderを更新
            const targetCards = Object.values(pState.c).filter(c => c.l === targetLoc);
            const newOrder = targetIndex !== undefined ? targetIndex : targetCards.length;

            pState.c[cardId] = {
                ...cardToMove,
                l: targetLoc,
                o: newOrder
            };

            // 山札配列の調整処理
            if (sourceLoc.includes('-deck')) {
                pState.d = pState.d.filter(id => id !== cardId);
            }
            if (targetLoc.includes('-deck')) {
                pState.d.push(cardId);
            }

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-move-${cardId}`
            };

            return newState;
        });
    };

    const updateCardStatus = (cardId: string, updater: (c: Card) => Card) => {
        setGameState((prev) => {
            let pPlayer = 'p1';
            if (prev.p2.c[cardId]) pPlayer = 'p2';
            else if (!prev.p1.c[cardId]) return prev;

            const targetPlayer = pPlayer as 'p1' | 'p2';
            const newState = { ...prev };
            
            newState[targetPlayer] = {
                ...newState[targetPlayer],
                c: { ...newState[targetPlayer].c }
            };
            
            newState[targetPlayer].c[cardId] = updater(newState[targetPlayer].c[cardId]);
            return newState;
        });
    };

    return { gameState, getCardsByLocation, moveCard, updateCardStatus };
}
