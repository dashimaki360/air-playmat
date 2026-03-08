import { useState, useCallback } from 'react';
import type { GameState, Card, CardType, CardInfo } from '../types/game';

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

// カードインスタンス生成（cId で CardInfo を参照する設計）
const createCardInstance = (id: string, cId: string, l: string, o: number = 0, tp?: CardType): Card => ({
    id,
    cId,
    f: true,
    d: 0,
    cnd: [],
    l,
    o,
    att: undefined,
    tp,
});

// deckCards の配列から cId → CardInfo のルックアップ Map を構築
export const buildCardLookup = (deckCards: CardInfo[]): Map<string, CardInfo> =>
    new Map(deckCards.map(c => [c.id, c]));

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

// カードIDからプレイヤーを特定（l フィールドの先頭で判定）
const findCardOwner = (state: GameState, cardId: string): 'p1' | 'p2' | null => {
    const card = state.c[cardId];
    if (!card) return null;
    if (card.l.startsWith('p2')) return 'p2';
    if (card.l.startsWith('p1')) return 'p1';
    // stadium 等の共有エリアの場合は cardId の prefix で判定
    if (cardId.startsWith('p2')) return 'p2';
    return 'p1';
};

// ── 純粋関数: クエリ ──────────────────────────────────────────

export function queryCardsByLocation(state: GameState, loc: string): Card[] {
    return Object.values(state.c)
        .filter(c => c.l === loc && !c.att)
        .sort((a, b) => a.o - b.o);
}

export function queryAttachedCards(state: GameState, cardId: string): Card[] {
    const allCards = Object.values(state.c);
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
    const cardToMove = state.c[cardId];
    if (!cardToMove) return state;

    const pPlayer = findCardOwner(state, cardId)!;
    const newCards = { ...state.c };

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

    // 山札配列の調整
    const newD = { ...state.d };
    const playerDeck = [...newD[pPlayer]];
    if (sourceLoc.includes('-deck')) {
        const idx = playerDeck.indexOf(cardId);
        if (idx !== -1) playerDeck.splice(idx, 1);
    }
    if (targetLoc.includes('-deck')) {
        playerDeck.push(cardId, ...allAttached.map(ac => ac.id));
    }
    newD[pPlayer] = playerDeck;

    return {
        ...state,
        c: newCards,
        d: newD,
        m: { ...state.m, a: `${pPlayer}-move-${cardId}` },
    };
}

export function applyAttachCard(
    state: GameState,
    cardId: string,
    targetCardId: string
): GameState {
    const cardToAttach = state.c[cardId];
    const targetCard = state.c[targetCardId];
    if (!cardToAttach || !targetCard) return state;

    const pPlayer = findCardOwner(state, cardId)!;
    const newD = { ...state.d };
    if (cardToAttach.l.includes('-deck')) {
        newD[pPlayer] = newD[pPlayer].filter(id => id !== cardId);
    }

    return {
        ...state,
        c: {
            ...state.c,
            [cardId]: { ...cardToAttach, att: targetCardId, l: targetCard.l, f: true },
        },
        d: newD,
        m: { ...state.m, a: `${pPlayer}-attach-${cardId}-to-${targetCardId}` },
    };
}

export function applyDetachCard(
    state: GameState,
    cardId: string,
    targetLoc: string
): GameState {
    const card = state.c[cardId];
    if (!card) return state;

    const pPlayer = findCardOwner(state, cardId)!;
    const newOrder = Object.values(state.c).filter(c => c.l === targetLoc && !c.att).length;
    const newD = { ...state.d };
    if (targetLoc.includes('-deck')) {
        newD[pPlayer] = [...newD[pPlayer], cardId];
    }

    return {
        ...state,
        c: {
            ...state.c,
            [cardId]: {
                ...card,
                att: undefined,
                l: targetLoc,
                o: newOrder,
                ...(targetLoc.includes('-deck') && { f: false }),
                ...(targetLoc.includes('-hand') && { f: true }),
            },
        },
        d: newD,
        m: { ...state.m, a: `${pPlayer}-detach-${cardId}` },
    };
}

export function applyTrashWithAttachments(
    state: GameState,
    cardId: string
): GameState {
    const card = state.c[cardId];
    if (!card) return state;

    const pPlayer = findCardOwner(state, cardId)!;
    const trashLoc = `${pPlayer}-trash`;
    const allAttached = collectAllAttached(cardId, state.c);
    const allCardIds = [cardId, ...allAttached.map(c => c.id)];
    const trashOffset = Object.values(state.c).filter(c => c.l === trashLoc).length;

    const newCards = { ...state.c };
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

    const newD = { ...state.d };
    newD[pPlayer] = newD[pPlayer].filter(id => !allCardIds.includes(id));

    return {
        ...state,
        c: newCards,
        d: newD,
        m: { ...state.m, a: `${pPlayer}-trash-${cardId}-with-attachments` },
    };
}

export function applyUpdateCardStatus(
    state: GameState,
    cardId: string,
    updater: (c: Card) => Card
): GameState {
    const card = state.c[cardId];
    if (!card) return state;

    return {
        ...state,
        c: { ...state.c, [cardId]: updater(card) },
    };
}

