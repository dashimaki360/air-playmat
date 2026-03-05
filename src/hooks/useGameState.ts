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
export const shuffle = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// 指定カードに付属する全カードを再帰的に収集するヘルパー
export const collectAllAttached = (cardId: string, cards: Record<string, Card>): Card[] => {
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

// プレイヤーIDの正規化
export const normalizePlayerId = (playerId: string): 'p1' | 'p2' =>
    playerId === 'p1' || playerId === 'player-1' ? 'p1' : 'p2';

// カードが属するプレイヤーを特定
const findCardOwner = (state: GameState, cardId: string): 'p1' | 'p2' | null =>
    state.p2.c[cardId] ? 'p2' : state.p1.c[cardId] ? 'p1' : null;

// ── 純粋関数: クエリ ──────────────────────────────────────────

export function queryCardsByLocation(state: GameState, loc: string): Card[] {
    const allCards = [
        ...Object.values(state.p1.c),
        ...Object.values(state.p2.c)
    ];
    return allCards
        .filter(c => c.l === loc && !c.att)
        .sort((a, b) => a.o - b.o);
}

export function queryAttachedCards(state: GameState, cardId: string): Card[] {
    const allCards = [
        ...Object.values(state.p1.c),
        ...Object.values(state.p2.c)
    ];
    const result: Card[] = [];
    const collectAttached = (targetId: string) => {
        const attached = allCards.filter(c => c.att === targetId);
        for (const c of attached) {
            result.push(c);
            collectAttached(c.id);
        }
    };
    collectAttached(cardId);
    return result;
}

// ── 純粋関数: ミューテーション ────────────────────────────────

export function applyMoveCard(
    state: GameState,
    cardId: string,
    sourceLoc: string,
    targetLoc: string,
    targetIndex?: number
): GameState {
    const pPlayer = findCardOwner(state, cardId);
    if (!pPlayer) return state;

    const oldPlayer = state[pPlayer];
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
        ...state,
        [pPlayer]: { ...oldPlayer, c: newCards, d: newDeck },
        m: { ...state.m, a: `${pPlayer}-move-${cardId}` },
    };
}

export function applyAttachCard(
    state: GameState,
    cardId: string,
    targetCardId: string
): GameState {
    const pPlayer = findCardOwner(state, cardId);
    if (!pPlayer) return state;

    const oldPlayer = state[pPlayer];
    const cardToAttach = oldPlayer.c[cardId];
    const targetCard = oldPlayer.c[targetCardId];
    if (!cardToAttach || !targetCard) return state;

    const newDeck = cardToAttach.l.includes('-deck')
        ? oldPlayer.d.filter(id => id !== cardId)
        : [...oldPlayer.d];

    return {
        ...state,
        [pPlayer]: {
            ...oldPlayer,
            d: newDeck,
            c: {
                ...oldPlayer.c,
                [cardId]: { ...cardToAttach, att: targetCardId, l: targetCard.l, f: true },
            },
        },
        m: { ...state.m, a: `${pPlayer}-attach-${cardId}-to-${targetCardId}` },
    };
}

export function applyDetachCard(
    state: GameState,
    cardId: string,
    targetLoc: string
): GameState {
    const pPlayer = findCardOwner(state, cardId);
    if (!pPlayer) return state;

    const oldPlayer = state[pPlayer];
    const card = oldPlayer.c[cardId];
    if (!card) return state;

    const newOrder = Object.values(oldPlayer.c).filter(c => c.l === targetLoc && !c.att).length;
    const newDeck = targetLoc.includes('-deck')
        ? [...oldPlayer.d, cardId]
        : [...oldPlayer.d];

    return {
        ...state,
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
        m: { ...state.m, a: `${pPlayer}-detach-${cardId}` },
    };
}

