import { useState, useRef, useCallback } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { useGameState } from '../hooks/useGameState';
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
import type { CardInfo } from '../types/game';

type BoardProps = {
    deckCards?: CardInfo[];
};

export function Board({ deckCards }: BoardProps) {
    const { gameState, getCardsByLocation, getAttachedCards, moveCard, attachCard, detachCard, trashWithAttachments, updateCardStatus, drawCard, shuffleDeck, returnToDeck, returnAllHandToDeck } = useGameState(deckCards);
    const { logs, addLog } = useGameLog();
    const { sensors, activeCardData, handleDragStart, handleDragEnd } = useBoardDragDrop({ moveCard, attachCard, addLog });
    const [showDebug, setShowDebug] = useState(false);
    const [showDeckModal, setShowDeckModal] = useState(false);
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [isLogOpen, setIsLogOpen] = useState(true);
    const coinTossRef = useRef<CoinTossHandle>(null);

    const handleDrawCards = useCallback((count: number) => {
        for (let i = 0; i < count; i++) {
            drawCard('p1');
        }
        addLog('p1', 'draw', `カードを${count}枚引いた`);
    }, [drawCard, addLog]);

    const handlePrizeToHand = useCallback(() => {
        const prizeCards = getCardsByLocation('p1-prize');
        if (prizeCards.length === 0) return;
        const topCard = prizeCards[prizeCards.length - 1];
        moveCard(topCard.id, 'p1-prize', 'p1-hand');
        addLog('p1', 'move', 'サイドからカードを1枚手札に加えた');
    }, [getCardsByLocation, moveCard, addLog]);

    useKeyboardShortcuts({
        drawCards: handleDrawCards,
        shuffleDeck: () => { shuffleDeck('p1'); addLog('p1', 'shuffle', 'デッキをシャッフルした'); },
        toggleDeckModal: () => setShowDeckModal(prev => !prev),
        toggleTrashModal: () => setShowTrashModal(prev => !prev),
        returnAllHandAndShuffle: () => { returnAllHandToDeck('p1', false, true); addLog('p1', 'return', '手札を全て山札に戻してシャッフルした'); },
        tossCoin: () => coinTossRef.current?.toss(),
        toggleLog: () => setIsLogOpen(prev => !prev),
        prizeToHand: handlePrizeToHand,
    }, showDeckModal || showTrashModal);

    const p1 = gameState.p1;
    if (!p1) return <div className="text-white">Loading...</div>;

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
                            addLog('p1', 'coin', `コイントス: ${result === 'heads' ? '表' : '裏'}`);
                        }} />
                        <div className="text-sm font-medium px-3 py-1 bg-slate-700 rounded-full">
                            Room: <span className="text-blue-300">{gameState.roomId}</span>
                        </div>
                    </div>
                </div>

                {/* Opponent Area (Player 2) */}
                {gameState.p2 && (
                    <OpponentArea
                        p2={gameState.p2}
                        getCardsByLocation={getCardsByLocation}
                        getAttachedCards={getAttachedCards}
                    />
                )}

                {/* Player 1 Area */}
                <PlayerArea
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
                    cards={getCardsByLocation('p1-deck')}
                    onClose={() => setShowDeckModal(false)}
                    actions={[
                        {
                            label: '手札に加える',
                            onClick: (cardId) => {
                                moveCard(cardId, 'p1-deck', 'p1-hand');
                                addLog('p1', 'move', '山札からカードを手札に加えた');
                            },
                        },
                        {
                            label: 'トラッシュ',
                            onClick: (cardId) => {
                                moveCard(cardId, 'p1-deck', 'p1-trash');
                                addLog('p1', 'trash', '山札からカードをトラッシュした');
                            },
                        },
                    ]}
                    footerMessage="※ 左端が山札の下、右端が山札の上です"
                />
            )}

            {/* Trash Viewer Modal */}
            {showTrashModal && (
                <CardListModal
                    title="トラッシュの確認"
                    cards={getCardsByLocation('p1-trash')}
                    onClose={() => setShowTrashModal(false)}
                    actions={[
                        {
                            label: '手札に加える',
                            onClick: (cardId) => {
                                moveCard(cardId, 'p1-trash', 'p1-hand');
                                addLog('p1', 'move', 'トラッシュからカードを手札に加えた');
                            },
                        },
                        {
                            label: '山札の上へ',
                            onClick: (cardId) => {
                                returnToDeck(cardId, false);
                                addLog('p1', 'return', 'トラッシュからカードを山札の上に戻した');
                            },
                        },
                        {
                            label: '山札の下へ',
                            onClick: (cardId) => {
                                returnToDeck(cardId, true);
                                addLog('p1', 'return', 'トラッシュからカードを山札の下に戻した');
                            },
                        },
                        {
                            label: 'ベンチへ',
                            onClick: (cardId) => {
                                moveCard(cardId, 'p1-trash', 'p1-bench');
                                addLog('p1', 'move', 'トラッシュからカードをベンチに出した');
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
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
