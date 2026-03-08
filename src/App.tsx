import { useState, useCallback, useRef, useEffect } from 'react';
import { Board } from './components/Board';
import { Lobby } from './components/Lobby';
import { DeckManager } from './components/DeckManager';
import { useDeckManager } from './hooks/useDeckManager';
import { useRoom } from './hooks/useRoom';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { createInitialState } from './hooks/useGameState';
import type { GameState } from './types/game';
import type { PlayerId } from './types/room';

type Tab = 'deck' | 'battle';
type BattleMode = 'select' | 'local' | 'online';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('battle');
  const [battleMode, setBattleMode] = useState<BattleMode>('select');
  const { decks, selectedIndex, isLoading, error, importDeck, selectDeck, removeDeck } = useDeckManager();
  const { roomState, createRoom, joinRoom, setReady, startGame, leaveRoom } = useRoom();

  const selectedDeck = selectedIndex !== null && selectedIndex < decks.length ? decks[selectedIndex] : null;

  // Board の setGameState を保持するref（リモート更新用）
  const boardSetStateRef = useRef<((state: GameState) => void) | null>(null);

  // Firebase 同期: オンラインモードで対戦中のみ有効
  const isOnlinePlaying = battleMode === 'online' && roomState.status === 'playing' && !!roomState.roomId && !!roomState.playerId;

  const handleRemoteUpdate = useCallback((state: GameState) => {
    if (boardSetStateRef.current) {
      boardSetStateRef.current(state);
    }
  }, []);

  const firebaseSync = useFirebaseSync({
    roomId: roomState.roomId || '',
    playerId: (roomState.playerId || 'p1') as PlayerId,
    enabled: isOnlinePlaying,
    onRemoteUpdate: handleRemoteUpdate,
  });

  // Board から setGameState のrefを受け取るコールバック
  const handleBoardRemoteUpdate = useCallback((setter: (state: GameState) => void) => {
    boardSetStateRef.current = setter;
  }, []);

  // sessionStorage にルーム情報を保存/復元
  useEffect(() => {
    if (roomState.roomId && roomState.playerId) {
      sessionStorage.setItem('air-playmat-room', JSON.stringify({
        roomId: roomState.roomId,
        playerId: roomState.playerId,
      }));
    }
  }, [roomState.roomId, roomState.playerId]);

  // ルーム退出時にsessionStorageをクリア
  const handleLeaveRoom = useCallback(() => {
    sessionStorage.removeItem('air-playmat-room');
    leaveRoom();
    setBattleMode('select');
  }, [leaveRoom]);

  // 対戦開始ハンドラ（p1がゲーム状態を生成してFirebaseに書き込む）
  const handleStartGame = useCallback(async () => {
    if (!roomState.roomData?.p2?.deckCards || !selectedDeck) return;

    const initialState = {
      ...createInitialState(
        selectedDeck.cards,
        roomState.roomData.p1.n,
        roomState.roomData.p2.n,
        roomState.roomData.p2.deckCards,
      ),
      roomId: roomState.roomId!,
    };

    await firebaseSync.writeInitialState(initialState);
    await startGame();
  }, [roomState, selectedDeck, firebaseSync, startGame]);

  // 接続状態インジケーター
  const connectionIndicator = isOnlinePlaying && roomState.roomData ? (
    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs">
      <span className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${roomState.roomData.meta.p1Connected ? 'bg-green-400' : 'bg-red-400'}`} />
        P1
      </span>
      <span className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${roomState.roomData.meta.p2Connected ? 'bg-green-400' : 'bg-red-400'}`} />
        P2
      </span>
      <span className="text-slate-500">|</span>
      <span className="text-blue-300">Room: {roomState.roomId}</span>
      <button
        onClick={handleLeaveRoom}
        className="ml-1 text-red-400 hover:text-red-300"
        title="退室"
      >
        退室
      </button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 bg-slate-800">
        <button
          onClick={() => setActiveTab('deck')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'deck'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          デッキ管理
        </button>
        <button
          onClick={() => setActiveTab('battle')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'battle'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          対戦
          {selectedDeck && (
            <span className="ml-2 text-xs text-green-400">({selectedDeck.code})</span>
          )}
        </button>
        <div className="flex-1" />
        {connectionIndicator}
      </div>

      {/* Tab Content */}
      {activeTab === 'deck' ? (
        <DeckManager
          decks={decks}
          selectedIndex={selectedIndex}
          isLoading={isLoading}
          error={error}
          onImport={importDeck}
          onSelect={selectDeck}
          onRemove={removeDeck}
        />
      ) : (
        <>
          {battleMode === 'select' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
              <h2 className="text-2xl font-bold">対戦モード</h2>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => setBattleMode('local')}
                  className="px-8 py-3 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
                >
                  ローカル対戦
                </button>
                <button
                  onClick={() => setBattleMode('online')}
                  className="px-8 py-3 rounded font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                  オンライン対戦
                </button>
              </div>
            </div>
          )}

          {battleMode === 'local' && (
            <div>
              <div className="flex justify-end p-2">
                <button
                  onClick={() => setBattleMode('select')}
                  className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 bg-slate-800 rounded border border-slate-700"
                >
                  モード選択に戻る
                </button>
              </div>
              <Board key={selectedDeck?.code ?? 'default'} deckCards={selectedDeck?.cards} />
            </div>
          )}

          {battleMode === 'online' && roomState.status !== 'playing' && (
            <Lobby
              roomState={roomState}
              deckCode={selectedDeck?.code ?? null}
              deckCards={selectedDeck?.cards}
              onCreateRoom={createRoom}
              onJoinRoom={joinRoom}
              onSetReady={setReady}
              onStartGame={handleStartGame}
              onLeaveRoom={handleLeaveRoom}
              onBack={() => setBattleMode('select')}
            />
          )}

          {battleMode === 'online' && roomState.status === 'playing' && roomState.roomId && roomState.playerId && (
            <Board
              key={`online-${roomState.roomId}`}
              deckCards={selectedDeck?.cards}
              perspective={roomState.playerId}
              firebaseSync={{ pushUpdate: firebaseSync.pushUpdate }}
              roomId={roomState.roomId}
              onRemoteUpdate={handleBoardRemoteUpdate}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
