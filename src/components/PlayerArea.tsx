import { Card } from './Card';
import { CardStack } from './CardStack';
import { DroppableArea } from './DroppableArea';
import { StackedArea } from './StackedArea';
import { Search, Shuffle } from 'lucide-react';
import type { Card as CardType, AreaId, CardInfo } from '../types/game';
import type { GameLogAction } from '../hooks/useGameLog';

type PlayerAreaProps = {
    playerId?: string; // 'p1' | 'p2' — デフォルト 'p1'
    dndPlayerId?: string; // DnD用 'player-1' | 'player-2' — デフォルト 'player-1'
    getCardsByLocation: (loc: string) => CardType[];
    getAttachedCards: (cardId: string) => CardType[];
    updateCardStatus: (id: string, updater: (c: CardType) => CardType) => void;
    detachCard: (cardId: string, targetLoc: string) => void;
    trashWithAttachments: (cardId: string) => void;
    drawCard: (playerId: string) => void;
    shuffleDeck: (playerId: string) => void;
    returnAllHandToDeck: (playerId: string, bottom: boolean, shuffleAfter: boolean) => void;
    addLog: (player: string | null, action: GameLogAction, message: string) => void;
    setShowDeckModal: (show: boolean) => void;
    setShowTrashModal: (show: boolean) => void;
    cardLookup?: Map<string, CardInfo>;
};

export function PlayerArea({
    playerId: pid = 'p1',
    dndPlayerId: dndPid = 'player-1',
    getCardsByLocation,
    getAttachedCards,
    updateCardStatus,
    detachCard,
    trashWithAttachments,
    drawCard,
    shuffleDeck,
    returnAllHandToDeck,
    addLog,
    setShowDeckModal,
    setShowTrashModal,
    cardLookup,
}: PlayerAreaProps) {
    const renderCard = (card: CardType, area: AreaId, index?: number) => (
        <Card
            key={card.id}
            card={card}
            area={area}
            playerId={dndPid}
            index={index}
            onUpdateStatus={(id, updater) => updateCardStatus(id, updater)}
            cardLookup={cardLookup}
        />
    );

    const renderCardStack = (card: CardType, area: AreaId, index?: number) => {
        const attached = getAttachedCards(card.id);
        return (
            <CardStack
                key={card.id}
                baseCard={card}
                attachedCards={attached}
                area={area}
                playerId={dndPid}
                index={index}
                onUpdateStatus={(id, updater) => updateCardStatus(id, updater)}
                cardLookup={cardLookup}
                onDetachCard={(cardId, targetLoc) => detachCard(cardId, targetLoc)}
                onTrashWithAttachments={(cardId) => trashWithAttachments(cardId)}
            />
        );
    };

    return (
        <div className="flex flex-col gap-4 border-t-2 border-slate-700/50 pt-4 mt-2">
            {/* Row 1: Prize, Stadium & Active, Deck */}
            <div className="grid grid-cols-[1fr_80px_160px_1fr] sm:grid-cols-[1fr_100px_180px_1fr] md:grid-cols-[1fr_140px_200px_1fr] gap-2 md:gap-4 min-w-0">
                <DroppableArea id="prize" title="Prize" playerId={dndPid} className="min-h-[140px] md:min-h-[180px] bg-indigo-900/30 items-center justify-center">
                    <StackedArea cards={getCardsByLocation(`${pid}-prize`)} area="prize" onUpdateStatus={updateCardStatus} cardLookup={cardLookup} />
                </DroppableArea>

                <DroppableArea id="stadium" title="Stadium" playerId={dndPid} className="min-h-[140px] md:min-h-[180px] items-center justify-center border-slate-600 bg-slate-700/30">
                    {getCardsByLocation('stadium').length > 0 ? renderCard(getCardsByLocation('stadium')[0], 'stadium') : null}
                </DroppableArea>

                <DroppableArea id="active" title="Active" playerId={dndPid} className="min-h-[140px] md:min-h-[180px] items-center justify-center bg-blue-900/20 border-blue-800">
                    {getCardsByLocation(`${pid}-active`).length > 0 ? renderCardStack(getCardsByLocation(`${pid}-active`)[0], 'active') : null}
                </DroppableArea>

                <DroppableArea id="deck" title="Deck" playerId={dndPid} className="min-h-[140px] md:min-h-[180px] bg-slate-800/80 items-center justify-center relative">
                    <StackedArea cards={getCardsByLocation(`${pid}-deck`)} area="deck" onUpdateStatus={updateCardStatus} cardLookup={cardLookup} />

                    {/* Deck Action Buttons */}
                    <div className="flex gap-1 mt-2 z-30">
                        <button
                            onClick={(e) => { e.stopPropagation(); drawCard(pid); addLog(pid, 'draw', 'カードを1枚引いた'); }}
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
                            onClick={(e) => { e.stopPropagation(); shuffleDeck(pid); addLog(pid, 'shuffle', 'デッキをシャッフルした'); }}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-1 rounded shadow-md border border-slate-500 flex items-center justify-center transition-colors"
                            title="シャッフル"
                        >
                            <Shuffle size={12} />
                        </button>
                    </div>
                </DroppableArea>
            </div>

            {/* Row 2: Bench, Trash */}
            <div className="grid grid-cols-[1fr_100px] sm:grid-cols-[1fr_120px] md:grid-cols-[1fr_140px] gap-2 md:gap-4 min-w-0">
                <DroppableArea id="bench" title="Bench" playerId={dndPid} className="min-h-[140px] md:min-h-[180px]" innerClassName="grid grid-cols-5 gap-2 md:gap-4 flex-1 items-start content-start relative z-10 min-w-0">
                    {getCardsByLocation(`${pid}-bench`).map((c, i) => renderCardStack(c, 'bench', i))}
                </DroppableArea>

                <DroppableArea id="trash" title="Trash" playerId={dndPid} className="min-h-[140px] md:min-h-[180px] bg-slate-800/80 items-center justify-center">
                    <StackedArea cards={getCardsByLocation(`${pid}-trash`)} area="trash" onUpdateStatus={updateCardStatus} cardLookup={cardLookup} />
                    {getCardsByLocation(`${pid}-trash`).length > 0 && (
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
            <DroppableArea id="hand" title="Hand" playerId={dndPid} className="min-h-[140px] md:min-h-[180px] border-indigo-500/50 bg-indigo-900/10 shadow-inner" innerClassName="flex flex-col gap-2 flex-1 relative z-10 min-w-0">
                {/* Hand Actions */}
                {getCardsByLocation(`${pid}-hand`).length > 0 && (
                    <div className="flex justify-end gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); returnAllHandToDeck(pid, true, false); addLog(pid, 'return', '手札を全て山札の下に戻した'); }}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] px-2 py-1 rounded shadow-md border border-slate-500 transition-colors"
                            title="手札を全て山札の下に戻す"
                        >
                            全て山札の下へ
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); returnAllHandToDeck(pid, false, true); addLog(pid, 'return', '手札を全て山札に戻してシャッフルした'); }}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] px-2 py-1 rounded shadow-md border border-slate-500 transition-colors"
                            title="手札を全て山札に戻してシャッフル"
                        >
                            全て戻してシャッフル
                        </button>
                    </div>
                )}
                <div className="grid grid-cols-7 gap-2 md:gap-4 items-start content-start">
                    {getCardsByLocation(`${pid}-hand`).map((c, i) => renderCard(c, 'hand', i))}
                </div>
            </DroppableArea>
        </div>
    );
}
