import { useState } from 'react';
import type { GameState, Card, PlayerState } from '../types/game';

import defaultDeck from '../data/defaultDeck.json';

// Utility to generate a basic mock card with loc and ord
const createMockCard = (id: string, name: string, l: string, o: number = 0, imageUrl?: string): Card => ({
    id,
    tId: 'mock-template',
    f: true,
    d: 0,
    cnd: [],
    name,
    l,
    o,
    imageUrl,
});

// Shuffle function
const shuffle = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Flatten deck data
const createFlatDeck = (idPrefix: string): Card[] => {
    let flatCards: Card[] = [];
    defaultDeck.cards.forEach((ci) => {
        for (let i = 0; i < ci.count; i++) {
            flatCards.push(createMockCard('', ci.name, '', 0, ci.imageUrl));
        }
    });
    // Shuffle the deck initially
    flatCards = shuffle(flatCards);

    // Assign IDs and final metadata
    return flatCards.map((c, i) => ({
        ...c,
        id: `${idPrefix}-${i + 1}`,
    }));
};


const generateInitialPlayer = (playerPrefix: string, playerName: string): PlayerState => {
    const p: PlayerState = {
        n: playerName,
        d: [],
        c: {},
    };

    const add = (c: Card) => { p.c[c.id] = c; };

    const deckCards = createFlatDeck(playerPrefix);
    
    // Distribute 60 cards
    // Active: 1, Bench: 0, Hand: 7, Prize: 6, Deck: 46 

    let currentIdx = 0;

    // Active (1)
    if (currentIdx < deckCards.length) {
        const c = deckCards[currentIdx++];
        add({ ...c, l: `${playerPrefix}-active`, o: 0, f: true });
    }

    // Hand (7)
    for (let i = 0; i < 7; i++) {
        if (currentIdx < deckCards.length) {
            const c = deckCards[currentIdx++];
            add({ ...c, l: `${playerPrefix}-hand`, o: i, f: true });
        }
    }

    // Prize (6)
    for (let i = 0; i < 6; i++) {
        if (currentIdx < deckCards.length) {
            const c = deckCards[currentIdx++];
            add({ ...c, l: `${playerPrefix}-prize`, o: i, f: false });
        }
    }

    // Deck (remaining)
    let deckOrder = 0;
    while(currentIdx < deckCards.length) {
        const c = deckCards[currentIdx++];
        p.d.push(c.id);
        add({ ...c, l: `${playerPrefix}-deck`, o: deckOrder++, f: false });
    }

    return p;
};

