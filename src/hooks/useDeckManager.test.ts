import { renderHook, act } from '@testing-library/react';
import { useDeckManager } from './useDeckManager';
import type { CardInfo } from '../types/game';

const mockCards: CardInfo[] = [
    { id: '1', name: 'ピカチュウ', count: 4, imageUrl: 'https://example.com/1.jpg', type: 'ポケモン' },
    { id: '2', name: 'ハイパーボール', count: 4, imageUrl: 'https://example.com/2.jpg', type: 'グッズ' },
    { id: '3', name: '基本雷エネルギー', count: 52, imageUrl: 'https://example.com/3.jpg', type: 'エネルギー' },
];

// fetch をモック
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// デフォルトデッキ自動読み込み用のモックを設定
function mockAutoImport() {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cards: mockCards }),
    });
}

describe('useDeckManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('マウント時にデフォルトデッキが自動読み込みされる', async () => {
        mockAutoImport();
        const { result } = renderHook(() => useDeckManager());

        await act(async () => {});

        expect(result.current.decks).toHaveLength(1);
        expect(result.current.decks[0].code).toBe('RSp2M2-ioZymR-SpXMyp');
        expect(result.current.selectedIndex).toBe(0);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('importDeck で API からデッキをインポートできる', async () => {
        mockAutoImport();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ cards: mockCards }),
        });

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        await act(async () => {
            await result.current.importDeck('test-code-123');
        });

        expect(result.current.decks).toHaveLength(2);
        expect(result.current.decks[1].code).toBe('test-code-123');
        expect(result.current.decks[1].cards).toEqual(mockCards);
        expect(result.current.error).toBeNull();
    });

    it('importDeck 中は isLoading が true になる', async () => {
        mockAutoImport();

        let resolvePromise: (value: unknown) => void;
        mockFetch.mockReturnValueOnce(
            new Promise((resolve) => { resolvePromise = resolve; })
        );

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        let importPromise: Promise<void>;
        act(() => {
            importPromise = result.current.importDeck('test-code');
        });

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            resolvePromise!({ ok: true, json: async () => ({ cards: mockCards }) });
            await importPromise;
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('API エラー時に error が設定される', async () => {
        mockAutoImport();
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({ error: 'Deck not found' }),
        });

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        await act(async () => {
            await result.current.importDeck('invalid-code');
        });

        expect(result.current.decks).toHaveLength(1);
        expect(result.current.error).toBe('Deck not found');
    });

    it('ネットワークエラー時に error が設定される', async () => {
        mockAutoImport();
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        await act(async () => {
            await result.current.importDeck('any-code');
        });

        expect(result.current.decks).toHaveLength(1);
        expect(result.current.error).toBe('Network error');
    });

    it('selectDeck でデッキを選択できる', async () => {
        mockAutoImport();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ cards: mockCards }),
        });

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        await act(async () => {
            await result.current.importDeck('code-1');
        });

        act(() => {
            result.current.selectDeck(1);
        });

        expect(result.current.selectedIndex).toBe(1);
    });

    it('removeDeck でデッキを削除できる', async () => {
        mockAutoImport();
        mockFetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ cards: mockCards }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ cards: mockCards }) });

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        await act(async () => {
            await result.current.importDeck('code-1');
            await result.current.importDeck('code-2');
        });

        expect(result.current.decks).toHaveLength(3);

        act(() => {
            result.current.removeDeck(1);
        });

        expect(result.current.decks).toHaveLength(2);
        expect(result.current.decks[1].code).toBe('code-2');
    });

    it('選択中のデッキを削除すると selectedIndex が null になる', async () => {
        mockAutoImport();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ cards: mockCards }),
        });

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        await act(async () => {
            await result.current.importDeck('code-1');
        });

        act(() => {
            result.current.selectDeck(1);
        });

        expect(result.current.selectedIndex).toBe(1);

        act(() => {
            result.current.removeDeck(1);
        });

        expect(result.current.selectedIndex).toBeNull();
    });

    it('選択中より前のデッキを削除すると selectedIndex が調整される', async () => {
        mockAutoImport();
        mockFetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ cards: mockCards }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ cards: mockCards }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ cards: mockCards }) });

        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        await act(async () => {
            await result.current.importDeck('code-1');
            await result.current.importDeck('code-2');
            await result.current.importDeck('code-3');
        });

        act(() => {
            result.current.selectDeck(3);
        });

        act(() => {
            result.current.removeDeck(1);
        });

        expect(result.current.selectedIndex).toBe(2);
    });

    it('空のデッキコードではインポートしない', async () => {
        mockAutoImport();
        const { result } = renderHook(() => useDeckManager());
        await act(async () => {});

        mockFetch.mockClear();

        await act(async () => {
            await result.current.importDeck('');
        });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.current.error).toBe('デッキコードを入力してください');
    });
});
