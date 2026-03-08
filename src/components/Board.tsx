import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useGameState, buildCardLookup } from '../hooks/useGameState';
import type { FirebaseSyncRef } from '../hooks/useGameState';
import { useGameLog } from '../hooks/useGameLog';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useBoardDragDrop } from '../hooks/useBoardDragDrop';
import { Card } from './Card';
import { GameLog } from './GameLog';
import { CoinToss } from './CoinToss';
import { CardListModal } from './CardListModal';
import { OpponentArea } from './OpponentArea';
import { PlayerArea } from './PlayerArea';
import type { CoinResult, CoinTossHandle } from './CoinToss';
import type { CardInfo, GameState } from '../types/game';
import type { PlayerId } from '../types/room';
import defaultDeck from '../data/defaultDeck.json';

type BoardProps = {
    deckCards?: CardInfo[];
    perspective?: PlayerId;  // 'p1' | 'p2' — どちらのプレイヤー視点で表示するか
    firebaseSync?: FirebaseSyncRef;
    roomId?: string;
    onRemoteUpdate?: (setter: (state: GameState) => void) => void;
};

export function Board({ deckCards, perspective = 'p1', firebaseSync, roomId, onRemoteUpdate }: BoardProps) {
    const { gameState, setGameState, getCardsByLocation, getAttachedCards, moveCard, attachCard, detachCard, trashWithAttachments, updateCardStatus, drawCard, shuffleDeck, returnToDeck, returnAllHandToDeck } = useGameState(deckCards, firebaseSync);

    // cId → CardInfo のルックアップ Map を構築
    const cardLookup = useMemo(() => buildCardLookup(deckCards || (defaultDeck.cards as CardInfo[])), [deckCards]);

    // リモート更新コールバックを親に公開
    useEffect(() => {
        if (onRemoteUpdate) {
            onRemoteUpdate((state: GameState) => setGameState(state));
        }
    }, [onRemoteUpdate, setGameState]);
    const { logs, addLog } = useGameLog();
    const { sensors, activeCardData, handleDragStart, handleDragEnd } = useBoardDragDrop({ moveCard, attachCard, addLog, cardLookup });
    const [showDebug, setShowDebug] = useState(false);
    const [showDeckModal, setShowDeckModal] = useState(false);
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [isLogOpen, setIsLogOpen] = useState(true);
    const coinTossRef = useRef<CoinTossHandle>(null);

    // perspective に基づくプレイヤーID
    const myId = perspective;                     // 'p1' or 'p2'
    const opponentId = perspective === 'p1' ? 'p2' : 'p1';
    const myDndId = perspective === 'p1' ? 'player-1' : 'player-2';
    const opponentDndId = perspective === 'p1' ? 'player-2' : 'player-1';

    const handleDrawCards = useCallback((count: number) => {
        for (let i = 0; i < count; i++) {
            drawCard(myId);
        }
        addLog(myId, 'draw', `カードを${count}枚引いた`);
    }, [drawCard, addLog, myId]);

    const handlePrizeToHand = useCallback(() => {
        const prizeCards = getCardsByLocation(`${myId}-prize`);
        if (prizeCards.length === 0) return;
        const topCard = prizeCards[prizeCards.length - 1];
        moveCard(topCard.id, `${myId}-prize`, `${myId}-hand`);
        addLog(myId, 'move', 'サイドからカードを1枚手札に加えた');
    }, [getCardsByLocation, moveCard, addLog, myId]);

    useKeyboardShortcuts({
        drawCards: handleDrawCards,
        shuffleDeck: () => { shuffleDeck(myId); addLog(myId, 'shuffle', 'デッキをシャッフルした'); },
        toggleDeckModal: () => setShowDeckModal(prev => !prev),
        toggleTrashModal: () => setShowTrashModal(prev => !prev),
        returnAllHandAndShuffle: () => { returnAllHandToDeck(myId, false, true); addLog(myId, 'return', '手札を全て山札に戻してシャッフルした'); },
        tossCoin: () => coinTossRef.current?.toss(),
        toggleLog: () => setIsLogOpen(prev => !prev),
        prizeToHand: handlePrizeToHand,
    }, showDeckModal || showTrashModal);

    // フラット構造: gameState.c に全カードが統合されている
    if (!gameState.c) return <div className="text-white">Loading...</div>;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="bg-slate-900 text-slate-100 p-2 md:p-6 w-full max-w-7xl mx-auto flex flex-col gap-4 overflow-x-hidden">
                {/* Header */}
                <div className="flex justify-between items-center py-2 px-4 bg-slate-800 rounded-lg shadow-sm border border-slate-700">
                    <h1 className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                        air-playmat
                    </h1>
                    <div className="flex items-center gap-3">
                        <CoinToss ref={coinTossRef} onResult={(result: CoinResult) => {
                            addLog(myId, 'coin', `コイントス: ${result === 'heads' ? '表' : '裏'}`);
                        }} />
                        <div className="text-sm font-medium px-3 py-1 bg-slate-700 rounded-full">
                            Room: <span className="text-blue-300">{roomId || gameState.roomId}</span>
                        </div>
                    </div>
                </div>

                {/* Opponent Area */}
                <OpponentArea
                    playerId={opponentId}
                    dndPlayerId={opponentDndId}
                    opponentName={opponentId === 'p1' ? gameState.m.p1n : gameState.m.p2n}
                    getCardsByLocation={getCardsByLocation}
                    getAttachedCards={getAttachedCards}
                    cardLookup={cardLookup}
                />

                {/* My Player Area */}
                <PlayerArea
                    playerId={myId}
                    dndPlayerId={myDndId}
                    getCardsByLocation={getCardsByLocation}
                    getAttachedCards={getAttachedCards}
                    updateCardStatus={updateCardStatus}
                    detachCard={detachCard}
                    trashWithAttachments={trashWithAttachments}
                    drawCard={drawCard}
                    shuffleDeck={shuffleDeck}
                    returnAllHandToDeck={returnAllHandToDeck}
                    addLog={addLog}
                    setShowDeckModal={setShowDeckModal}
                    setShowTrashModal={setShowTrashModal}
                    cardLookup={cardLookup}
                />
            </div>

            {/* Game Log Panel */}
            <div className="w-full max-w-7xl mx-auto px-2 md:px-6">
                <GameLog logs={logs} isOpen={isLogOpen} onToggle={() => setIsLogOpen(prev => !prev)} />
            </div>

            {/* Debug Console */}
            <div className="w-full max-w-7xl mx-auto mt-4 mb-4 px-2 md:px-6">
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded border border-slate-700 transition"
                >
                    {showDebug ? 'Hide Debug Data -' : 'Show State JSON +'}
                </button>
                {showDebug && (
                    <div className="mt-2 bg-slate-950 rounded-lg p-4 overflow-x-auto text-xs text-green-400 border border-slate-700/50 max-h-[400px] overflow-y-auto">
                        <pre>{JSON.stringify(gameState, null, 2)}</pre>
                    </div>
                )}
            </div>

            {/* Deck Viewer Modal */}
            {showDeckModal && (
                <CardListModal
                    title="山札の確認"
                    cards={getCardsByLocation(`${myId}-deck`)}
                    onClose={() => setShowDeckModal(false)}
                    actions={[
                        {
                            label: '手札に加える',
                            onClick: (cardId) => {
                                moveCard(cardId, `${myId}-deck`, `${myId}-hand`);
                                addLog(myId, 'move', '山札からカードを手札に加えた');
                            },
                        },
                        {
                            label: 'トラッシュ',
                            onClick: (cardId) => {
                                moveCard(cardId, `${myId}-deck`, `${myId}-trash`);
                                addLog(myId, 'trash', '山札からカードをトラッシュした');
                            },
                        },
                    ]}
                    footerMessage="※ 左端が山札の下、右端が山札の上です"
                    cardLookup={cardLookup}
                />
            )}

            {/* Trash Viewer Modal */}
            {showTrashModal && (
                <CardListModal
                    title="トラッシュの確認"
                    cards={getCardsByLocation(`${myId}-trash`)}
                    onClose={() => setShowTrashModal(false)}
                    cardLookup={cardLookup}
                    actions={[
                        {
                            label: '手札に加える',
                            onClick: (cardId) => {
                                moveCard(cardId, `${myId}-trash`, `${myId}-hand`);
                                addLog(myId, 'move', 'トラッシュからカードを手札に加えた');
                            },
                        },
                        {
                            label: '山札の上へ',
                            onClick: (cardId) => {
                                returnToDeck(cardId, false);
                                addLog(myId, 'return', 'トラッシュからカードを山札の上に戻した');
                            },
                        },
                        {
                            label: '山札の下へ',
                            onClick: (cardId) => {
                                returnToDeck(cardId, true);
                                addLog(myId, 'return', 'トラッシュからカードを山札の下に戻した');
                            },
                        },
                        {
                            label: 'ベンチへ',
                            onClick: (cardId) => {
                                moveCard(cardId, `${myId}-trash`, `${myId}-bench`);
                                addLog(myId, 'move', 'トラッシュからカードをベンチに出した');
                            },
                        },
                    ]}
                />
            )}

            <DragOverlay dropAnimation={null}>
                {activeCardData ? (
                    <div className="opacity-90 scale-105 transform origin-center shadow-2xl">
                        <Card
                            card={activeCardData.card}
                            area={activeCardData.sourceArea}
                            playerId={activeCardData.playerId}
                            onUpdateStatus={() => { }}
                            cardLookup={cardLookup}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
