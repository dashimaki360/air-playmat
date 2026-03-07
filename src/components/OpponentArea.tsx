import { CardStack } from './CardStack';
import type { Card as CardType, AreaId, CardInfo } from '../types/game';
import type { PlayerState } from '../types/game';

type OpponentAreaProps = {
    playerId?: string; // 'p1' | 'p2' — デフォルト 'p2'
    dndPlayerId?: string; // DnD用 'player-1' | 'player-2' — デフォルト 'player-2'
    opponent: PlayerState;
    getCardsByLocation: (loc: string) => CardType[];
    getAttachedCards: (cardId: string) => CardType[];
    cardLookup?: Map<string, CardInfo>;
};

export function OpponentArea({
    playerId: pid = 'p2',
    dndPlayerId: dndPid = 'player-2',
    opponent,
    getCardsByLocation,
    getAttachedCards,
    cardLookup,
}: OpponentAreaProps) {
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
                onUpdateStatus={() => {}}
                cardLookup={cardLookup}
            />
        );
    };

    const opponentActive = getCardsByLocation(`${pid}-active`)[0];

    return (
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-red-900/50 bg-red-950/20">
            <div className="text-red-400 font-bold mb-2 text-center border-b border-red-900/50 pb-2">
                {opponent.n}
            </div>

            {/* Opponent Hand (Hidden usually, roughly showing count) */}
            <div className="flex justify-center gap-1 mb-2 opacity-60">
                <div className="text-xs text-red-300">Hand: {getCardsByLocation(`${pid}-hand`).length}</div>
            </div>

            <div className="grid grid-cols-[1fr_2fr_1fr] gap-4">
                {/* Opponent Deck & Trash (Left side from our perspective) */}
                <div className="flex flex-col gap-2 items-center justify-center opacity-80 min-h-[140px] border border-red-900/30 rounded-lg p-2 bg-red-950/30">
                    <div className="text-[10px] text-red-400 uppercase">Prize / Trash</div>
                    <div className="flex gap-2">
                        <div className="w-16 h-24 rounded border border-red-800 bg-red-900/50 flex items-center justify-center text-xs">P: {getCardsByLocation(`${pid}-prize`).length}</div>
                        <div className="w-16 h-24 rounded border border-red-800 bg-slate-800/50 flex items-center justify-center text-xs text-slate-400">T: {getCardsByLocation(`${pid}-trash`).length}</div>
                    </div>
                </div>

                {/* Opponent Active & Bench */}
                <div className="flex flex-col gap-4 items-center">
                    <div className="flex justify-center gap-2 min-h-[120px] opacity-80">
                        {getCardsByLocation(`${pid}-bench`).map((c, i) => (
                            <div key={c.id} className="transform scale-75 origin-top">
                                {renderCardStack(c, 'bench', i)}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center min-h-[140px]">
                        {opponentActive && (
                            <div className="transform scale-90 origin-bottom">
                                {renderCardStack(opponentActive, 'active')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Opponent Deck (Right side) */}
                <div className="flex flex-col gap-2 items-center justify-center opacity-80 min-h-[140px] border border-red-900/30 rounded-lg p-2 bg-red-950/30">
                    <div className="text-[10px] text-red-400 uppercase">Deck</div>
                    <div className="w-16 h-24 rounded border border-red-800 bg-red-900/50 flex items-center justify-center text-xs font-bold text-white">
                        {getCardsByLocation(`${pid}-deck`).length}
                    </div>
                </div>
            </div>
        </div>
    );
}
