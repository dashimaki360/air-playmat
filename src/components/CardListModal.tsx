import { Card as CardComponent } from './Card';
import type { Card } from '../types/game';

export type CardAction = {
    label: string;
    onClick: (cardId: string) => void;
};

type CardListModalProps = {
    title: string;
    cards: Card[];
    onClose: () => void;
    actions?: CardAction[];
    footerMessage?: string;
};

export function CardListModal({ title, cards, onClose, actions = [], footerMessage }: CardListModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div
                data-testid="modal-overlay"
                className="absolute inset-0"
                onClick={onClose}
            />
            <div className="relative bg-slate-800 border-2 border-slate-600 rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50 rounded-t-xl">
                    <h2 className="text-xl font-bold">
                        {title} ({cards.length}枚)
                    </h2>
                    <button
                        onClick={onClose}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded font-bold transition-colors"
                    >
                        閉じる
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-slate-900/20">
                    {cards.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-8">カードがありません</div>
                    ) : (
                        <div className="flex flex-wrap gap-3 justify-center">
                            {cards.map(c => (
                                <div key={c.id} className="flex flex-col items-center gap-1">
                                    <CardComponent
                                        card={{ ...c, f: true }}
                                        area="deck"
                                        playerId="player-1"
                                        onUpdateStatus={() => {}}
                                    />
                                    {actions.length > 0 && (
                                        <div className="flex gap-1 flex-wrap justify-center">
                                            {actions.map(action => (
                                                <button
                                                    key={action.label}
                                                    onClick={() => action.onClick(c.id)}
                                                    className="text-[10px] px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded border border-slate-500 transition-colors"
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {footerMessage && (
                    <div className="p-3 border-t border-slate-700 text-sm text-slate-400 text-center bg-slate-900/50 rounded-b-xl">
                        {footerMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