export function applyTrashWithAttachments(
    state: GameState,
    cardId: string
): GameState {
    const pPlayer = findCardOwner(state, cardId);
    if (!pPlayer) return state;

    const oldPlayer = state[pPlayer];
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
        ...state,
        [pPlayer]: {
            ...oldPlayer,
            d: oldPlayer.d.filter(id => !allCardIds.includes(id)),
            c: newCards,
        },
        m: { ...state.m, a: `${pPlayer}-trash-${cardId}-with-attachments` },
    };
}

export function applyUpdateCardStatus(
    state: GameState,
    cardId: string,
    updater: (c: Card) => Card
): GameState {
    const pPlayer = findCardOwner(state, cardId);
    if (!pPlayer) return state;

    const oldPlayer = state[pPlayer];
    return {
        ...state,
        [pPlayer]: {
            ...oldPlayer,
            c: { ...oldPlayer.c, [cardId]: updater(oldPlayer.c[cardId]) },
        },
    };
}

export function applyDrawCard(
    state: GameState,
    playerId: string
): GameState {
    const pPlayer = normalizePlayerId(playerId);
    const oldPlayer = state[pPlayer];
    if (oldPlayer.d.length === 0) return state;

    const newDeck = [...oldPlayer.d];
    const topCardId = newDeck.pop()!;
    const cardToDraw = oldPlayer.c[topCardId];
    if (!cardToDraw) return state;

    const handSize = Object.values(oldPlayer.c).filter(c => c.l === `${pPlayer}-hand`).length;

    return {
        ...state,
        [pPlayer]: {
            ...oldPlayer,
            d: newDeck,
            c: {
                ...oldPlayer.c,
                [topCardId]: { ...cardToDraw, l: `${pPlayer}-hand`, o: handSize, f: true },
            },
        },
        m: { ...state.m, a: `${pPlayer}-draw-${topCardId}` },
    };
}

export function applyShuffleDeck(
    state: GameState,
    playerId: string
): GameState {
    const pPlayer = normalizePlayerId(playerId);
    const oldPlayer = state[pPlayer];
    if (oldPlayer.d.length === 0) return state;

    const newDeck = shuffle(oldPlayer.d);
    const newCards = { ...oldPlayer.c };
    newDeck.forEach((cardId, index) => {
        if (newCards[cardId]) newCards[cardId] = { ...newCards[cardId], o: index };
    });

    return {
        ...state,
        [pPlayer]: { ...oldPlayer, d: newDeck, c: newCards },
        m: { ...state.m, a: `${pPlayer}-shuffle-deck` },
    };
}

export function applyReturnToDeck(
    state: GameState,
    cardId: string,
    bottom: boolean = false,
    shuffleAfter: boolean = false
): GameState {
    const pPlayer = findCardOwner(state, cardId);
    if (!pPlayer) return state;

    const oldPlayer = state[pPlayer];
    const cardToReturn = oldPlayer.c[cardId];
    if (!cardToReturn) return state;

    // bottom=true → 山札の一番下（配列先頭）、false → 一番上（配列末尾）
    let newDeck = bottom ? [cardId, ...oldPlayer.d] : [...oldPlayer.d, cardId];
    if (shuffleAfter) newDeck = shuffle(newDeck);

    const newCards = { ...oldPlayer.c, [cardId]: { ...cardToReturn, l: `${pPlayer}-deck`, f: false, cnd: [] } };
    newDeck.forEach((id, index) => {
        if (newCards[id]) newCards[id] = { ...newCards[id], o: index };
    });

    return {
        ...state,
        [pPlayer]: { ...oldPlayer, d: newDeck, c: newCards },
        m: { ...state.m, a: `${pPlayer}-return-deck-${cardId}` },
    };
}

