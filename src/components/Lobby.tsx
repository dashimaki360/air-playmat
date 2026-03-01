import { useState } from 'react';
import type { CardInfo } from '../types/game';
import type { RoomState } from '../hooks/useRoom';

type LobbyProps = {
    roomState: RoomState;
    deckCode: string | null;
    deckCards: CardInfo[] | undefined;
    onCreateRoom: (roomId: string, playerName: string, deckCode: string, deckCards: CardInfo[]) => void;
    onJoinRoom: (roomId: string, playerName: string, deckCode: string, deckCards: CardInfo[]) => void;
    onSetReady: (ready: boolean) => void;
    onStartGame: () => void;
    onLeaveRoom: () => void;
    onBack: () => void;
};

export function Lobby({
    roomState,
    deckCode,
    deckCards,
    onCreateRoom,
    onJoinRoom,
    onSetReady,
    onStartGame,
    onLeaveRoom,
    onBack,
}: LobbyProps) {
    const [roomId, setRoomId] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');

    const hasDeck = deckCode && deckCards && deckCards.length > 0;

    const handleSubmit = () => {
        if (!roomId || !hasDeck) return;
        const name = playerName || (mode === 'create' ? 'Player 1' : 'Player 2');

        if (mode === 'create') {
            onCreateRoom(roomId, name, deckCode, deckCards);
        } else if (mode === 'join') {
            onJoinRoom(roomId, name, deckCode, deckCards);
        }
    };

    // 対戦中 → この画面は表示されない
    if (roomState.status === 'playing') return null;

    // 待機中 or Ready
    if (roomState.roomId && (roomState.status === 'waiting' || roomState.status === 'ready')) {
        const rd = roomState.roomData;
        const isP1 = roomState.playerId === 'p1';
        const p1Ready = rd?.p1?.ready ?? false;
        const p2Ready = rd?.p2?.ready ?? false;
        const myReady = isP1 ? p1Ready : p2Ready;
        const bothReady = p1Ready && p2Ready;

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <h2 className="text-2xl font-bold">ルーム: {roomState.roomId}</h2>
                <p className="text-slate-400">
                    あなたは <span className="text-blue-400 font-bold">{isP1 ? 'P1（作成者）' : 'P2（参加者）'}</span>
                </p>

                <div className="flex gap-8 mt-4">
                    <div className={`p-4 rounded-lg border ${p1Ready ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800'}`}>
                        <div className="text-sm text-slate-400">P1</div>
                        <div className="font-bold">{rd?.p1?.n ?? '---'}</div>
                        <div className="text-xs mt-1">{rd?.p1?.deck ?? 'デッキ未選択'}</div>
                        <div className={`text-xs mt-2 ${p1Ready ? 'text-green-400' : 'text-yellow-400'}`}>
                            {p1Ready ? 'Ready!' : '準備中...'}
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${p2Ready ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800'}`}>
                        <div className="text-sm text-slate-400">P2</div>
                        <div className="font-bold">{rd?.p2?.n ?? '待機中...'}</div>
                        <div className="text-xs mt-1">{rd?.p2?.deck ?? '---'}</div>
                        <div className={`text-xs mt-2 ${p2Ready ? 'text-green-400' : 'text-yellow-400'}`}>
                            {rd?.p2 ? (p2Ready ? 'Ready!' : '準備中...') : '---'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-4">
                    <button
                        onClick={() => onSetReady(!myReady)}
                        className={`px-6 py-2 rounded font-medium ${
                            myReady
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                        {myReady ? '準備取消' : 'Ready!'}
                    </button>

                    {isP1 && bothReady && (
                        <button
                            onClick={onStartGame}
                            className="px-6 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            対戦開始
                        </button>
                    )}

                    <button
                        onClick={onLeaveRoom}
                        className="px-6 py-2 rounded font-medium bg-slate-600 hover:bg-slate-700 text-white"
                    >
                        退室
                    </button>
                </div>
            </div>
        );
    }

    // ルームID入力画面
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <h2 className="text-2xl font-bold">オンライン対戦</h2>

            {!hasDeck && (
                <p className="text-yellow-400 text-sm">
                    先にデッキ管理タブでデッキを選択してください
                </p>
            )}

            {roomState.error && (
                <p className="text-red-400 text-sm">{roomState.error}</p>
            )}

            {mode === 'select' ? (
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => setMode('create')}
                        disabled={!hasDeck}
                        className="px-8 py-3 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ルームを作成
                    </button>
                    <button
                        onClick={() => setMode('join')}
                        disabled={!hasDeck}
                        className="px-8 py-3 rounded font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ルームに参加
                    </button>
                    <button
                        onClick={onBack}
                        className="px-8 py-3 rounded font-medium bg-slate-600 hover:bg-slate-700 text-white"
                    >
                        戻る
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 w-72">
                    <h3 className="text-lg font-medium text-center">
                        {mode === 'create' ? 'ルーム作成' : 'ルーム参加'}
                    </h3>

                    <input
                        type="text"
                        value={roomId}
                        onChange={e => setRoomId(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="4桁のルームID"
                        maxLength={4}
                        className="px-4 py-2 rounded bg-slate-700 border border-slate-600 text-center text-2xl tracking-widest focus:outline-none focus:border-blue-400"
                    />

                    <input
                        type="text"
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                        placeholder="プレイヤー名（任意）"
                        className="px-4 py-2 rounded bg-slate-700 border border-slate-600 text-sm focus:outline-none focus:border-blue-400"
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmit}
                            disabled={roomId.length !== 4 || !hasDeck || roomState.status === 'creating' || roomState.status === 'joining'}
                            className="flex-1 px-4 py-2 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {roomState.status === 'creating' || roomState.status === 'joining' ? '接続中...' : '決定'}
                        </button>
                        <button
                            onClick={() => { setMode('select'); setRoomId(''); }}
                            className="px-4 py-2 rounded font-medium bg-slate-600 hover:bg-slate-700 text-white"
                        >
                            戻る
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
