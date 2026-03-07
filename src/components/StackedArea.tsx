import { Card } from './Card';
import type { Card as CardType, AreaId, CardInfo } from '../types/game';

type StackedAreaProps = {
    cards: CardType[];
    area: AreaId;
    onUpdateStatus: (id: string, updater: (c: CardType) => CardType) => void;
    cardLookup?: Map<string, CardInfo>;
};

export function StackedArea({ cards, area, onUpdateStatus, cardLookup }: StackedAreaProps) {
    if (cards.length === 0) return null;

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
                <Card
                    key={topCard.id}
                    card={topCard}
                    area={area}
                    playerId="player-1"
                    index={cards.length - 1}
                    onUpdateStatus={onUpdateStatus}
                    cardLookup={cardLookup}
                />
            </div>

            <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-full px-2 py-0.5 min-w-[24px] text-center border-2 border-slate-500 shadow-md z-20 pointer-events-none">
                {cards.length}
            </div>
        </div>
    );
}