export function applyReturnAllHandToDeck(
    state: GameState,
    playerId: string,
    bottom: boolean = false,
    shuffleAfter: boolean = false
): GameState {
    const pPlayer = normalizePlayerId(playerId);
    const oldPlayer = state[pPlayer];
    const handLoc = `${pPlayer}-hand`;
    const handCardIds = Object.keys(oldPlayer.c).filter(id => oldPlayer.c[id].l === handLoc);
    if (handCardIds.length === 0) return state;

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
        ...state,
        [pPlayer]: { ...oldPlayer, d: newDeck, c: newCards },
        m: { ...state.m, a: `${pPlayer}-return-all-hand` },
    };
}

// ── 初期化関数 ────────────────────────────────────────────────

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

export const generateInitialPlayer = (playerPrefix: string, playerName: string, deckCards?: CardInfo[]): PlayerState => {
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

export const createInitialState = (deckCards?: CardInfo[]): GameState => ({
    roomId: 'mock-room-1',
    m: {
        t: 'p1',
        s: 'playing',
        a: '',
    },
    p1: generateInitialPlayer('p1', 'Player 1', deckCards),
    p2: generateInitialPlayer('p2', 'Player 2 (Opponent)', deckCards),
});

// ── React Hook ────────────────────────────────────────────────

export type FirebaseSyncRef = {
    pushUpdate: (prev: GameState, next: GameState) => void;
} | null;

export function useGameState(deckCards?: CardInfo[], firebaseSync?: FirebaseSyncRef) {
    const [gameState, setGameState] = useState<GameState>(() => createInitialState(deckCards));

    const syncedUpdate = useCallback((updater: (prev: GameState) => GameState) => {
        setGameState(prev => {
            const next = updater(prev);
            if (next !== prev && firebaseSync) {
                const sync = firebaseSync;
                queueMicrotask(() => sync.pushUpdate(prev, next));
            }
            return next;
        });
    }, [firebaseSync]);

    const resetGame = useCallback((newDeckCards?: CardInfo[]) => {
        setGameState(createInitialState(newDeckCards));
    }, []);

    const getCardsByLocation = (loc: string): Card[] => queryCardsByLocation(gameState, loc);
    const getAttachedCards = (cardId: string): Card[] => queryAttachedCards(gameState, cardId);

    const moveCard = (cardId: string, sourceLoc: string, targetLoc: string, targetIndex?: number) => {
        syncedUpdate(prev => applyMoveCard(prev, cardId, sourceLoc, targetLoc, targetIndex));
    };

    const attachCard = (cardId: string, targetCardId: string) => {
        syncedUpdate(prev => applyAttachCard(prev, cardId, targetCardId));
    };

    const detachCard = (cardId: string, targetLoc: string) => {
        syncedUpdate(prev => applyDetachCard(prev, cardId, targetLoc));
    };

    const trashWithAttachments = (cardId: string) => {
        syncedUpdate(prev => applyTrashWithAttachments(prev, cardId));
    };

    const updateCardStatus = (cardId: string, updater: (c: Card) => Card) => {
        syncedUpdate(prev => applyUpdateCardStatus(prev, cardId, updater));
    };

    const drawCard = (playerId: string) => {
        syncedUpdate(prev => applyDrawCard(prev, playerId));
    };

    const shuffleDeck = (playerId: string) => {
        syncedUpdate(prev => applyShuffleDeck(prev, playerId));
    };

    const returnToDeck = (cardId: string, bottom: boolean = false, shuffleAfter: boolean = false) => {
        syncedUpdate(prev => applyReturnToDeck(prev, cardId, bottom, shuffleAfter));
    };

    const returnAllHandToDeck = (playerId: string, bottom: boolean = false, shuffleAfter: boolean = false) => {
        syncedUpdate(prev => applyReturnAllHandToDeck(prev, playerId, bottom, shuffleAfter));
    };

    return { gameState, setGameState, getCardsByLocation, getAttachedCards, moveCard, attachCard, detachCard, trashWithAttachments, updateCardStatus, drawCard, shuffleDeck, returnToDeck, returnAllHandToDeck, resetGame };
}
