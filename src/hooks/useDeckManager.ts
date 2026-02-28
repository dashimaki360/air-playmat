import { useState } from 'react';
import type { DeckData, CardInfo } from '../types/game';

export function useDeckManager() {
    const [decks, setDecks] = useState<DeckData[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const importDeck = async (code: string) => {
        if (!code.trim()) {
            setError('デッキコードを入力してください');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`https://air-playmat.vercel.app/api/getDeck?code=${encodeURIComponent(code)}`);

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || `エラーが発生しました (${response.status})`);
                return;
            }

            const data: { cards: CardInfo[] } = await response.json();
            setDecks(prev => [...prev, { code, cards: data.cards }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'デッキの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const selectDeck = (index: number) => {
        setSelectedIndex(index);
    };

    const removeDeck = (index: number) => {
        setDecks(prev => prev.filter((_, i) => i !== index));
        setSelectedIndex(prev => {
            if (prev === null) return null;
            if (prev === index) return null;
            if (prev > index) return prev - 1;
            return prev;
        });
    };

    return { decks, selectedIndex, isLoading, error, importDeck, selectDeck, removeDeck };
}
