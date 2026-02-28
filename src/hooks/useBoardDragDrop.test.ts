import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBoardDragDrop } from './useBoardDragDrop';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

// dnd-kit の useSensor/useSensors をモック
vi.mock('@dnd-kit/core', async () => {
    const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
    return {
        ...actual,
        useSensor: vi.fn(() => ({})),
        useSensors: vi.fn((...args: unknown[]) => args),
    };
});

const createMockArgs = () => ({
    moveCard: vi.fn(),
    attachCard: vi.fn(),
    addLog: vi.fn(),
});

describe('useBoardDragDrop', () => {
    it('初期状態では activeCardData が null', () => {
        const { result } = renderHook(() => useBoardDragDrop(createMockArgs()));
        expect(result.current.activeCardData).toBeNull();
    });

    it('handleDragStart でカードデータを activeCardData にセットする', () => {
        const { result } = renderHook(() => useBoardDragDrop(createMockArgs()));

        const cardData = {
            type: 'card' as const,
            card: { id: 'card-1', name: 'ピカチュウ' },
            sourceArea: 'hand' as const,
            playerId: 'player-1',
        };

        act(() => {
            result.current.handleDragStart({
                active: { data: { current: cardData } },
            } as unknown as DragStartEvent);
        });

        expect(result.current.activeCardData).toEqual(cardData);
    });

    it('handleDragStart でカード以外のタイプは無視される', () => {
        const { result } = renderHook(() => useBoardDragDrop(createMockArgs()));

        act(() => {
            result.current.handleDragStart({
                active: { data: { current: { type: 'other' } } },
            } as unknown as DragStartEvent);
        });

        expect(result.current.activeCardData).toBeNull();
    });

    it('handleDragEnd でカードをエリアに移動する', () => {
        const args = createMockArgs();
        const { result } = renderHook(() => useBoardDragDrop(args));

        act(() => {
            result.current.handleDragEnd({
                active: {
                    data: {
                        current: {
                            type: 'card',
                            card: { id: 'card-1', name: 'ピカチュウ' },
                            sourceArea: 'hand',
                            playerId: 'player-1',
                        },
                    },
                },
                over: {
                    data: {
                        current: { type: 'area', areaId: 'bench' },
                    },
                },
            } as unknown as DragEndEvent);
        });

        expect(args.moveCard).toHaveBeenCalledWith('card-1', 'p1-hand', 'p1-bench');
        expect(args.addLog).toHaveBeenCalledWith('p1', 'move', 'ピカチュウをbenchに移動');
        expect(result.current.activeCardData).toBeNull();
    });

    it('handleDragEnd でカードをカードに重ねる（attach）', () => {
        const args = createMockArgs();
        const { result } = renderHook(() => useBoardDragDrop(args));

        act(() => {
            result.current.handleDragEnd({
                active: {
                    data: {
                        current: {
                            type: 'card',
                            card: { id: 'card-1', name: 'エネルギー' },
                            sourceArea: 'hand',
                            playerId: 'player-1',
                        },
                    },
                },
                over: {
                    data: {
                        current: { type: 'card', cardId: 'card-2' },
                    },
                },
            } as unknown as DragEndEvent);
        });

        expect(args.attachCard).toHaveBeenCalledWith('card-1', 'card-2');
        expect(args.addLog).toHaveBeenCalledWith('p1', 'attach', 'エネルギーをつけた');
        expect(args.moveCard).not.toHaveBeenCalled();
    });

    it('handleDragEnd で自分自身に重ねようとした場合は無視される', () => {
        const args = createMockArgs();
        const { result } = renderHook(() => useBoardDragDrop(args));

        act(() => {
            result.current.handleDragEnd({
                active: {
                    data: {
                        current: {
                            type: 'card',
                            card: { id: 'card-1', name: 'ピカチュウ' },
                            sourceArea: 'active',
                            playerId: 'player-1',
                        },
                    },
                },
                over: {
                    data: {
                        current: { type: 'card', cardId: 'card-1' },
                    },
                },
            } as unknown as DragEndEvent);
        });

        expect(args.attachCard).not.toHaveBeenCalled();
    });

    it('handleDragEnd で over が null の場合は何もしない', () => {
        const args = createMockArgs();
        const { result } = renderHook(() => useBoardDragDrop(args));

        act(() => {
            result.current.handleDragEnd({
                active: {
                    data: {
                        current: {
                            type: 'card',
                            card: { id: 'card-1' },
                            sourceArea: 'hand',
                            playerId: 'player-1',
                        },
                    },
                },
                over: null,
            } as unknown as DragEndEvent);
        });

        expect(args.moveCard).not.toHaveBeenCalled();
        expect(args.attachCard).not.toHaveBeenCalled();
    });

    it('handleDragEnd で同じエリアへの移動は無視される', () => {
        const args = createMockArgs();
        const { result } = renderHook(() => useBoardDragDrop(args));

        act(() => {
            result.current.handleDragEnd({
                active: {
                    data: {
                        current: {
                            type: 'card',
                            card: { id: 'card-1', name: 'ピカチュウ' },
                            sourceArea: 'hand',
                            playerId: 'player-1',
                        },
                    },
                },
                over: {
                    data: {
                        current: { type: 'area', areaId: 'hand' },
                    },
                },
            } as unknown as DragEndEvent);
        });

        expect(args.moveCard).not.toHaveBeenCalled();
    });

    it('handleDragEnd で stadium エリアはプレイヤーprefixなしで処理される', () => {
        const args = createMockArgs();
        const { result } = renderHook(() => useBoardDragDrop(args));

        act(() => {
            result.current.handleDragEnd({
                active: {
                    data: {
                        current: {
                            type: 'card',
                            card: { id: 'card-1', name: 'スタジアム' },
                            sourceArea: 'hand',
                            playerId: 'player-1',
                        },
                    },
                },
                over: {
                    data: {
                        current: { type: 'area', areaId: 'stadium' },
                    },
                },
            } as unknown as DragEndEvent);
        });

        expect(args.moveCard).toHaveBeenCalledWith('card-1', 'p1-hand', 'stadium');
    });

    it('handleDragEnd で stackBaseCardId がある場合はそちらを移動対象にする', () => {
        const args = createMockArgs();
        const { result } = renderHook(() => useBoardDragDrop(args));

        act(() => {
            result.current.handleDragEnd({
                active: {
                    data: {
                        current: {
                            type: 'card',
                            card: { id: 'evo-card', name: 'リザードン' },
                            sourceArea: 'active',
                            playerId: 'player-1',
                            stackBaseCardId: 'base-card',
                        },
                    },
                },
                over: {
                    data: {
                        current: { type: 'area', areaId: 'bench' },
                    },
                },
            } as unknown as DragEndEvent);
        });

        expect(args.moveCard).toHaveBeenCalledWith('base-card', 'p1-active', 'p1-bench');
    });
});
