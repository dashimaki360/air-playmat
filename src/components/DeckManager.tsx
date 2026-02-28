import { useState } from 'react';
import type { DeckData, CardInfo } from '../types/game';

type DeckManagerProps = {
    decks: DeckData[];
    selectedIndex: number | null;
    isLoading: boolean;
    error: string | null;
    onImport: (code: string) => Promise<void>;
    onSelect: (index: number) => void;
    onRemove: (index: number) => void;
};

const CARD_TYPE_LABELS: Record<string, string> = {
    'ポケモン': 'ポケモン',
    'グッズ': 'グッズ',
    'ポケモンのどうぐ': 'どうぐ',
    'サポート': 'サポート',
    'スタジアム': 'スタジアム',
    'エネルギー': 'エネルギー',
    'わざマシン': 'わざマシン',
};

export function DeckManager({ decks, selectedIndex, isLoading, error, onImport, onSelect, onRemove }: DeckManagerProps) {
    const [deckCode, setDeckCode] = useState('');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onImport(deckCode);
        setDeckCode('');
    };

    const getDeckSummary = (deck: DeckData) => {
        const totalCards = deck.cards.reduce((sum, c) => sum + c.count, 0);
        const byType: Record<string, number> = {};
        deck.cards.forEach(c => {
            const type = c.type || '不明';
            byType[type] = (byType[type] || 0) + c.count;
        });
        return { totalCards, byType };
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                <label className="text-sm font-medium text-slate-300 self-center whitespace-nowrap">
                    デッキコード:
                </label>
                <input
                    type="text"
                    value={deckCode}
                    onChange={e => setDeckCode(e.target.value)}
                    placeholder="例: kVvkkv-69A7Uu-kdfv11"
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                    {isLoading ? 'インポート中...' : 'インポート'}
                </button>
            </form>

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            {decks.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                    デッキがまだインポートされていません
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-medium text-slate-400">インポート済みデッキ:</h3>
                    {decks.map((deck, index) => {
                        const { totalCards, byType } = getDeckSummary(deck);
                        const isSelected = selectedIndex === index;

                        return (
                            <div
                                key={`${deck.code}-${index}`}
                                className={`p-4 rounded-lg border transition-colors ${
                                    isSelected
                                        ? 'border-blue-500 bg-blue-900/30'
                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    {deck.cards[0] && (
                                        <img
                                            src={deck.cards[0].imageUrl}
                                            alt={deck.cards[0].name}
                                            className="w-10 h-14 object-cover rounded-sm shrink-0"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {isSelected && <span className="text-yellow-400">★</span>}
                                            <span className="font-medium text-slate-200 truncate">
                                                {deck.code}
                                            </span>
                                            <span className="text-xs text-slate-400">({totalCards}枚)</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                                            {Object.entries(byType).map(([type, count]) => (
                                                <span key={type}>
                                                    {CARD_TYPE_LABELS[type] || type}:{count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                            className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                                        >
                                            {expandedIndex === index ? '閉じる' : '詳細'}
                                        </button>
                                        {!isSelected && (
                                            <button
                                                onClick={() => onSelect(index)}
                                                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                                            >
                                                選択
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onRemove(index)}
                                            className="px-3 py-1 text-xs bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded transition-colors"
                                        >
                                            削除
                                        </button>
                                    </div>
                                </div>
                                {expandedIndex === index && (
                                    <DeckCardList cards={deck.cards} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const CARD_TYPE_ORDER = ['ポケモン', 'グッズ', 'ポケモンのどうぐ', 'サポート', 'スタジアム', 'エネルギー', 'わざマシン'];

function DeckCardList({ cards }: { cards: CardInfo[] }) {
    const grouped: Record<string, CardInfo[]> = {};
    cards.forEach(card => {
        const type = card.type || '不明';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(card);
    });

    const sortedTypes = Object.keys(grouped).sort((a, b) => {
        const ai = CARD_TYPE_ORDER.indexOf(a);
        const bi = CARD_TYPE_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    return (
        <div className="mt-3 pt-3 border-t border-slate-700">
            {sortedTypes.map(type => (
                <div key={type} className="mb-3">
                    <h4 className="text-xs font-medium text-slate-400 mb-1">
                        {CARD_TYPE_LABELS[type] || type} ({grouped[type].reduce((s, c) => s + c.count, 0)})
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                        {grouped[type].map(card => (
                            <div key={card.id} className="flex items-center gap-2 text-xs text-slate-300 py-0.5 px-2 rounded bg-slate-800/50">
                                <img
                                    src={card.imageUrl}
                                    alt={card.name}
                                    className="w-8 h-11 object-cover rounded-sm shrink-0"
                                />
                                <span className="truncate">{card.name}</span>
                                <span className="text-slate-500 ml-auto shrink-0">x{card.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
