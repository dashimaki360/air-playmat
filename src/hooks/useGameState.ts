import { useState, useCallback } from 'react';
import type { GameState, Card, CardType, PlayerState, CardInfo } from '../types/game';

import defaultDeck from '../data/defaultDeck.json';

const CARD_TYPE_MAP: Record<string, CardType> = {
    'ポケモン':         'pokemon',
    'グッズ':           'item',
    'ポケモンのどうぐ': 'pokemon-tool',
    'サポート':         'supporter',
    'スタジアム':       'stadium',
    'エネルギー':       'energy',
    'わざマシン':       'technical-machine',
};

// Utility to generate a basic mock card with loc and ord
const createMockCard = (id: string, name: string, l: string, o: number = 0, imageUrl?: string, tp?: CardType): Card => ({
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
    tp,
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
const createFlatDeck = (idPrefix: string, deckCards?: CardInfo[]): Card[] => {
    const source = deckCards || defaultDeck.cards;
    let flatCards: Card[] = [];
    source.forEach((ci) => {
        for (let i = 0; i < ci.count; i++) {
            flatCards.push(createMockCard('', ci.name, '', 0, ci.imageUrl, CARD_TYPE_MAP[ci.type || '']));
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


const generateInitialPlayer = (playerPrefix: string, playerName: string, deckCards?: CardInfo[]): PlayerState => {
    const p: PlayerState = {
        n: playerName,
        d: [],
        c: {},
    };

    const add = (c: Card) => { p.c[c.id] = c; };

    const allCards = createFlatDeck(playerPrefix, deckCards);
    
    // Distribute 60 cards
    // Active: 1, Bench: 0, Hand: 7, Prize: 6, Deck: 46 

    let currentIdx = 0;

    // Active (1)
    if (currentIdx < allCards.length) {
        const c = allCards[currentIdx++];
        add({ ...c, l: `${playerPrefix}-active`, o: 0, f: true });
    }

    // Hand (7)
    for (let i = 0; i < 7; i++) {
        if (currentIdx < allCards.length) {
            const c = allCards[currentIdx++];
            add({ ...c, l: `${playerPrefix}-hand`, o: i, f: true });
        }
    }

    // Prize (6)
    for (let i = 0; i < 6; i++) {
        if (currentIdx < allCards.length) {
            const c = allCards[currentIdx++];
            add({ ...c, l: `${playerPrefix}-prize`, o: i, f: false });
        }
    }

    // Deck (remaining)
    let deckOrder = 0;
    while(currentIdx < allCards.length) {
        const c = allCards[currentIdx++];
        p.d.push(c.id);
        add({ ...c, l: `${playerPrefix}-deck`, o: deckOrder++, f: false });
    }

    return p;
};

const createInitialState = (deckCards?: CardInfo[]): GameState => ({
    roomId: 'mock-room-1',
    m: {
        t: 'p1',
        s: 'playing',
        a: '',
    },
    p1: generateInitialPlayer('p1', 'Player 1', deckCards),
    p2: generateInitialPlayer('p2', 'Player 2 (Opponent)', deckCards),
});

export function useGameState(deckCards?: CardInfo[]) {
    const [gameState, setGameState] = useState<GameState>(() => createInitialState(deckCards));

    const resetGame = useCallback((newDeckCards?: CardInfo[]) => {
        setGameState(createInitialState(newDeckCards));
    }, []);

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
        sourceLoc: string,
        targetLoc: string,
        targetIndex?: number
    ) => {
        setGameState((prev) => {
            const pPlayer = prev.p2.c[cardId] ? 'p2' : prev.p1.c[cardId] ? 'p1' : null;
            if (!pPlayer) return prev;

            const oldPlayer = prev[pPlayer];
            const cardToMove = oldPlayer.c[cardId];
            const newCards = { ...oldPlayer.c };

            // スワップロジック（Activeに既にカードがある場合、元の場所に押し戻す）
            if (targetLoc.includes('-active')) {
                const existingActive = Object.values(newCards).find(c => c.l === targetLoc && !c.att);
                if (existingActive && existingActive.id !== cardId) {
                    newCards[existingActive.id] = { ...existingActive, l: sourceLoc, o: 999 };
                    Object.values(newCards)
                        .filter(c => c.att && findRootCardId(c, newCards) === existingActive.id)
                        .forEach(ac => { newCards[ac.id] = { ...ac, l: sourceLoc }; });
                }
            }

            // 移動先のorder計算
            const newOrder = targetIndex !== undefined
                ? targetIndex
                : Object.values(newCards).filter(c => c.l === targetLoc).length;

            // カードの移動
            newCards[cardId] = {
                ...cardToMove,
                l: targetLoc,
                o: newOrder,
                ...(targetLoc.includes('-hand') && { f: true }),
                ...(targetLoc.includes('-deck') && { f: false }),
                ...(targetLoc.includes('-bench') && { cnd: [] }),
            };

            // 付属カード（エネルギー・道具・進化）も一緒に移動
            // トラッシュ・山札・手札に移動する場合はスタックを解消（att をクリア）
            const shouldBreakStack = targetLoc.includes('-trash') || targetLoc.includes('-deck') || targetLoc.includes('-hand');
            const allAttached = collectAllAttached(cardId, newCards);
            allAttached.forEach(ac => {
                newCards[ac.id] = {
                    ...ac,
                    l: targetLoc,
                    ...(shouldBreakStack && { att: undefined }),
                    ...(targetLoc.includes('-hand') && { f: true }),
                    ...(targetLoc.includes('-deck') && { f: false }),
                };
            });

            // 山札配列の調整（付属カードも含む）
            let newDeck = sourceLoc.includes('-deck')
                ? oldPlayer.d.filter(id => id !== cardId)
                : [...oldPlayer.d];
            if (targetLoc.includes('-deck')) {
                newDeck = [...newDeck, cardId, ...allAttached.map(ac => ac.id)];
            }

            return {
                ...prev,
                [pPlayer]: { ...oldPlayer, c: newCards, d: newDeck },
                m: { ...prev.m, a: `${pPlayer}-move-${cardId}` },
            };
        });
    };

    // カードを別のカードに重ねる（進化・エネルギー・道具付与）
    const attachCard = (cardId: string, targetCardId: string) => {
        setGameState((prev) => {
            const pPlayer = prev.p2.c[cardId] ? 'p2' : prev.p1.c[cardId] ? 'p1' : null;
            if (!pPlayer) return prev;

            const oldPlayer = prev[pPlayer];
            const cardToAttach = oldPlayer.c[cardId];
            const targetCard = oldPlayer.c[targetCardId];
            if (!cardToAttach || !targetCard) return prev;

            const newDeck = cardToAttach.l.includes('-deck')
                ? oldPlayer.d.filter(id => id !== cardId)
                : [...oldPlayer.d];

            return {
                ...prev,
                [pPlayer]: {
                    ...oldPlayer,
                    d: newDeck,
                    c: {
                        ...oldPlayer.c,
                        [cardId]: { ...cardToAttach, att: targetCardId, l: targetCard.l, f: true },
                    },
                },
                m: { ...prev.m, a: `${pPlayer}-attach-${cardId}-to-${targetCardId}` },
            };
        });
    };

    // 重ねたカードを外して別の場所へ移動
    const detachCard = (cardId: string, targetLoc: string) => {
        setGameState((prev) => {
            const pPlayer = prev.p2.c[cardId] ? 'p2' : prev.p1.c[cardId] ? 'p1' : null;
            if (!pPlayer) return prev;

            const oldPlayer = prev[pPlayer];
            const card = oldPlayer.c[cardId];
            if (!card) return prev;

            const newOrder = Object.values(oldPlayer.c).filter(c => c.l === targetLoc && !c.att).length;
            const newDeck = targetLoc.includes('-deck')
                ? [...oldPlayer.d, cardId]
                : [...oldPlayer.d];

            return {
                ...prev,
                [pPlayer]: {
                    ...oldPlayer,
                    d: newDeck,
                    c: {
                        ...oldPlayer.c,
                        [cardId]: {
                            ...card,
                            att: undefined,
                            l: targetLoc,
                            o: newOrder,
                            ...(targetLoc.includes('-deck') && { f: false }),
                            ...(targetLoc.includes('-hand') && { f: true }),
                        },
                    },
                },
                m: { ...prev.m, a: `${pPlayer}-detach-${cardId}` },
            };
        });
    };

    // ポケモンと付いているカード全てをトラッシュに送る（きぜつ処理）
    const trashWithAttachments = (cardId: string) => {
        setGameState((prev) => {
            const pPlayer = prev.p2.c[cardId] ? 'p2' : prev.p1.c[cardId] ? 'p1' : null;
            if (!pPlayer) return prev;

            const oldPlayer = prev[pPlayer];
            const trashLoc = `${pPlayer}-trash`;
            const allAttached = collectAllAttached(cardId, oldPlayer.c);
            const allCardIds = [cardId, ...allAttached.map(c => c.id)];
            const trashOffset = Object.values(oldPlayer.c).filter(c => c.l === trashLoc).length;

            const newCards = { ...oldPlayer.c };
            allCardIds.forEach((id, i) => {
                if (newCards[id]) {
                    newCards[id] = {
                        ...newCards[id],
                        l: trashLoc,
                        att: undefined,
                        f: true,
                        d: 0,
                        cnd: [],
                        o: trashOffset + i,
                    };
                }
            });

            return {
                ...prev,
                [pPlayer]: {
                    ...oldPlayer,
                    d: oldPlayer.d.filter(id => !allCardIds.includes(id)),
                    c: newCards,
                },
                m: { ...prev.m, a: `${pPlayer}-trash-${cardId}-with-attachments` },
            };
        });
    };

    const updateCardStatus = (cardId: string, updater: (c: Card) => Card) => {
        setGameState((prev) => {
            const pPlayer = prev.p2.c[cardId] ? 'p2' : prev.p1.c[cardId] ? 'p1' : null;
            if (!pPlayer) return prev;

            const oldPlayer = prev[pPlayer];
            return {
                ...prev,
                [pPlayer]: {
                    ...oldPlayer,
                    c: { ...oldPlayer.c, [cardId]: updater(oldPlayer.c[cardId]) },
                },
            };
        });
    };

    const returnToDeck = (cardId: string, bottom: boolean = false, shuffleAfter: boolean = false) => {
        setGameState((prev) => {
            const pPlayer = prev.p2.c[cardId] ? 'p2' : prev.p1.c[cardId] ? 'p1' : null;
            if (!pPlayer) return prev;

            const oldPlayer = prev[pPlayer];
            const cardToReturn = oldPlayer.c[cardId];
            if (!cardToReturn) return prev;

            // bottom=true → 山札の一番下（配列先頭）、false → 一番上（配列末尾）
            let newDeck = bottom ? [cardId, ...oldPlayer.d] : [...oldPlayer.d, cardId];
            if (shuffleAfter) newDeck = shuffle(newDeck);

            const newCards = { ...oldPlayer.c, [cardId]: { ...cardToReturn, l: `${pPlayer}-deck`, f: false, cnd: [] } };
            newDeck.forEach((id, index) => {
                if (newCards[id]) newCards[id] = { ...newCards[id], o: index };
            });

            return {
                ...prev,
                [pPlayer]: { ...oldPlayer, d: newDeck, c: newCards },
                m: { ...prev.m, a: `${pPlayer}-return-deck-${cardId}` },
            };
        });
    };

    const drawCard = (playerId: string) => {
        setGameState((prev) => {
            const pPlayer = playerId === 'p1' || playerId === 'player-1' ? 'p1' : 'p2';
            const oldPlayer = prev[pPlayer];
            if (oldPlayer.d.length === 0) return prev;

            const newDeck = [...oldPlayer.d];
            const topCardId = newDeck.pop()!;
            const cardToDraw = oldPlayer.c[topCardId];
            if (!cardToDraw) return prev;

            const handSize = Object.values(oldPlayer.c).filter(c => c.l === `${pPlayer}-hand`).length;

            return {
                ...prev,
                [pPlayer]: {
                    ...oldPlayer,
                    d: newDeck,
                    c: {
                        ...oldPlayer.c,
                        [topCardId]: { ...cardToDraw, l: `${pPlayer}-hand`, o: handSize, f: true },
                    },
                },
                m: { ...prev.m, a: `${pPlayer}-draw-${topCardId}` },
            };
        });
    };

    const shuffleDeck = (playerId: string) => {
        setGameState((prev) => {
            const pPlayer = playerId === 'p1' || playerId === 'player-1' ? 'p1' : 'p2';
            const oldPlayer = prev[pPlayer];
            if (oldPlayer.d.length === 0) return prev;

            const newDeck = shuffle(oldPlayer.d);
            const newCards = { ...oldPlayer.c };
            newDeck.forEach((cardId, index) => {
                if (newCards[cardId]) newCards[cardId] = { ...newCards[cardId], o: index };
            });

            return {
                ...prev,
                [pPlayer]: { ...oldPlayer, d: newDeck, c: newCards },
                m: { ...prev.m, a: `${pPlayer}-shuffle-deck` },
            };
        });
    };

    const returnAllHandToDeck = (playerId: string, bottom: boolean = false, shuffleAfter: boolean = false) => {
        setGameState((prev) => {
            const pPlayer = playerId === 'p1' || playerId === 'player-1' ? 'p1' : 'p2';
            const oldPlayer = prev[pPlayer];
            const handLoc = `${pPlayer}-hand`;
            const handCardIds = Object.keys(oldPlayer.c).filter(id => oldPlayer.c[id].l === handLoc);
            if (handCardIds.length === 0) return prev;

            // bottom=true → 手札を配列先頭（山札の下）へ、false → 配列末尾（山札の上）へ
            let newDeck = bottom
                ? [...handCardIds, ...oldPlayer.d]
                : [...oldPlayer.d, ...handCardIds];
            if (shuffleAfter) newDeck = shuffle(newDeck);

            const newCards = { ...oldPlayer.c };
            handCardIds.forEach(id => {
                newCards[id] = { ...newCards[id], l: `${pPlayer}-deck`, f: false, d: 0, cnd: [] };
            });
            newDeck.forEach((id, index) => {
                if (newCards[id]) newCards[id] = { ...newCards[id], o: index };
            });

            return {
                ...prev,
                [pPlayer]: { ...oldPlayer, d: newDeck, c: newCards },
                m: { ...prev.m, a: `${pPlayer}-return-all-hand` },
            };
        });
    };

    return { gameState, getCardsByLocation, getAttachedCards, moveCard, attachCard, detachCard, trashWithAttachments, updateCardStatus, drawCard, shuffleDeck, returnToDeck, returnAllHandToDeck, resetGame };
}