const initialMockState: GameState = {
    roomId: 'mock-room-1',
    m: {
        t: 'p1',
        s: 'playing',
        a: '',
    },
    p1: generateInitialPlayer('p1', 'Player 1'),
    p2: generateInitialPlayer('p2', 'Player 2 (Opponent)'),
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

    const returnToDeck = (cardId: string, bottom: boolean = false, shuffleAfter: boolean = false) => {
        setGameState((prev) => {
            let pPlayer = 'p1';
            if (prev.p2.c[cardId]) pPlayer = 'p2';
            else if (!prev.p1.c[cardId]) return prev;

            const targetPlayer = pPlayer as 'p1' | 'p2';
            const newState = { ...prev };
            
            newState[targetPlayer] = {
                ...newState[targetPlayer],
                c: { ...newState[targetPlayer].c },
                d: [...newState[targetPlayer].d]
            };
            
            const pState = newState[targetPlayer];
            const cardToReturn = pState.c[cardId];

            if (!cardToReturn) return prev;

            // Remove card from its current array (like hand) handled by state update
            
            // Add to deck
            if (bottom) {
                pState.d.unshift(cardId); // Add to bottom (index 0)
            } else {
                pState.d.push(cardId); // Add to top (end of array)
            }

            pState.c[cardId] = {
                ...cardToReturn,
                l: `${targetPlayer}-deck`,
                f: false,
                cnd: [] // Clear status conditions just in case
            };

            // Re-evaluate order of all cards in deck
            pState.d.forEach((id, index) => {
                if (pState.c[id]) {
                     pState.c[id] = {
                        ...pState.c[id],
                        o: index
                     }
                }
            });

            if (shuffleAfter) {
                pState.d = shuffle(pState.d);
                pState.d.forEach((id, index) => {
                    if (pState.c[id]) {
                         pState.c[id] = {
                            ...pState.c[id],
                            o: index
                         }
                    }
                });
            }

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-return-deck-${cardId}`
            };

            return newState;
        });
    };

    const drawCard = (playerId: string) => {
        setGameState((prev) => {
            const pPlayer = playerId === 'p1' || playerId === 'player-1' ? 'p1' : 'p2';
            const newState = { ...prev };
            newState[pPlayer] = {
                ...newState[pPlayer],
                c: { ...newState[pPlayer].c },
                d: [...newState[pPlayer].d]
            };
            const pState = newState[pPlayer];

            if (pState.d.length === 0) return prev;

            // Get top card ID from deck array
            const topCardId = pState.d.pop();
            if (!topCardId) return prev;

            const cardToDraw = pState.c[topCardId];
            if (!cardToDraw) return prev;

            // Use getCardsByLocation logic to find current hand size for ordering
            const handCards = Object.values(pState.c).filter(c => c.l === `${pPlayer}-hand`);
            const newOrder = handCards.length;

            pState.c[topCardId] = {
                ...cardToDraw,
                l: `${pPlayer}-hand`,
                o: newOrder,
                f: true // Face up in hand
            };

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-draw-${topCardId}`
            };

            return newState;
        });
    };

    const shuffleDeck = (playerId: string) => {
        setGameState((prev) => {
            const pPlayer = playerId === 'p1' || playerId === 'player-1' ? 'p1' : 'p2';
            const newState = { ...prev };
            newState[pPlayer] = {
                ...newState[pPlayer],
                c: { ...newState[pPlayer].c },
                d: [...newState[pPlayer].d]
            };
            const pState = newState[pPlayer];

            if (pState.d.length === 0) return prev;

            // Shuffle the deck array
            const newDeck = shuffle(pState.d);
            pState.d = newDeck;

            // Update order (o) for cards in the deck
            newDeck.forEach((cardId, index) => {
                if (pState.c[cardId]) {
                    pState.c[cardId] = {
                        ...pState.c[cardId],
                        // Ensure a new object is created
                        id: cardId, // just assigning an existing property safely to force a new object ref if needed, though ... spread already does it
                        o: index
                    };
                }
            });

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-shuffle-deck`
            };

            return newState;
        });
    };

    const returnAllHandToDeck = (playerId: string, bottom: boolean = false, shuffleAfter: boolean = false) => {
        setGameState((prev) => {
            const pPlayer = playerId === 'p1' || playerId === 'player-1' ? 'p1' : 'p2';
            const newState = { ...prev };

            newState[pPlayer] = {
                ...newState[pPlayer],
                c: { ...newState[pPlayer].c },
                d: [...newState[pPlayer].d]
            };

            const pState = newState[pPlayer];
            const handLoc = `${pPlayer}-hand`;

            // Find all cards in hand
            const handCardIds = Object.keys(pState.c).filter(id => pState.c[id].l === handLoc);
            if (handCardIds.length === 0) return prev;

            // Move each hand card to deck
            handCardIds.forEach(cardId => {
                if (bottom) {
                    pState.d.unshift(cardId);
                } else {
                    pState.d.push(cardId);
                }
                pState.c[cardId] = {
                    ...pState.c[cardId],
                    l: `${pPlayer}-deck`,
                    f: false,
                    d: 0,
                    cnd: []
                };
            });

            // Re-evaluate order
            if (shuffleAfter) {
                pState.d = shuffle(pState.d);
            }
            pState.d.forEach((id, index) => {
                if (pState.c[id]) {
                    pState.c[id] = { ...pState.c[id], o: index };
                }
            });

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-return-all-hand`
            };

            return newState;
        });
    };

    return { gameState, getCardsByLocation, moveCard, updateCardStatus, drawCard, shuffleDeck, returnToDeck, returnAllHandToDeck };
}
