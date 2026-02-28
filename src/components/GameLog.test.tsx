import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameLog } from './GameLog';
import type { GameLogEntry } from '../hooks/useGameLog';

const createEntry = (overrides: Partial<GameLogEntry> = {}): GameLogEntry => ({
    id: 'log-1',
    timestamp: Date.now(),
    playerId: 'p1',
    action: 'draw',
    message: 'カードを1枚引いた',
    ...overrides,
});

describe('GameLog', () => {
    it('ログが空の時にメッセージを表示する', () => {
        render(<GameLog logs={[]} />);
        expect(screen.getByText('ログはまだありません')).toBeDefined();
    });

    it('ログエントリを表示する', () => {
        const logs = [
            createEntry({ id: 'log-1', message: 'カードを1枚引いた' }),
            createEntry({ id: 'log-2', playerId: 'p2', action: 'move', message: 'ピカチュウをベンチに出した' }),
        ];
        render(<GameLog logs={logs} />);
        expect(screen.getByText('カードを1枚引いた')).toBeDefined();
        expect(screen.getByText('ピカチュウをベンチに出した')).toBeDefined();
    });

    it('プレイヤーIDに応じたラベルを表示する', () => {
        const logs = [
            createEntry({ id: 'log-1', playerId: 'p1', message: 'テスト1' }),
            createEntry({ id: 'log-2', playerId: 'p2', message: 'テスト2' }),
        ];
        render(<GameLog logs={logs} />);
        expect(screen.getByText('P1')).toBeDefined();
        expect(screen.getByText('P2')).toBeDefined();
    });

    it('システムログはプレイヤーラベルなしで表示する', () => {
        const logs = [
            createEntry({ id: 'log-1', playerId: null, action: 'system', message: 'ゲーム開始' }),
        ];
        render(<GameLog logs={logs} />);
        expect(screen.getByText('ゲーム開始')).toBeDefined();
        expect(screen.queryByText('P1')).toBeNull();
        expect(screen.queryByText('P2')).toBeNull();
    });

    it('折りたたみ/展開が動作する', () => {
        const logs = [createEntry()];
        render(<GameLog logs={logs} />);

        // 初期状態は展開されている
        expect(screen.getByText('カードを1枚引いた')).toBeDefined();

        // 折りたたみボタンをクリック
        const toggleButton = screen.getByRole('button', { name: /ログ/i });
        fireEvent.click(toggleButton);

        // ログ内容が非表示
        expect(screen.queryByText('カードを1枚引いた')).toBeNull();

        // 再度クリックで展開
        fireEvent.click(toggleButton);
        expect(screen.getByText('カードを1枚引いた')).toBeDefined();
    });
});
