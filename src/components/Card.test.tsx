import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from './Card';
import type { Card as CardType } from '../types/game';

// Mock dnd-kit since Card uses it
vi.mock('@dnd-kit/core', () => ({
    useDraggable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        isDragging: false,
    }),
}));

const mockCardWithoutImage: CardType = {
    id: 'test-1',
    tId: 'mock-template',
    f: true,
    d: 0,
    cnd: [],
    name: 'Pikachu',
    l: 'p1-active',
    o: 0,
};

const mockCardWithImage: CardType = {
    ...mockCardWithoutImage,
    id: 'test-2',
    imageUrl: 'https://example.com/pikachu.jpg',
};

const mockFacedownCard: CardType = {
    ...mockCardWithImage,
    id: 'test-3',
    f: false,
};

describe('Card Component', () => {
    it('renders card name when face up', () => {
        render(<Card card={mockCardWithoutImage} area="active" playerId="p1" onUpdateStatus={() => {}} />);
        expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });

    it('renders image when imageUrl is provided and face up, but not the name', () => {
        render(<Card card={mockCardWithImage} area="active" playerId="p1" onUpdateStatus={() => {}} />);
        const img = screen.getByRole('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/pikachu.jpg');
        
        // Name should not be rendered
        expect(screen.queryByText('Pikachu')).not.toBeInTheDocument();
    });

    it('does not render image or name when face down', () => {
        render(<Card card={mockFacedownCard} area="active" playerId="p1" onUpdateStatus={() => {}} />);
        expect(screen.queryByText('Pikachu')).not.toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
