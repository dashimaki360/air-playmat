import { useEffect } from 'react';

export type KeyboardShortcutActions = {
    drawCards: (count: number) => void;
    shuffleDeck: () => void;
    toggleDeckModal: () => void;
    toggleTrashModal: () => void;
    returnAllHandAndShuffle: () => void;
    tossCoin: () => void;
    toggleLog: () => void;
    prizeToHand: () => void;
};

export function useKeyboardShortcuts(
    actions: KeyboardShortcutActions,
    isModalOpen: boolean
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // モーダル開閉・ログトグルはモーダル中でも動作
            if (e.key === 'd') {
                actions.toggleDeckModal();
                return;
            }
            if (e.key === 't') {
                actions.toggleTrashModal();
                return;
            }
            if (e.key === 'l') {
                actions.toggleLog();
                return;
            }

            // モーダルが開いている場合はその他のショートカットを無効化
            if (isModalOpen) return;

            // 1〜9: N枚ドロー
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= 9) {
                actions.drawCards(num);
                return;
            }

            switch (e.key) {
                case 's':
                    actions.shuffleDeck();
                    break;
                case 'r':
                    actions.returnAllHandAndShuffle();
                    break;
                case 'c':
                    actions.tossCoin();
                    break;
                case 'p':
                    actions.prizeToHand();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [actions, isModalOpen]);
}
