import type { GameState } from '../types/game';

/** オブジェクトから undefined 値のプロパティを除去する */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined)
    ) as Partial<T>;
}

/**
 * prev と next の GameState を比較し、Firebase に書き込む差分パスを返す純粋関数。
 * 変更されたカード・デッキ配列・メタのみを含む。
 *
 * フラット構造: state/m, state/c/{cardId}, state/d/{p1|p2}
 */
export function computeFirebaseUpdates(
    roomId: string,
    prev: GameState,
    next: GameState
): Record<string, unknown> {
    const basePath = `rooms/${roomId}/state`;
    const updates: Record<string, unknown> = {};

    // meta の差分
    for (const key of ['t', 's', 'a', 'p1n', 'p2n'] as const) {
        if (prev.m[key] !== next.m[key]) updates[`${basePath}/m/${key}`] = next.m[key];
    }

    // デッキ配列の差分（プレイヤーごと）
    for (const pId of ['p1', 'p2'] as const) {
        if (JSON.stringify(prev.d[pId]) !== JSON.stringify(next.d[pId])) {
            updates[`${basePath}/d/${pId}`] = next.d[pId];
        }
    }

    // カード単位の差分（全カードをフラットに比較）
    const allCardIds = new Set([...Object.keys(prev.c), ...Object.keys(next.c)]);
    for (const cardId of allCardIds) {
        const prevCard = prev.c[cardId];
        const nextCard = next.c[cardId];

        if (!prevCard && nextCard) {
            updates[`${basePath}/c/${cardId}`] = stripUndefined(nextCard);
        } else if (prevCard && !nextCard) {
            updates[`${basePath}/c/${cardId}`] = null;
        } else if (prevCard && nextCard) {
            if (prevCard.l !== nextCard.l || prevCard.f !== nextCard.f ||
                prevCard.d !== nextCard.d || prevCard.o !== nextCard.o ||
                prevCard.att !== nextCard.att ||
                JSON.stringify(prevCard.cnd) !== JSON.stringify(nextCard.cnd)) {
                updates[`${basePath}/c/${cardId}`] = stripUndefined(nextCard);
            }
        }
    }

    return updates;
}
