import { useState, useEffect, useRef } from 'react';
import type { DeckData, CardInfo } from '../types/game';

const DEFAULT_DECK_CODE = 'RSp2M2-ioZymR-SpXMyp';

export function useDeckManager() {
    const [decks, setDecks] = useState<DeckData[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
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

    // 起動時にデフォルトデッキを自動読み込み
    const autoImported = useRef(false);
    useEffect(() => {
        if (!autoImported.current) {
            autoImported.current = true;
            importDeck(DEFAULT_DECK_CODE);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