export function applyDrawCard(
    state: GameState,
    playerId: string
): GameState {
    const pPlayer = normalizePlayerId(playerId);
    const deck = state.d[pPlayer];
    if (deck.length === 0) return state;

    const newDeck = [...deck];
    const topCardId = newDeck.pop()!;
    const cardToDraw = state.c[topCardId];
    if (!cardToDraw) return state;

    const handSize = Object.values(state.c).filter(c => c.l === `${pPlayer}-hand`).length;

    return {
        ...state,
        c: {
            ...state.c,
            [topCardId]: { ...cardToDraw, l: `${pPlayer}-hand`, o: handSize, f: true },
        },
        d: { ...state.d, [pPlayer]: newDeck },
        m: { ...state.m, a: `${pPlayer}-draw-${topCardId}` },
    };
}

export function applyShuffleDeck(
    state: GameState,
    playerId: string
): GameState {
    const pPlayer = normalizePlayerId(playerId);
    const deck = state.d[pPlayer];
    if (deck.length === 0) return state;

    const newDeck = shuffle(deck);
    const newCards = { ...state.c };
    newDeck.forEach((cardId, index) => {
        if (newCards[cardId]) newCards[cardId] = { ...newCards[cardId], o: index };
    });

    return {
        ...state,
        c: newCards,
        d: { ...state.d, [pPlayer]: newDeck },
        m: { ...state.m, a: `${pPlayer}-shuffle-deck` },
    };
}

export function applyReturnToDeck(
    state: GameState,
    cardId: string,
    bottom: boolean = false,
    shuffleAfter: boolean = false
): GameState {
    const cardToReturn = state.c[cardId];
    if (!cardToReturn) return state;

    const pPlayer = findCardOwner(state, cardId)!;
    const oldDeck = state.d[pPlayer];

    let newDeck = bottom ? [cardId, ...oldDeck] : [...oldDeck, cardId];
    if (shuffleAfter) newDeck = shuffle(newDeck);

    const newCards = { ...state.c, [cardId]: { ...cardToReturn, l: `${pPlayer}-deck`, f: false, cnd: [] } };
    newDeck.forEach((id, index) => {
        if (newCards[id]) newCards[id] = { ...newCards[id], o: index };
    });

    return {
        ...state,
        c: newCards,
        d: { ...state.d, [pPlayer]: newDeck },
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
    const handLoc = `${pPlayer}-hand`;
    const handCardIds = Object.keys(state.c).filter(id => state.c[id].l === handLoc);
    if (handCardIds.length === 0) return state;

    const oldDeck = state.d[pPlayer];
    let newDeck = bottom
        ? [...handCardIds, ...oldDeck]
        : [...oldDeck, ...handCardIds];
    if (shuffleAfter) newDeck = shuffle(newDeck);

    const newCards = { ...state.c };
    handCardIds.forEach(id => {
        newCards[id] = { ...newCards[id], l: `${pPlayer}-deck`, f: false, d: 0, cnd: [] };
    });
    newDeck.forEach((id, index) => {
        if (newCards[id]) newCards[id] = { ...newCards[id], o: index };
    });

    return {
        ...state,
        c: newCards,
        d: { ...state.d, [pPlayer]: newDeck },
        m: { ...state.m, a: `${pPlayer}-return-all-hand` },
    };
}

// ── 初期化関数 ────────────────────────────────────────────────

// Flatten deck data
const createFlatDeck = (idPrefix: string, deckCards?: CardInfo[]): Card[] => {
    const source = deckCards || (defaultDeck.cards as CardInfo[]);
    let flatCards: Card[] = [];
    source.forEach((ci) => {
        for (let i = 0; i < ci.count; i++) {
            flatCards.push(createCardInstance('', ci.id, '', 0, CARD_TYPE_MAP[ci.type || '']));
        }
    });
    flatCards = shuffle(flatCards);

    return flatCards.map((c, i) => ({
        ...c,
        id: `${idPrefix}-${i + 1}`,
    }));
};

// プレイヤー1人分のカードとデッキ配列を生成
const generatePlayerCards = (playerPrefix: string, deckCards?: CardInfo[]): { cards: Record<string, Card>; deck: string[] } => {
    const cards: Record<string, Card> = {};
    const deck: string[] = [];

    const allCards = createFlatDeck(playerPrefix, deckCards);
    let currentIdx = 0;

    // Hand (7)
    for (let i = 0; i < 7; i++) {
        if (currentIdx < allCards.length) {
            const c = allCards[currentIdx++];
            cards[c.id] = { ...c, l: `${playerPrefix}-hand`, o: i, f: true };
        }
    }

    // Prize (6)
    for (let i = 0; i < 6; i++) {
        if (currentIdx < allCards.length) {
            const c = allCards[currentIdx++];
            cards[c.id] = { ...c, l: `${playerPrefix}-prize`, o: i, f: false };
        }
    }

    // Deck (remaining)
    let deckOrder = 0;
    while (currentIdx < allCards.length) {
        const c = allCards[currentIdx++];
        deck.push(c.id);
        cards[c.id] = { ...c, l: `${playerPrefix}-deck`, o: deckOrder++, f: false };
    }

    return { cards, deck };
};

export const createInitialState = (deckCards?: CardInfo[], p1Name = 'Player 1', p2Name = 'Player 2 (Opponent)', p2DeckCards?: CardInfo[]): GameState => {
    const p1 = generatePlayerCards('p1', deckCards);
    const p2 = generatePlayerCards('p2', p2DeckCards || deckCards);

    return {
        roomId: 'mock-room-1',
        m: {
            t: 'p1',
            s: 'playing',
            a: '',
            p1n: p1Name,
            p2n: p2Name,
        },
        c: { ...p1.cards, ...p2.cards },
        d: { p1: p1.deck, p2: p2.deck },
    };
};

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
