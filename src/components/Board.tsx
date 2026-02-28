import { useState, useRef, useCallback } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useGameState } from '../hooks/useGameState';
import { useGameLog } from '../hooks/useGameLog';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Card } from './Card';
import { CardStack } from './CardStack';
import { DroppableArea } from './DroppableArea';
import { GameLog } from './GameLog';
import { CoinToss } from './CoinToss';
import { CardListModal } from './CardListModal';
import type { CoinResult, CoinTossHandle } from './CoinToss';
import type { Card as CardType, AreaId, DraggableItemData, CardInfo } from '../types/game';
import { Search, Shuffle } from 'lucide-react';

type BoardProps = {
    deckCards?: CardInfo[];
};

export function Board({ deckCards }: BoardProps) {
    const { gameState, getCardsByLocation, getAttachedCards, moveCard, attachCard, detachCard, trashWithAttachments, updateCardStatus, drawCard, shuffleDeck, returnToDeck, returnAllHandToDeck } = useGameState(deckCards);
    const { logs, addLog } = useGameLog();
    const [activeCardData, setActiveCardData] = useState<DraggableItemData | null>(null);
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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // minimum drag distance before triggering
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'card') {
            setActiveCardData(active.data.current as DraggableItemData);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveCardData(null);
        const { active, over } = event;

        if (!over) return;

        // カードの上にカードをドロップ（重ねる）
        if (active.data.current?.type === 'card' && over.data.current?.type === 'card') {
            const activeData = active.data.current as DraggableItemData;
            const targetCardId = over.data.current.cardId as string;

            // 自分自身には重ねられない
            if (activeData.card.id !== targetCardId) {
                attachCard(activeData.card.id, targetCardId);
                const pPrefix = activeData.playerId === 'player-1' ? 'p1' : 'p2';
                addLog(pPrefix, 'attach', `${activeData.card.name || 'カード'}をつけた`);
            }
            return;
        }

        if (active.data.current?.type === 'card' && over.data.current?.type === 'area') {
            const activeData = active.data.current as DraggableItemData;
            const targetAreaId = over.data.current.areaId as AreaId;

            // Move card
            if (activeData.sourceArea !== targetAreaId) {
                const pPrefix = activeData.playerId === 'player-1' ? 'p1' : 'p2';

                const sourceLoc = activeData.sourceArea === 'stadium'
                    ? 'stadium'
                    : `${pPrefix}-${activeData.sourceArea}`;
                const targetLoc = targetAreaId === 'stadium'
                    ? 'stadium'
                    : `${pPrefix}-${targetAreaId}`;

                // スタックの場合はベースカードを移動（スタック全体が連動して動く）
                const cardIdToMove = activeData.stackBaseCardId ?? activeData.card.id;
                moveCard(cardIdToMove, sourceLoc, targetLoc);
                addLog(pPrefix, 'move', `${activeData.card.name || 'カード'}を${targetAreaId}に移動`);
            }
        }
    };

    // Safe check if player exists
    const p1 = gameState.p1;
    if (!p1) return <div className="text-white">Loading...</div>;

    const renderCard = (card: CardType, area: AreaId, index?: number) => (
        <Card
            key={card.id}
            card={card}
            area={area}
            playerId="player-1"
            index={index}
            onUpdateStatus={(id, updater) => updateCardStatus(id, updater)}
        />
    );

    // Active/Bench エリアのポケモンを CardStack で描画
    const renderCardStack = (card: CardType, area: AreaId, playerId: string, index?: number) => {
        const attached = getAttachedCards(card.id);
        const isP1 = playerId === 'player-1';
        return (
            <CardStack
                key={card.id}
                baseCard={card}
                attachedCards={attached}
                area={area}
                playerId={playerId}
                index={index}
                onUpdateStatus={isP1 ? (id, updater) => updateCardStatus(id, updater) : () => {}}
                onDetachCard={isP1 ? (cardId, targetLoc) => detachCard(cardId, targetLoc) : undefined}
                onTrashWithAttachments={isP1 ? (cardId) => trashWithAttachments(cardId) : undefined}
            />
        );
    };

    const renderStackedArea = (cards: CardType[], area: AreaId) => {
        if (cards.length === 0) return null;
        // 最後に配列の末尾にある要素を一番上のカードとして扱う
        const topCard = cards[cards.length - 1];

        return (
            <div className="relative flex items-center justify-center pt-2 pl-2">
                {/* Visual stack depth */}
                {cards.length > 2 && (
                    <div className="absolute top-4 left-4 w-20 h-28 sm:w-24 sm:h-32 md:w-32 md:h-44 rounded-lg shadow-sm border-2 border-slate-800 bg-gradient-to-br from-blue-700 to-indigo-900 pointer-events-none z-0"></div>
                )}
                {cards.length > 1 && (
                    <div className="absolute top-3 left-3 w-20 h-28 sm:w-24 sm:h-32 md:w-32 md:h-44 rounded-lg shadow-sm border-2 border-slate-800 bg-gradient-to-br from-blue-700 to-indigo-900 pointer-events-none z-0"></div>
                )}

                <div className="relative z-10">
                    {renderCard(topCard, area, cards.length - 1)}
                </div>

                <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-full px-2 py-0.5 min-w-[24px] text-center border-2 border-slate-500 shadow-md z-20 pointer-events-none">
                    {cards.length}
                </div>
            </div>
        );
    };

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
                {(() => {
                    const p2 = gameState.p2;
                    if (!p2) return null;
                    const p2Active = getCardsByLocation('p2-active')[0];
                    return (
                        <div className="flex flex-col gap-4 p-4 rounded-xl border border-red-900/50 bg-red-950/20">
                            <div className="text-red-400 font-bold mb-2 text-center border-b border-red-900/50 pb-2">
                                {p2.n}
                            </div>

                            {/* Opponent Hand (Hidden usually, roughly showing count) */}
                            <div className="flex justify-center gap-1 mb-2 opacity-60">
                                <div className="text-xs text-red-300">Hand: {getCardsByLocation('p2-hand').length}</div>
                            </div>

                            <div className="grid grid-cols-[1fr_2fr_1fr] gap-4">
                                {/* Opponent Deck & Trash (Left side from our perspective) */}
                                <div className="flex flex-col gap-2 items-center justify-center opacity-80 min-h-[140px] border border-red-900/30 rounded-lg p-2 bg-red-950/30">
                                    <div className="text-[10px] text-red-400 uppercase">Prize / Trash</div>
                                    <div className="flex gap-2">
                                        <div className="w-16 h-24 rounded border border-red-800 bg-red-900/50 flex items-center justify-center text-xs">P: {getCardsByLocation('p2-prize').length}</div>
                                        <div className="w-16 h-24 rounded border border-red-800 bg-slate-800/50 flex items-center justify-center text-xs text-slate-400">T: {getCardsByLocation('p2-trash').length}</div>
                                    </div>
                                </div>

                                {/* Opponent Active & Bench */}
                                <div className="flex flex-col gap-4 items-center">
                                    <div className="flex justify-center gap-2 min-h-[120px] opacity-80">
                                        {getCardsByLocation('p2-bench').map((c, i) => (
                                            <div key={c.id} className="transform scale-75 origin-top">
                                                {renderCardStack(c, 'bench', 'player-2', i)}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center min-h-[140px]">
                                        {p2Active && (
                                            <div className="transform scale-90 origin-bottom">
                                                {renderCardStack(p2Active, 'active', 'player-2')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Opponent Deck (Right side) */}
                                <div className="flex flex-col gap-2 items-center justify-center opacity-80 min-h-[140px] border border-red-900/30 rounded-lg p-2 bg-red-950/30">
                                    <div className="text-[10px] text-red-400 uppercase">Deck</div>
                                    <div className="w-16 h-24 rounded border border-red-800 bg-red-900/50 flex items-center justify-center text-xs font-bold text-white">
                                        {getCardsByLocation('p2-deck').length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* 3 Rows Layout for Player 1 */}
                <div className="flex flex-col gap-4 border-t-2 border-slate-700/50 pt-4 mt-2">
                    
                    {/* Row 1: Prize, Stadium & Active, Deck */}
                    {/* Activeを中央に広くとるためのグリッド */}
                    <div className="grid grid-cols-[1fr_80px_160px_1fr] sm:grid-cols-[1fr_100px_180px_1fr] md:grid-cols-[1fr_140px_200px_1fr] gap-2 md:gap-4 min-w-0">
                        <DroppableArea id="prize" title="Prize" playerId="player-1" className="min-h-[140px] md:min-h-[180px] bg-indigo-900/30 items-center justify-center">
                            {renderStackedArea(getCardsByLocation('p1-prize'), 'prize')}
                        </DroppableArea>
                        
                        <DroppableArea id="stadium" title="Stadium" playerId="player-1" className="min-h-[140px] md:min-h-[180px] items-center justify-center border-slate-600 bg-slate-700/30">
                            {getCardsByLocation('stadium').length > 0 ? renderCard(getCardsByLocation('stadium')[0], 'stadium') : null}
                        </DroppableArea>

                        <DroppableArea id="active" title="Active" playerId="player-1" className="min-h-[140px] md:min-h-[180px] items-center justify-center bg-blue-900/20 border-blue-800">
                            {getCardsByLocation('p1-active').length > 0 ? renderCardStack(getCardsByLocation('p1-active')[0], 'active', 'player-1') : null}
                        </DroppableArea>

                        <DroppableArea id="deck" title="Deck" playerId="player-1" className="min-h-[140px] md:min-h-[180px] bg-slate-800/80 items-center justify-center relative">
                            {renderStackedArea(getCardsByLocation('p1-deck'), 'deck')}
                            
                            {/* Deck Action Buttons (below the stack) */}
                            <div className="flex gap-1 mt-2 z-30">
                                <button
                                    onClick={(e) => { e.stopPropagation(); drawCard('p1'); addLog('p1', 'draw', 'カードを1枚引いた'); }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1 rounded shadow-md border border-blue-400 transition-colors font-bold"
                                    title="1枚ドロー"
                                >
                                    ドロー
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowDeckModal(true); }}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-1 rounded shadow-md border border-slate-500 flex items-center justify-center transition-colors"
                                    title="山札を見る"
                                >
                                    <Search size={12} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); shuffleDeck('p1'); addLog('p1', 'shuffle', 'デッキをシャッフルした'); }}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-1 rounded shadow-md border border-slate-500 flex items-center justify-center transition-colors"
                                    title="シャッフル"
                                >
                                    <Shuffle size={12} />
                                </button>
                            </div>
                        </DroppableArea>
                    </div>

                    {/* Row 2: Bench (widely taking left side), Trash (right end) */}
                    <div className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_120px] md:grid-cols-[1fr_140px] gap-2 md:gap-4 min-w-0">
                        <DroppableArea id="bench" title="Bench" playerId="player-1" className="min-h-[140px] md:min-h-[180px]" innerClassName="grid grid-cols-5 gap-2 md:gap-4 flex-1 items-start content-start relative z-10 min-w-0">
                            {getCardsByLocation('p1-bench').map((c, i) => renderCardStack(c, 'bench', 'player-1', i))}
                        </DroppableArea>

                        <DroppableArea id="trash" title="Trash" playerId="player-1" className="min-h-[140px] md:min-h-[180px] bg-slate-800/80 items-center justify-center">
                            {renderStackedArea(getCardsByLocation('p1-trash'), 'trash')}
                            {getCardsByLocation('p1-trash').length > 0 && (
                                <div className="flex gap-1 mt-2 z-30">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowTrashModal(true); }}
                                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded shadow-md border border-slate-500 flex items-center justify-center transition-colors"
                                        title="トラッシュを確認"
                                    >
                                        <Search size={16} />
                                    </button>
                                </div>
                            )}
                        </DroppableArea>
                    </div>

                    {/* Row 3: Hand */}
                    <DroppableArea id="hand" title="Hand" playerId="player-1" className="min-h-[140px] md:min-h-[180px] border-indigo-500/50 bg-indigo-900/10 shadow-inner" innerClassName="flex flex-col gap-2 flex-1 relative z-10 min-w-0">
                        {/* Hand Actions */}
                        {getCardsByLocation('p1-hand').length > 0 && (
                            <div className="flex justify-end gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); returnAllHandToDeck('p1', true, false); addLog('p1', 'return', '手札を全て山札の下に戻した'); }}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] px-2 py-1 rounded shadow-md border border-slate-500 transition-colors"
                                    title="手札を全て山札の下に戻す"
                                >
                                    全て山札の下へ
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); returnAllHandToDeck('p1', false, true); addLog('p1', 'return', '手札を全て山札に戻してシャッフルした'); }}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] px-2 py-1 rounded shadow-md border border-slate-500 transition-colors"
                                    title="手札を全て山札に戻してシャッフル"
                                >
                                    全て戻してシャッフル
                                </button>
                            </div>
                        )}
                        <div className="grid grid-cols-7 gap-2 md:gap-4 items-start content-start">
                            {getCardsByLocation('p1-hand').map((c, i) => renderCard(c, 'hand', i))}
                        </div>
                    </DroppableArea>
                </div>

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
                        {/* Render a slightly transparent static card for drag overlay */}
                        <Card
                            card={activeCardData.card}
                            area={activeCardData.sourceArea}
                            playerId={activeCardData.playerId}
                            onUpdateStatus={() => { }} // Disabled in overlay
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
