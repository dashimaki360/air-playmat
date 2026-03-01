import type { GameState } from '../types/game';

/**
 * prev と next の GameState を比較し、Firebase に書き込む差分パスを返す純粋関数。
 * 変更されたカード・デッキ配列・メタのみを含む。
 */
export function computeFirebaseUpdates(
    roomId: string,
    prev: GameState,
    next: GameState
): Record<string, unknown> {
    const basePath = `rooms/${roomId}/state`;
    const updates: Record<string, unknown> = {};

    // meta の差分
    if (prev.m.t !== next.m.t) updates[`${basePath}/m/t`] = next.m.t;
    if (prev.m.s !== next.m.s) updates[`${basePath}/m/s`] = next.m.s;
    if (prev.m.a !== next.m.a) updates[`${basePath}/m/a`] = next.m.a;

    // 各プレイヤーの差分
    for (const pId of ['p1', 'p2'] as const) {
        const prevP = prev[pId];
        const nextP = next[pId];

        // プレイヤー名
        if (prevP.n !== nextP.n) updates[`${basePath}/${pId}/n`] = nextP.n;

        // デッキ配列（配列全体を比較）
        if (JSON.stringify(prevP.d) !== JSON.stringify(nextP.d)) {
            updates[`${basePath}/${pId}/d`] = nextP.d;
        }

        // カード単位の差分
        const allCardIds = new Set([...Object.keys(prevP.c), ...Object.keys(nextP.c)]);
        for (const cardId of allCardIds) {
            const prevCard = prevP.c[cardId];
            const nextCard = nextP.c[cardId];

            if (!prevCard && nextCard) {
                // 新規カード
                updates[`${basePath}/${pId}/c/${cardId}`] = nextCard;
            } else if (prevCard && !nextCard) {
                // 削除されたカード
                updates[`${basePath}/${pId}/c/${cardId}`] = null;
            } else if (prevCard && nextCard) {
                // 変更チェック（頻繁に変わるフィールドを個別比較）
                if (prevCard.l !== nextCard.l || prevCard.f !== nextCard.f ||
                    prevCard.d !== nextCard.d || prevCard.o !== nextCard.o ||
                    prevCard.att !== nextCard.att ||
                    JSON.stringify(prevCard.cnd) !== JSON.stringify(nextCard.cnd)) {
                    updates[`${basePath}/${pId}/c/${cardId}`] = nextCard;
                }
            }
        }
    }

    return updates;
}
