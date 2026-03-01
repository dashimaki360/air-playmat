import { useState, useEffect, useCallback } from 'react';
import { ref, set, get, onValue, update, onDisconnect, off } from 'firebase/database';
import { db } from '../lib/firebase';
import type { PlayerId, RoomMeta, RoomPlayerInfo, RoomData } from '../types/room';
import type { CardInfo } from '../types/game';

export type RoomState = {
    roomId: string | null;
    playerId: PlayerId | null;
    status: 'idle' | 'creating' | 'joining' | 'waiting' | 'ready' | 'playing' | 'error';
    error: string | null;
    roomData: RoomData | null;
};

const ROOM_PATH = (roomId: string) => `rooms/${roomId}`;

export function useRoom() {
    const [roomState, setRoomState] = useState<RoomState>({
        roomId: null,
        playerId: null,
        status: 'idle',
        error: null,
        roomData: null,
    });

    // ルーム作成
    const createRoom = useCallback(async (roomId: string, playerName: string, deckCode: string, deckCards: CardInfo[]) => {
        setRoomState(prev => ({ ...prev, status: 'creating', error: null }));

        try {
            const roomRef = ref(db, ROOM_PATH(roomId));
            const snapshot = await get(roomRef);

            if (snapshot.exists()) {
                // 24時間以上経過したルームは上書き可能
                const existingMeta = snapshot.val()?.meta as RoomMeta | undefined;
                if (existingMeta && Date.now() - existingMeta.createdAt < 24 * 60 * 60 * 1000) {
                    setRoomState(prev => ({ ...prev, status: 'error', error: 'このルームIDは既に使用されています' }));
                    return;
                }
            }

            const roomData: RoomData = {
                meta: {
                    createdAt: Date.now(),
                    status: 'waiting',
                    p1Connected: true,
                    p2Connected: false,
                },
                p1: {
                    n: playerName,
                    deck: deckCode,
                    deckCards,
                    ready: false,
                },
            };

            await set(roomRef, roomData);

            // 切断時の処理を設定
            const p1ConnRef = ref(db, `${ROOM_PATH(roomId)}/meta/p1Connected`);
            onDisconnect(p1ConnRef).set(false);

            setRoomState({
                roomId,
                playerId: 'p1',
                status: 'waiting',
                error: null,
                roomData,
            });
        } catch (e) {
            setRoomState(prev => ({
                ...prev,
                status: 'error',
                error: `ルーム作成に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
            }));
        }
    }, []);

    // ルーム参加
    const joinRoom = useCallback(async (roomId: string, playerName: string, deckCode: string, deckCards: CardInfo[]) => {
        setRoomState(prev => ({ ...prev, status: 'joining', error: null }));

        try {
            const roomRef = ref(db, ROOM_PATH(roomId));
            const snapshot = await get(roomRef);

            if (!snapshot.exists()) {
                setRoomState(prev => ({ ...prev, status: 'error', error: 'ルームが見つかりません' }));
                return;
            }

            const data = snapshot.val() as RoomData;

            if (data.meta.status !== 'waiting') {
                setRoomState(prev => ({ ...prev, status: 'error', error: 'このルームは既に対戦中です' }));
                return;
            }

            if (data.p2) {
                setRoomState(prev => ({ ...prev, status: 'error', error: 'このルームは満員です' }));
                return;
            }

            const p2Info: RoomPlayerInfo = {
                n: playerName,
                deck: deckCode,
                deckCards,
                ready: false,
            };

            await update(ref(db, ROOM_PATH(roomId)), {
                'p2': p2Info,
                'meta/p2Connected': true,
            });

            // 切断時の処理を設定
            const p2ConnRef = ref(db, `${ROOM_PATH(roomId)}/meta/p2Connected`);
            onDisconnect(p2ConnRef).set(false);

            setRoomState({
                roomId,
                playerId: 'p2',
                status: 'waiting',
                error: null,
                roomData: { ...data, p2: p2Info },
            });
        } catch (e) {
            setRoomState(prev => ({
                ...prev,
                status: 'error',
                error: `ルーム参加に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
            }));
        }
    }, []);

    // Ready 状態の切り替え
    const setReady = useCallback(async (ready: boolean) => {
        const { roomId, playerId } = roomState;
        if (!roomId || !playerId) return;

        await update(ref(db, ROOM_PATH(roomId)), {
            [`${playerId}/ready`]: ready,
        });
    }, [roomState.roomId, roomState.playerId]);

    // 対戦開始（p1が実行）
    const startGame = useCallback(async () => {
        const { roomId } = roomState;
        if (!roomId) return;

        await update(ref(db, `${ROOM_PATH(roomId)}/meta`), {
            status: 'playing',
        });
    }, [roomState.roomId]);

    // ルーム退出
    const leaveRoom = useCallback(async () => {
        const { roomId, playerId } = roomState;
        if (!roomId || !playerId) return;

        try {
            await update(ref(db, ROOM_PATH(roomId)), {
                [`meta/${playerId}Connected`]: false,
            });
        } catch {
            // 退出時のエラーは無視
        }

        setRoomState({
            roomId: null,
            playerId: null,
            status: 'idle',
            error: null,
            roomData: null,
        });
    }, [roomState.roomId, roomState.playerId]);

    // ルームデータの監視
    useEffect(() => {
        const { roomId } = roomState;
        if (!roomId) return;

        const roomRef = ref(db, ROOM_PATH(roomId));
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.val() as RoomData;
            setRoomState(prev => {
                // ステータスの決定
                let status = prev.status as RoomState['status'];
                if (data.meta.status === 'playing') {
                    status = 'playing';
                } else if (data.p1?.ready && data.p2?.ready) {
                    status = 'ready';
                } else if (data.meta.status === 'waiting') {
                    status = 'waiting';
                }

                return {
                    ...prev,
                    status,
                    roomData: data,
                };
            });
        });

        return () => {
            off(roomRef);
            unsubscribe();
        };
    }, [roomState.roomId]);

    return {
        roomState,
        createRoom,
        joinRoom,
        setReady,
        startGame,
        leaveRoom,
    };
}
