import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card } from './Card';
import type { Card as CardType, CardInfo } from '../types/game';
import { resolveCardImageUrl } from '../constants';

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

const cardLookup = new Map<string, CardInfo>([
    ['pikachu-id', { id: 'pikachu-id', name: 'Pikachu', count: 1, imageUrl: 'SV1/pikachu.jpg' }],
]);

const mockCardWithoutImage: CardType = {
    id: 'test-1',
    cId: 'unknown-id',
    f: true,
    d: 0,
    cnd: [],
    l: 'p1-active',
    o: 0,
};

const mockCardWithImage: CardType = {
    ...mockCardWithoutImage,
    id: 'test-2',
    cId: 'pikachu-id',
};

const mockFacedownCard: CardType = {
    ...mockCardWithImage,
    id: 'test-3',
    f: false,
};

describe('Card Component', () => {
    it('renders card name when face up', () => {
        render(<Card card={mockCardWithoutImage} area="active" playerId="p1" onUpdateStatus={() => {}} cardLookup={cardLookup} />);
        expect(screen.getByText('Card')).toBeInTheDocument();
    });

    it('renders image when imageUrl is provided and face up, but not the name', () => {
        render(<Card card={mockCardWithImage} area="active" playerId="p1" onUpdateStatus={() => {}} cardLookup={cardLookup} />);
        const img = screen.getByRole('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', resolveCardImageUrl('SV1/pikachu.jpg'));

        // Name should not be rendered
        expect(screen.queryByText('Pikachu')).not.toBeInTheDocument();
    });

    it('does not render image or name when face down', () => {
        render(<Card card={mockFacedownCard} area="active" playerId="p1" onUpdateStatus={() => {}} cardLookup={cardLookup} />);
        expect(screen.queryByText('Pikachu')).not.toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});

// ── CardMenu の表示制御 ──────────────────────────────────────────
describe('Card クリック時のメニュー表示', () => {
    const clickCard = (container: HTMLElement) => {
        const card = container.querySelector('.cursor-grab') as HTMLElement;
        fireEvent.click(card);
    };

    it('active エリアでクリックするとCardMenuが表示される', () => {
        const { container } = render(
            <Card card={mockCardWithoutImage} area="active" playerId="p1" onUpdateStatus={() => {}} />
        );
        clickCard(container);
        expect(screen.getByText('ダメージ')).toBeInTheDocument();
    });

    it('bench エリアでクリックするとCardMenuが表示される', () => {
        const { container } = render(
            <Card card={{ ...mockCardWithoutImage, l: 'p1-bench' }} area="bench" playerId="p1" onUpdateStatus={() => {}} />
        );
        clickCard(container);
        expect(screen.getByText('ダメージ')).toBeInTheDocument();
    });

    it('hand エリアでクリックしてもCardMenuが表示されない', () => {
        const { container } = render(
            <Card card={{ ...mockCardWithoutImage, l: 'p1-hand' }} area="hand" playerId="p1" onUpdateStatus={() => {}} />
        );
        clickCard(container);
        expect(screen.queryByText('ダメージ')).not.toBeInTheDocument();
    });

    it('prize エリアでクリックしてもCardMenuが表示されない', () => {
        const { container } = render(
            <Card card={{ ...mockCardWithoutImage, l: 'p1-prize' }} area="prize" playerId="p1" onUpdateStatus={() => {}} />
        );
        clickCard(container);
        expect(screen.queryByText('ダメージ')).not.toBeInTheDocument();
    });

    it('trash エリアでクリックしてもCardMenuが表示されない', () => {
        const { container } = render(
            <Card card={{ ...mockCardWithoutImage, l: 'p1-trash' }} area="trash" playerId="p1" onUpdateStatus={() => {}} />
        );
        clickCard(container);
        expect(screen.queryByText('ダメージ')).not.toBeInTheDocument();
    });

    it('isAttached=true のときクリックしてもメニューが開かない', () => {
        const { container } = render(
            <Card card={mockCardWithoutImage} area="active" playerId="p1" onUpdateStatus={() => {}} isAttached={true} />
        );
        clickCard(container);
        expect(screen.queryByText('ダメージ')).not.toBeInTheDocument();
    });

    it('メニューが開いているときカード外をクリックするとメニューが閉じる', () => {
        const { container } = render(
            <Card card={mockCardWithoutImage} area="active" playerId="p1" onUpdateStatus={() => {}} />
        );
        clickCard(container);
        expect(screen.getByText('ダメージ')).toBeInTheDocument();

        // オーバーレイ（fixed inset-0）をクリックして閉じる
        const overlay = document.querySelector('.fixed.inset-0') as HTMLElement;
        fireEvent.click(overlay);
        expect(screen.queryByText('ダメージ')).not.toBeInTheDocument();
    });
});

// ── ダメージ・状態異常の表示 ─────────────────────────────────────
describe('Card ダメージ・状態異常の表示', () => {
    it('active エリアでダメージ > 0 のときカウンターが表示される', () => {
        render(
            <Card card={{ ...mockCardWithoutImage, d: 60 }} area="active" playerId="p1" onUpdateStatus={() => {}} />
        );
        expect(screen.getByText('60')).toBeInTheDocument();
    });

    it('active エリアでダメージ = 0 のときカウンターが非表示', () => {
        render(
            <Card card={{ ...mockCardWithoutImage, d: 0 }} area="active" playerId="p1" onUpdateStatus={() => {}} />
        );
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('deck エリアではダメージカウンターが非表示', () => {
        render(
            <Card card={{ ...mockCardWithoutImage, d: 60 }} area="deck" playerId="p1" onUpdateStatus={() => {}} />
        );
        expect(screen.queryByText('60')).not.toBeInTheDocument();
    });

    it('trash エリアではダメージカウンターが非表示', () => {
        render(
            <Card card={{ ...mockCardWithoutImage, d: 60 }} area="trash" playerId="p1" onUpdateStatus={() => {}} />
        );
        expect(screen.queryByText('60')).not.toBeInTheDocument();
    });

    it('active エリアで状態異常アイコンが表示される', () => {
        render(
            <Card
                card={{ ...mockCardWithoutImage, cnd: ['poison'] }}
                area="active"
                playerId="p1"
                onUpdateStatus={() => {}}
            />
        );
        // poison アイコン（SVG）が存在することを確認
        expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('deck エリアでは状態異常アイコンが表示されない', () => {
        render(
            <Card
                card={{ ...mockCardWithoutImage, cnd: ['poison'], f: false }}
                area="deck"
                playerId="p1"
                onUpdateStatus={() => {}}
            />
        );
        // デッキカードは裏向き表示なのでステータスセクション自体が存在しない
        expect(screen.queryByText('Card')).not.toBeInTheDocument();
    });

    it('attachedCount > 0 のときバッジが表示される', () => {
        render(
            <Card
                card={mockCardWithoutImage}
                area="active"
                playerId="p1"
                onUpdateStatus={() => {}}
                attachedCount={3}
            />
        );
        expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('attachedCount = 0 のときバッジが非表示', () => {
        render(
            <Card
                card={mockCardWithoutImage}
                area="active"
                playerId="p1"
                onUpdateStatus={() => {}}
                attachedCount={0}
            />
        );
        expect(screen.queryByText('+0')).not.toBeInTheDocument();
    });
});

// ── ダメージ更新コールバック ─────────────────────────────────────
describe('Card ダメージ・状態異常の更新', () => {
    it('メニューから+10クリックでonUpdateStatusが呼ばれる', () => {
        const onUpdateStatus = vi.fn();
        const { container } = render(
            <Card card={{ ...mockCardWithoutImage, d: 0 }} area="active" playerId="p1" onUpdateStatus={onUpdateStatus} />
        );
        const cardEl = container.querySelector('.cursor-grab') as HTMLElement;
        fireEvent.click(cardEl);

        // +10ボタン（ダメージセクション内の最初のボタン）をクリック
        const damageLabel = screen.getByText('ダメージ');
        const section = damageLabel.closest('div')!.parentElement!;
        const buttons = section.querySelectorAll('button');
        fireEvent.click(buttons[0]);

        expect(onUpdateStatus).toHaveBeenCalledTimes(1);
        // updater関数を実際に呼んで結果を検証
        const updater = onUpdateStatus.mock.calls[0][1];
        const result = updater({ ...mockCardWithoutImage, d: 0 });
        expect(result.d).toBe(10);
    });

    it('ダメージが0未満にならない（-10で d=0 のとき d=0 のまま）', () => {
        const onUpdateStatus = vi.fn();
        const { container } = render(
            <Card card={{ ...mockCardWithoutImage, d: 0 }} area="active" playerId="p1" onUpdateStatus={onUpdateStatus} />
        );
        const cardEl = container.querySelector('.cursor-grab') as HTMLElement;
        fireEvent.click(cardEl);

        const damageLabel = screen.getByText('ダメージ');
        const section = damageLabel.closest('div')!.parentElement!;
        const buttons = section.querySelectorAll('button');
        fireEvent.click(buttons[1]); // -10

        const updater = onUpdateStatus.mock.calls[0][1];
        const result = updater({ ...mockCardWithoutImage, d: 0 });
        expect(result.d).toBe(0); // Math.max(0, -10) = 0
    });
});
