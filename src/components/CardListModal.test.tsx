import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CardListModal } from './CardListModal';
import type { Card } from '../types/game';

const createCard = (overrides: Partial<Card> = {}): Card => ({
    id: 'card-1',
    tId: 'template-1',
    f: true,
    d: 0,
    cnd: [],
    l: 'p1-deck',
    o: 0,
    name: 'ピカチュウ',
    imageUrl: 'https://example.com/pikachu.png',
    ...overrides,
});

describe('CardListModal', () => {
    const defaultProps = {
        title: '山札の確認',
        cards: [createCard()],
        onClose: vi.fn(),
        actions: [],
    };

    it('タイトルとカード枚数を表示する', () => {
        render(<CardListModal {...defaultProps} cards={[createCard(), createCard({ id: 'card-2', name: 'リザードン' })]} />);
        expect(screen.getByText('山札の確認 (2枚)')).toBeDefined();
    });

    it('閉じるボタンでonCloseが呼ばれる', () => {
        const onClose = vi.fn();
        render(<CardListModal {...defaultProps} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: /閉じる/i }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('カードが0枚の時にメッセージを表示する', () => {
        render(<CardListModal {...defaultProps} cards={[]} />);
        expect(screen.getByText('カードがありません')).toBeDefined();
    });

    it('アクションボタンを各カードに表示する', () => {
        const onAction = vi.fn();
        render(
            <CardListModal
                {...defaultProps}
                actions={[
                    { label: '手札に加える', onClick: onAction },
                ]}
            />
        );
        const buttons = screen.getAllByRole('button', { name: '手札に加える' });
        expect(buttons).toHaveLength(1);

        fireEvent.click(buttons[0]);
        expect(onAction).toHaveBeenCalledWith('card-1');
    });

    it('複数のアクションボタンを表示できる', () => {
        render(
            <CardListModal
                {...defaultProps}
                actions={[
                    { label: '手札に加える', onClick: vi.fn() },
                    { label: '山札の上へ', onClick: vi.fn() },
                    { label: '山札の下へ', onClick: vi.fn() },
                ]}
            />
        );
        expect(screen.getAllByRole('button', { name: '手札に加える' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: '山札の上へ' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: '山札の下へ' })).toHaveLength(1);
    });

    it('背景オーバーレイクリックでonCloseが呼ばれる', () => {
        const onClose = vi.fn();
        render(<CardListModal {...defaultProps} onClose={onClose} />);
        // data-testid="modal-overlay" をクリック
        fireEvent.click(screen.getByTestId('modal-overlay'));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('フッターメッセージを表示できる', () => {
        render(<CardListModal {...defaultProps} footerMessage="山札の上が右端です" />);
        expect(screen.getByText('山札の上が右端です')).toBeDefined();
    });
});
