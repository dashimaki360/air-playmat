import { useEffect, useRef, useCallback } from 'react';
import { ref, update, onValue, off } from 'firebase/database';
import { db } from '../lib/firebase';
import { computeFirebaseUpdates } from '../lib/firebaseDelta';
import type { GameState, Card } from '../types/game';
import type { PlayerId } from '../types/room';

// Firebase state/ 配下の構造に変換
type FirebaseGameState = {
    m: GameState['m'];
    p1: {
        n: string;
        d: string[];
        c: Record<string, Card>;
    };
    p2: {
        n: string;
        d: string[];
        c: Record<string, Card>;
    };
};

const stateToFirebase = (state: GameState): FirebaseGameState =>
    JSON.parse(JSON.stringify({
        m: state.m,
        p1: { n: state.p1.n, d: state.p1.d, c: state.p1.c },
        p2: { n: state.p2.n, d: state.p2.d, c: state.p2.c },
    }));

const restoreCards = (cards: Record<string, Card>): Record<string, Card> =>
    Object.fromEntries(
        Object.entries(cards).map(([id, c]) => [id, { ...c, cnd: c.cnd || [], d: c.d ?? 0 }])
    );

const firebaseToState = (roomId: string, fb: FirebaseGameState): GameState => ({
    roomId,
    m: fb.m,
    p1: { n: fb.p1.n, d: fb.p1.d || [], c: restoreCards(fb.p1.c || {}) },
    p2: { n: fb.p2.n, d: fb.p2.d || [], c: restoreCards(fb.p2.c || {}) },
});

type UseFirebaseSyncProps = {
    roomId: string;
    playerId: PlayerId;
    enabled: boolean;
    onRemoteUpdate: (state: GameState) => void;
};

export function useFirebaseSync({ roomId, playerId, enabled, onRemoteUpdate }: UseFirebaseSyncProps) {
    const lastActionRef = useRef<string>('');

    // 初期状態の書き込み（対戦開始時に1回だけ呼ばれる）
    const writeInitialState = useCallback(async (state: GameState) => {
        const fbState = stateToFirebase(state);
        await update(ref(db), { [`rooms/${roomId}/state`]: fbState });
        lastActionRef.current = state.m.a;
    }, [roomId]);

    // delta 書き込み
    const pushUpdate = useCallback((prev: GameState, next: GameState) => {
        if (!enabled) return;
        const updates = computeFirebaseUpdates(roomId, prev, next);
        if (Object.keys(updates).length > 0) {
            lastActionRef.current = next.m.a;
            update(ref(db), updates);
        }
    }, [roomId, enabled]);

    // リモート更新の購読
    useEffect(() => {
        if (!enabled) return;

        const stateRef = ref(db, `rooms/${roomId}/state`);
        const unsubscribe = onValue(stateRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const fbState = snapshot.val() as FirebaseGameState;
            if (!fbState?.m) return;

            // エコーループ防止: 自分が書き込んだ変更はスキップ
            if (fbState.m.a === lastActionRef.current) return;

            lastActionRef.current = fbState.m.a;
            const gameState = firebaseToState(roomId, fbState);
            onRemoteUpdate(gameState);
        });

        return () => {
            off(stateRef);
            unsubscribe();
        };
    }, [roomId, playerId, enabled, onRemoteUpdate]);

    return {
        pushUpdate,
        writeInitialState,
    };
}
