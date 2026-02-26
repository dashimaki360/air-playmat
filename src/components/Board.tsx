import { useState } from 'react';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useGameState } from '../hooks/useGameState';
import { Card } from './Card';
import { DroppableArea } from './DroppableArea';
import type { Card as CardType, AreaId, DraggableItemData } from '../types/game';

export function Board() {
    const { gameState, getCardsByLocation, moveCard, updateCardStatus } = useGameState();
    const [activeCardData, setActiveCardData] = useState<DraggableItemData | null>(null);
    const [showDebug, setShowDebug] = useState(false);

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

        if (active.data.current?.type === 'card' && over.data.current?.type === 'area') {
            const activeData = active.data.current as DraggableItemData;
            const targetAreaId = over.data.current.areaId as AreaId;
            // We only support moving for player 1 currently
            // if target player is different, handle it here

            // Move card
            if (activeData.sourceArea !== targetAreaId) {
                // Convert "player-1" to "p1" for location keys
                const pPrefix = activeData.playerId === 'player-1' ? 'p1' : 'p2';
                
                const sourceLoc = activeData.sourceArea === 'stadium' 
                    ? 'stadium' 
                    : `${pPrefix}-${activeData.sourceArea}`;
                const targetLoc = targetAreaId === 'stadium' 
                    ? 'stadium' 
                    : `${pPrefix}-${targetAreaId}`;
                
                // Active or Stadium generally only has 1 card
                moveCard(activeData.card.id, sourceLoc, targetLoc);

                // もしHandへ移動した場合は自動的に表向き（f = true）にする
                if (targetAreaId === 'hand') {
                    // Update the state slightly after move completes
                    setTimeout(() => {
                        updateCardStatus(activeData.card.id, (c) => ({ ...c, f: true }));
                    }, 0);
                }

                // もしDeckへ移動した場合は自動的に裏向き（f = false）にする
                if (targetAreaId === 'deck') {
                    setTimeout(() => {
                        updateCardStatus(activeData.card.id, (c) => ({ ...c, f: false }));
                    }, 0);
                }
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
            <div className="min-h-screen bg-slate-900 text-slate-100 p-2 md:p-6 w-full max-w-7xl mx-auto flex flex-col gap-4">
                {/* Header */}
                <div className="flex justify-between items-center py-2 px-4 bg-slate-800 rounded-lg shadow-sm border border-slate-700">
                    <h1 className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                        air-playmat
                    </h1>
                    <div className="text-sm font-medium px-3 py-1 bg-slate-700 rounded-full">
                        Room: <span className="text-blue-300">{gameState.roomId}</span>
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
                                        {getCardsByLocation('p2-bench').map((c) => (
                                            <div key={c.id} className="transform scale-75 origin-top">
                                                <Card card={c} area="bench" playerId="player-2" onUpdateStatus={() => { }} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center min-h-[140px]">
                                        {p2Active && (
                                            <div className="transform scale-90 origin-bottom">
                                                <Card card={p2Active} area="active" playerId="player-2" onUpdateStatus={() => { }} />
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
                    <div className="grid grid-cols-[100px_80px_1fr_100px] sm:grid-cols-[120px_100px_1fr_120px] md:grid-cols-[140px_140px_1fr_140px] gap-2 md:gap-4">
                        <DroppableArea id="prize" title="Prize" playerId="player-1" className="min-h-[140px] md:min-h-[180px] bg-indigo-900/30 items-center justify-center">
                            {renderStackedArea(getCardsByLocation('p1-prize'), 'prize')}
                        </DroppableArea>
                        
                        <DroppableArea id="stadium" title="Stadium" playerId="player-1" className="min-h-[140px] md:min-h-[180px] items-center justify-center border-slate-600 bg-slate-700/30">
                            {getCardsByLocation('stadium').length > 0 ? renderCard(getCardsByLocation('stadium')[0], 'stadium') : null}
                        </DroppableArea>

                        <DroppableArea id="active" title="Active" playerId="player-1" className="min-h-[140px] md:min-h-[180px] items-center justify-center bg-blue-900/20 border-blue-800">
                            {getCardsByLocation('p1-active').length > 0 ? renderCard(getCardsByLocation('p1-active')[0], 'active') : null}
                        </DroppableArea>

                        <DroppableArea id="deck" title="Deck" playerId="player-1" className="min-h-[140px] md:min-h-[180px] bg-slate-800/80 items-center justify-center">
                            {renderStackedArea(getCardsByLocation('p1-deck'), 'deck')}
                        </DroppableArea>
                    </div>

                    {/* Row 2: Bench (widely taking left side), Trash (right end) */}
                    <div className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_120px] md:grid-cols-[1fr_140px] gap-2 md:gap-4">
                        <DroppableArea id="bench" title="Bench" playerId="player-1" className="min-h-[140px] md:min-h-[180px] justify-center flex-row flex-wrap content-start">
                            {getCardsByLocation('p1-bench').map((c, i) => renderCard(c, 'bench', i))}
                        </DroppableArea>

                        <DroppableArea id="trash" title="Trash" playerId="player-1" className="min-h-[140px] md:min-h-[180px] bg-slate-800/80 items-center justify-center">
                            {renderStackedArea(getCardsByLocation('p1-trash'), 'trash')}
                        </DroppableArea>
                    </div>

                    {/* Row 3: Hand */}
                    <DroppableArea id="hand" title="Hand" playerId="player-1" className="min-h-[140px] md:min-h-[180px] border-indigo-500/50 bg-indigo-900/10 shadow-inner flex-row flex-wrap content-start">
                        {getCardsByLocation('p1-hand').map((c, i) => renderCard(c, 'hand', i))}
                    </DroppableArea>
                </div>

            </div>

            {/* Debug Console */}
            <div className="w-full max-w-7xl mx-auto mt-8 mb-4 px-2 md:px-6">
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
