import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGameLog } from './useGameLog';

describe('useGameLog', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('初期状態ではログが空', () => {
        const { result } = renderHook(() => useGameLog());
        expect(result.current.logs).toEqual([]);
    });

    it('addLog でログを追加できる', () => {
        const { result } = renderHook(() => useGameLog());

        act(() => {
            result.current.addLog('p1', 'draw', 'カードを1枚引いた');
        });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0]).toEqual({
            id: expect.any(String),
            timestamp: new Date('2026-01-01T12:00:00Z').getTime(),
            playerId: 'p1',
            action: 'draw',
            message: 'カードを1枚引いた',
        });
    });

    it('複数のログを追加できる（新しいものが先頭）', () => {
        const { result } = renderHook(() => useGameLog());

        act(() => {
            result.current.addLog('p1', 'draw', 'カードを1枚引いた');
        });

        vi.setSystemTime(new Date('2026-01-01T12:00:01Z'));

        act(() => {
            result.current.addLog('p2', 'move', 'ポケモンをベンチに出した');
        });

        expect(result.current.logs).toHaveLength(2);
        // 新しいログが先頭
        expect(result.current.logs[0].action).toBe('move');
        expect(result.current.logs[1].action).toBe('draw');
    });

    it('clearLogs でログを全消去できる', () => {
        const { result } = renderHook(() => useGameLog());

        act(() => {
            result.current.addLog('p1', 'draw', 'カードを1枚引いた');
            result.current.addLog('p2', 'shuffle', 'デッキをシャッフルした');
        });

        expect(result.current.logs).toHaveLength(2);

        act(() => {
            result.current.clearLogs();
        });

        expect(result.current.logs).toEqual([]);
    });

    it('様々なアクションタイプを記録できる', () => {
        const { result } = renderHook(() => useGameLog());

        const actions = [
            { playerId: 'p1', action: 'draw', message: 'カードを1枚引いた' },
            { playerId: 'p1', action: 'move', message: 'ピカチュウをアクティブに出した' },
            { playerId: 'p2', action: 'attach', message: 'エネルギーをつけた' },
            { playerId: 'p1', action: 'trash', message: 'ピカチュウがきぜつした' },
            { playerId: 'p2', action: 'shuffle', message: 'デッキをシャッフルした' },
            { playerId: 'p1', action: 'coin', message: 'コイントス: 表' },
            { playerId: 'p1', action: 'damage', message: 'ダメージ +30' },
            { playerId: 'p2', action: 'status', message: 'どく状態にした' },
        ] as const;

        act(() => {
            actions.forEach(a => result.current.addLog(a.playerId, a.action, a.message));
        });

        expect(result.current.logs).toHaveLength(8);
    });

    it('ログの最大件数を超えた場合、古いログが削除される', () => {
        const { result } = renderHook(() => useGameLog(5));

        act(() => {
            for (let i = 0; i < 7; i++) {
                result.current.addLog('p1', 'draw', `ログ${i}`);
            }
        });

        expect(result.current.logs).toHaveLength(5);
        // 最新のログが残っている
        expect(result.current.logs[0].message).toBe('ログ6');
        expect(result.current.logs[4].message).toBe('ログ2');
    });

    it('playerId なしでシステムログを記録できる', () => {
        const { result } = renderHook(() => useGameLog());

        act(() => {
            result.current.addLog(null, 'system', 'ゲームが開始されました');
        });

        expect(result.current.logs[0].playerId).toBeNull();
        expect(result.current.logs[0].action).toBe('system');
    });
});
