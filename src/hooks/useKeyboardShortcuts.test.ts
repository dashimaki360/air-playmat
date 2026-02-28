import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import type { KeyboardShortcutActions } from './useKeyboardShortcuts';

function fireKeydown(key: string) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function createMockActions(): KeyboardShortcutActions {
    return {
        drawCards: vi.fn(),
        shuffleDeck: vi.fn(),
        toggleDeckModal: vi.fn(),
        toggleTrashModal: vi.fn(),
        returnAllHandAndShuffle: vi.fn(),
        tossCoin: vi.fn(),
        toggleLog: vi.fn(),
        prizeToHand: vi.fn(),
    };
}

describe('useKeyboardShortcuts', () => {
    it('1〜9キーでdrawCardsが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('1');
        expect(actions.drawCards).toHaveBeenCalledWith(1);

        fireKeydown('5');
        expect(actions.drawCards).toHaveBeenCalledWith(5);

        fireKeydown('9');
        expect(actions.drawCards).toHaveBeenCalledWith(9);

        expect(actions.drawCards).toHaveBeenCalledTimes(3);
    });

    it('sキーでshuffleDeckが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('s');
        expect(actions.shuffleDeck).toHaveBeenCalledTimes(1);
    });

    it('dキーでtoggleDeckModalが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('d');
        expect(actions.toggleDeckModal).toHaveBeenCalledTimes(1);
    });

    it('tキーでtoggleTrashModalが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('t');
        expect(actions.toggleTrashModal).toHaveBeenCalledTimes(1);
    });

    it('rキーでreturnAllHandAndShuffleが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('r');
        expect(actions.returnAllHandAndShuffle).toHaveBeenCalledTimes(1);
    });

    it('cキーでtossCoinが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('c');
        expect(actions.tossCoin).toHaveBeenCalledTimes(1);
    });

    it('lキーでtoggleLogが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('l');
        expect(actions.toggleLog).toHaveBeenCalledTimes(1);
    });

    it('pキーでprizeToHandが呼ばれる', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('p');
        expect(actions.prizeToHand).toHaveBeenCalledTimes(1);
    });

    it('モーダルが開いている時はショートカットが無効化される', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, true));

        fireKeydown('1');
        fireKeydown('s');
        fireKeydown('c');
        fireKeydown('r');
        fireKeydown('p');

        expect(actions.drawCards).not.toHaveBeenCalled();
        expect(actions.shuffleDeck).not.toHaveBeenCalled();
        expect(actions.tossCoin).not.toHaveBeenCalled();
        expect(actions.returnAllHandAndShuffle).not.toHaveBeenCalled();
        expect(actions.prizeToHand).not.toHaveBeenCalled();
    });

    it('モーダル中でもd/t/lキーは動作する（モーダル開閉・ログ用）', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, true));

        fireKeydown('d');
        fireKeydown('t');
        fireKeydown('l');

        expect(actions.toggleDeckModal).toHaveBeenCalledTimes(1);
        expect(actions.toggleTrashModal).toHaveBeenCalledTimes(1);
        expect(actions.toggleLog).toHaveBeenCalledTimes(1);
    });

    it('関係ないキーでは何も呼ばれない', () => {
        const actions = createMockActions();
        renderHook(() => useKeyboardShortcuts(actions, false));

        fireKeydown('x');
        fireKeydown('Enter');
        fireKeydown('0');

        Object.values(actions).forEach(fn => {
            expect(fn).not.toHaveBeenCalled();
        });
    });

    it('アンマウント時にイベントリスナーが削除される', () => {
        const actions = createMockActions();
        const { unmount } = renderHook(() => useKeyboardShortcuts(actions, false));

        unmount();

        fireKeydown('1');
        expect(actions.drawCards).not.toHaveBeenCalled();
    });
});
