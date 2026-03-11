import { useEffect, useRef, useCallback } from 'react';
import { ref, update, onValue, onChildChanged, off } from 'firebase/database';
import { db } from '../lib/firebase';
import { computeFirebaseUpdates } from '../lib/firebaseDelta';
import type { GameState, Card } from '../types/game';
import type { PlayerId } from '../types/room';

const restoreCard = (card: Card): Card => ({
    ...card,
    cnd: card.cnd || [],
    d: card.d ?? 0,
});

const restoreCards = (cards: Record<string, Card>): Record<string, Card> =>
    Object.fromEntries(
        Object.entries(cards).map(([id, c]) => [id, restoreCard(c as Card)])
    );

type UseFirebaseSyncProps = {
    roomId: string;
    playerId: PlayerId;
    enabled: boolean;
    onRemoteUpdate: (state: GameState) => void;
};

export function useFirebaseSync({ roomId, playerId, enabled, onRemoteUpdate }: UseFirebaseSyncProps) {
    const lastActionRef = useRef<string>('');
    const remoteStateRef = useRef<GameState | null>(null);

    // 初期状態の書き込み（対戦開始時に1回だけ呼ばれる）
    const writeInitialState = useCallback(async (state: GameState) => {
        const fbState = JSON.parse(JSON.stringify({
            m: state.m,
            c: state.c,
            d: state.d,
        }));
        await update(ref(db), { [`rooms/${roomId}/state`]: fbState });
        lastActionRef.current = state.m.a;
        remoteStateRef.current = state;
    }, [roomId]);

    // delta 書き込み
    const pushUpdate = useCallback((prev: GameState, next: GameState) => {
        if (!enabled) return;
        const updates = computeFirebaseUpdates(roomId, prev, next);
        if (Object.keys(updates).length > 0) {
            lastActionRef.current = next.m.a;
            remoteStateRef.current = next;
            update(ref(db), updates);
        }
    }, [roomId, enabled]);

    // 3リスナー構成による差分受信
    // - state/m  → onValue  (~100 bytes, アクション検知 & 通知トリガー)
    // - state/c  → onChildChanged (~72 bytes/card, サイレント蓄積)
    // - state/d  → onChildChanged (~330 bytes/player, サイレント蓄積)
    useEffect(() => {
        if (!enabled) return;

        const basePath = `rooms/${roomId}/state`;
        let initialized = false;
        let cancelled = false;
        let pendingNotify = false;

        const scheduleNotify = () => {
            if (!initialized || pendingNotify || cancelled) return;
            pendingNotify = true;
            queueMicrotask(() => {
                pendingNotify = false;
                if (!cancelled && remoteStateRef.current) {
                    onRemoteUpdate({ ...remoteStateRef.current });
                }
            });
        };

        // 初回: フルステート取得 → 完了後にグラニュラーリスナーを設置
        const stateRef = ref(db, basePath);
        onValue(stateRef, (snapshot) => {
            if (cancelled || !snapshot.exists()) return;
            const fb = snapshot.val();
            if (!fb?.m) return;

            remoteStateRef.current = {
                roomId,
                m: fb.m,
                c: restoreCards(fb.c || {}),
                d: { p1: fb.d?.p1 || [], p2: fb.d?.p2 || [] },
            };

            if (fb.m.a !== lastActionRef.current) {
                lastActionRef.current = fb.m.a;
                onRemoteUpdate(remoteStateRef.current);
            }

            // フル購読を解除してグラニュラーリスナーに切り替え
            off(stateRef);
            initialized = true;

            // Meta リスナー: アクション検知 & 通知トリガー
            const metaRef = ref(db, `${basePath}/m`);
            onValue(metaRef, (snap) => {
                if (cancelled || !snap.exists() || !remoteStateRef.current) return;
                const meta = snap.val();
                if (meta.a === lastActionRef.current) return;
                lastActionRef.current = meta.a;
                remoteStateRef.current = { ...remoteStateRef.current, m: meta };
                scheduleNotify();
            });

            // Card リスナー: 変更カードのみサイレント蓄積
            const cardsRef = ref(db, `${basePath}/c`);
            onChildChanged(cardsRef, (snap) => {
                if (cancelled || !remoteStateRef.current) return;
                remoteStateRef.current = {
                    ...remoteStateRef.current,
                    c: { ...remoteStateRef.current.c, [snap.key!]: restoreCard(snap.val()) },
                };
            });

            // Deck リスナー: デッキ配列の変更をサイレント蓄積
            const deckRef = ref(db, `${basePath}/d`);
            onChildChanged(deckRef, (snap) => {
                if (cancelled || !remoteStateRef.current) return;
                remoteStateRef.current = {
                    ...remoteStateRef.current,
                    d: { ...remoteStateRef.current.d, [snap.key as 'p1' | 'p2']: snap.val() || [] },
                };
            });
        });

        return () => {
            cancelled = true;
            off(stateRef);
            off(ref(db, `${basePath}/m`));
            off(ref(db, `${basePath}/c`));
            off(ref(db, `${basePath}/d`));
        };
    }, [roomId, playerId, enabled, onRemoteUpdate]);

    return {
        pushUpdate,
        writeInitialState,
    };
}
