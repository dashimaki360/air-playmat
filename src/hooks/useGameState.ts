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
    att: undefined,
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

// 指定カードに付属する全カードを再帰的に収集するヘルパー
const collectAllAttached = (cardId: string, cards: Record<string, Card>): Card[] => {
    const result: Card[] = [];
    const collect = (targetId: string) => {
        const attached = Object.values(cards).filter(c => c.att === targetId);
        for (const c of attached) {
            result.push(c);
            collect(c.id);
        }
    };
    collect(cardId);
    return result;
};

// カードの att チェーンを辿って、ルート（ベースポケモン）のIDを返すヘルパー
const findRootCardId = (card: Card, cards: Record<string, Card>): string => {
    let current = card;
    while (current.att && cards[current.att]) {
        current = cards[current.att];
    }
    return current.id;
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
    // att が設定されているカード（誰かに重ねられているカード）は除外し、独立カードのみ返す
    const getCardsByLocation = (loc: string): Card[] => {
        const allCards = [
            ...Object.values(gameState.p1.c),
            ...Object.values(gameState.p2.c)
        ];
        return allCards
            .filter(c => c.l === loc && !c.att)
            .sort((a, b) => a.o - b.o);
    };

    // 指定カードに付いている全カード（エネルギー・道具・進化カード）を取得
    const getAttachedCards = (cardId: string): Card[] => {
        const allCards = [
            ...Object.values(gameState.p1.c),
            ...Object.values(gameState.p2.c)
        ];
        // 直接 att が cardId のカードを再帰的に集める
        const result: Card[] = [];
        const collectAttached = (targetId: string) => {
            const attached = allCards.filter(c => c.att === targetId);
            for (const c of attached) {
                result.push(c);
                collectAttached(c.id); // 進化チェーンを辿る
            }
        };
        collectAttached(cardId);
        return result;
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
                // att されていない独立カードのみスワップ対象
                const existingActive = Object.values(pState.c).find(c => c.l === targetLoc && !c.att);
                if (existingActive && existingActive.id !== cardId) {
                    pState.c[existingActive.id] = {
                        ...existingActive,
                        l: sourceLoc, // 元の場所に押し戻す
                        o: 999 // ひとまず末尾へ
                    };
                    // スワップ対象のカードに付属しているカードも一緒に移動
                    const swapAttached = Object.values(pState.c).filter(c => c.att && findRootCardId(c, pState.c) === existingActive.id);
                    swapAttached.forEach(ac => {
                        pState.c[ac.id] = { ...ac, l: sourceLoc };
                    });
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

            // 付属カード（エネルギー・道具・進化）も一緒に移動
            const attachedCards = collectAllAttached(cardId, pState.c);
            attachedCards.forEach(ac => {
                pState.c[ac.id] = { ...ac, l: targetLoc };
            });

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

    // カードを別のカードに重ねる（進化・エネルギー・道具付与）
    const attachCard = (cardId: string, targetCardId: string) => {
        setGameState((prev) => {
            // Determine which player owns the card
            let pPlayer = 'p1';
            if (prev.p2.c[cardId]) pPlayer = 'p2';
            else if (!prev.p1.c[cardId]) return prev;

            const targetPlayerObj = pPlayer as 'p1' | 'p2';
            const newState = { ...prev };

            newState[targetPlayerObj] = {
                ...prev[targetPlayerObj],
                c: { ...prev[targetPlayerObj].c },
                d: [...prev[targetPlayerObj].d]
            };

            const pState = newState[targetPlayerObj];
            const cardToAttach = pState.c[cardId];
            const targetCard = pState.c[targetCardId];

            if (!cardToAttach || !targetCard) return prev;

            // カードの att と location を更新
            pState.c[cardId] = {
                ...cardToAttach,
                att: targetCardId,
                l: targetCard.l, // 親カードと同じ location に
                f: true, // 表向き
            };

            // 山札から取り除く
            if (cardToAttach.l.includes('-deck')) {
                pState.d = pState.d.filter(id => id !== cardId);
            }

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-attach-${cardId}-to-${targetCardId}`
            };

            return newState;
        });
    };

    // 重ねたカードを外して別の場所へ移動
    const detachCard = (cardId: string, targetLoc: string) => {
        setGameState((prev) => {
            let pPlayer = 'p1';
            if (prev.p2.c[cardId]) pPlayer = 'p2';
            else if (!prev.p1.c[cardId]) return prev;

            const targetPlayerObj = pPlayer as 'p1' | 'p2';
            const newState = { ...prev };

            newState[targetPlayerObj] = {
                ...prev[targetPlayerObj],
                c: { ...prev[targetPlayerObj].c },
                d: [...prev[targetPlayerObj].d]
            };

            const pState = newState[targetPlayerObj];
            const card = pState.c[cardId];
            if (!card) return prev;

            // 移動先のorder計算
            const targetCards = Object.values(pState.c).filter(c => c.l === targetLoc && !c.att);
            const newOrder = targetCards.length;

            pState.c[cardId] = {
                ...card,
                att: undefined,
                l: targetLoc,
                o: newOrder,
            };

            // 山札への移動処理
            if (targetLoc.includes('-deck')) {
                pState.d.push(cardId);
                pState.c[cardId] = { ...pState.c[cardId], f: false };
            }
            if (targetLoc.includes('-hand')) {
                pState.c[cardId] = { ...pState.c[cardId], f: true };
            }

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-detach-${cardId}`
            };

            return newState;
        });
    };

    // ポケモンと付いているカード全てをトラッシュに送る（きぜつ処理）
    const trashWithAttachments = (cardId: string) => {
        setGameState((prev) => {
            let pPlayer = 'p1';
            if (prev.p2.c[cardId]) pPlayer = 'p2';
            else if (!prev.p1.c[cardId]) return prev;

            const targetPlayerObj = pPlayer as 'p1' | 'p2';
            const newState = { ...prev };

            newState[targetPlayerObj] = {
                ...prev[targetPlayerObj],
                c: { ...prev[targetPlayerObj].c },
                d: [...prev[targetPlayerObj].d]
            };

            const pState = newState[targetPlayerObj];
            const trashLoc = `${pPlayer}-trash`;

            // 付属カードを全て収集（再帰的）
            const allAttached = collectAllAttached(cardId, pState.c);
            const allCardIds = [cardId, ...allAttached.map(c => c.id)];

            // 全てトラッシュに移動
            const trashCards = Object.values(pState.c).filter(c => c.l === trashLoc);
            let trashOrder = trashCards.length;

            allCardIds.forEach(id => {
                if (pState.c[id]) {
                    pState.c[id] = {
                        ...pState.c[id],
                        l: trashLoc,
                        att: undefined,
                        f: true, // トラッシュは表向き
                        d: 0, // ダメージリセット
                        cnd: [], // 状態異常リセット
                        o: trashOrder++,
                    };
                    // 山札から取り除く
                    pState.d = pState.d.filter(dId => dId !== id);
                }
            });

            newState.m = {
                ...prev.m,
                a: `${pPlayer}-trash-${cardId}-with-attachments`
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

    return { gameState, getCardsByLocation, getAttachedCards, moveCard, attachCard, detachCard, trashWithAttachments, updateCardStatus, drawCard, shuffleDeck, returnToDeck, returnAllHandToDeck };
}
