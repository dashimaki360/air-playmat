import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoinToss } from './CoinToss';

describe('CoinToss', () => {
    let onResult: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onResult = vi.fn();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('コイントスボタンを表示する', () => {
        render(<CoinToss onResult={onResult} />);
        expect(screen.getByRole('button', { name: /コイントス/i })).toBeDefined();
    });

    it('ボタンをクリックすると結果を表示する', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.3); // 表
        render(<CoinToss onResult={onResult} />);

        fireEvent.click(screen.getByRole('button', { name: /コイントス/i }));

        // アニメーション完了を待つ
        act(() => { vi.advanceTimersByTime(1000); });

        expect(screen.getByText('表')).toBeDefined();
        expect(onResult).toHaveBeenCalledWith('heads');

        vi.spyOn(Math, 'random').mockRestore();
    });

    it('裏が出た場合に正しく表示する', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.7); // 裏
        render(<CoinToss onResult={onResult} />);

        fireEvent.click(screen.getByRole('button', { name: /コイントス/i }));
        act(() => { vi.advanceTimersByTime(1000); });

        expect(screen.getByText('裏')).toBeDefined();
        expect(onResult).toHaveBeenCalledWith('tails');

        vi.spyOn(Math, 'random').mockRestore();
    });

    it('アニメーション中は再クリックできない', () => {
        render(<CoinToss onResult={onResult} />);

        fireEvent.click(screen.getByRole('button', { name: /コイントス/i }));

        // アニメーション中
        const button = screen.getByRole('button', { name: /コイントス/i });
        expect(button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true').toBe(true);

        act(() => { vi.advanceTimersByTime(1000); });
    });

    it('結果表示後に再度トスできる', () => {
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.3).mockReturnValueOnce(0.7);
        render(<CoinToss onResult={onResult} />);

        // 1回目
        fireEvent.click(screen.getByRole('button', { name: /コイントス/i }));
        act(() => { vi.advanceTimersByTime(1000); });
        expect(screen.getByText('表')).toBeDefined();

        // 2回目
        fireEvent.click(screen.getByRole('button', { name: /コイントス/i }));
        act(() => { vi.advanceTimersByTime(1000); });
        expect(screen.getByText('裏')).toBeDefined();

        expect(onResult).toHaveBeenCalledTimes(2);

        vi.spyOn(Math, 'random').mockRestore();
    });
});
