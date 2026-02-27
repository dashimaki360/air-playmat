import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks
vi.mock('@dnd-kit/core', async () => {
    const actual = await vi.importActual('@dnd-kit/core');
    return {
        ...actual,
        useDraggable: () => ({
            attributes: {},
            listeners: {},
            setNodeRef: vi.fn(),
            transform: null,
            isDragging: false,
        }),
    };
});
