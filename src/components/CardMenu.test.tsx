import { render, screen, fireEvent } from '@testing-library/react';
import { within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CardMenu } from './CardMenu';
import type { CardStatusCondition, Card as CardType } from '../types/game';

describe('CardMenu', () => {
    const onAddDamage = vi.fn();
    const onToggleStatus = vi.fn();
    const onDetachCard = vi.fn();
    const onTrashWithAttachments = vi.fn();

    beforeEach(() => vi.clearAllMocks());

    const renderMenu = (props?: Partial<React.ComponentProps<typeof CardMenu>>) =>
        render(
            <CardMenu
                area="active"
                playerId="player-1"
                onAddDamage={onAddDamage}
                onToggleStatus={onToggleStatus}
                currentStatus={[]}
                {...props}
            />
        );

    // ── ダメージ操作 ─────────────────────────────────────────────
    describe('ダメージ操作', () => {
        const getDamageButtons = () => {
            const label = screen.getByText('ダメージ');
            const section = label.closest('div')!.parentElement!;
            return within(section as HTMLElement).getAllByRole('button');
        };

        it('+10ボタンで onAddDamage(10) が呼ばれる', () => {
            renderMenu();
            fireEvent.click(getDamageButtons()[0]);
            expect(onAddDamage).toHaveBeenCalledWith(10);
        });

        it('-10ボタンで onAddDamage(-10) が呼ばれる', () => {
            renderMenu();
            fireEvent.click(getDamageButtons()[1]);
            expect(onAddDamage).toHaveBeenCalledWith(-10);
        });

        it('+50ボタンで onAddDamage(50) が呼ばれる', () => {
            renderMenu();
            fireEvent.click(getDamageButtons()[2]);
            expect(onAddDamage).toHaveBeenCalledWith(50);
        });

        it('-50ボタンで onAddDamage(-50) が呼ばれる', () => {
            renderMenu();
            fireEvent.click(getDamageButtons()[3]);
            expect(onAddDamage).toHaveBeenCalledWith(-50);
        });

        it('全エリア（hand）でもダメージセクションが表示される', () => {
            renderMenu({ area: 'hand' });
            expect(screen.getByText('ダメージ')).toBeInTheDocument();
        });
    });

    // ── 状態異常操作 ─────────────────────────────────────────────
    describe('状態異常操作', () => {
        it('active エリアでは状態異常セクションが表示される', () => {
            renderMenu({ area: 'active' });
            expect(screen.getByText('状態異常')).toBeInTheDocument();
        });

        it('bench エリアでは状態異常セクションが非表示になる', () => {
            renderMenu({ area: 'bench' });
            expect(screen.queryByText('状態異常')).not.toBeInTheDocument();
        });

        it('どくボタンをクリックすると onToggleStatus("poison") が呼ばれる', () => {
            renderMenu();
            fireEvent.click(screen.getByTitle('どく'));
            expect(onToggleStatus).toHaveBeenCalledWith('poison');
        });

        it('やけどボタンをクリックすると onToggleStatus("burn") が呼ばれる', () => {
            renderMenu();
            fireEvent.click(screen.getByTitle('やけど'));
            expect(onToggleStatus).toHaveBeenCalledWith('burn');
        });

        it('ねむりボタンをクリックすると onToggleStatus("asleep") が呼ばれる', () => {
            renderMenu();
            fireEvent.click(screen.getByTitle('ねむり'));
            expect(onToggleStatus).toHaveBeenCalledWith('asleep');
        });

        it('マヒボタンをクリックすると onToggleStatus("paralyzed") が呼ばれる', () => {
            renderMenu();
            fireEvent.click(screen.getByTitle('マヒ'));
            expect(onToggleStatus).toHaveBeenCalledWith('paralyzed');
        });

        it('こんらんボタンをクリックすると onToggleStatus("confused") が呼ばれる', () => {
            renderMenu();
            fireEvent.click(screen.getByTitle('こんらん'));
            expect(onToggleStatus).toHaveBeenCalledWith('confused');
        });

        it('currentStatus に含まれる状態異常ボタンはハイライトされる', () => {
            renderMenu({ currentStatus: ['poison'] as CardStatusCondition[] });
            expect(screen.getByTitle('どく')).toHaveClass('bg-red-500');
        });

        it('currentStatus に含まれない状態異常ボタンはノーマルスタイル', () => {
            renderMenu({ currentStatus: [] });
            expect(screen.getByTitle('どく')).toHaveClass('bg-slate-700');
        });
    });

    // ── スタック操作（active/bench のみ） ────────────────────────
    describe('スタック操作', () => {
        it('active エリアでは「カード操作」セクションが表示される', () => {
            renderMenu({ area: 'active', onTrashWithAttachments });
            expect(screen.getByText('カード操作')).toBeInTheDocument();
        });

        it('bench エリアでは「カード操作」セクションが表示される', () => {
            renderMenu({ area: 'bench', onTrashWithAttachments });
            expect(screen.getByText('カード操作')).toBeInTheDocument();
        });

        it('hand エリアでは「カード操作」セクションが表示されない', () => {
            renderMenu({ area: 'hand', onTrashWithAttachments });
            expect(screen.queryByText('カード操作')).not.toBeInTheDocument();
        });

        it('prize エリアでは「カード操作」セクションが表示されない', () => {
            renderMenu({ area: 'prize', onTrashWithAttachments });
            expect(screen.queryByText('カード操作')).not.toBeInTheDocument();
        });

        it('onTrashWithAttachments が渡されるときぜつボタンが表示される', () => {
            renderMenu({ area: 'active', onTrashWithAttachments });
            expect(screen.getByText('きぜつ')).toBeInTheDocument();
        });

        it('onTrashWithAttachments が未指定のとききぜつボタンが非表示', () => {
            renderMenu({ area: 'active' });
            expect(screen.queryByText('きぜつ')).not.toBeInTheDocument();
        });

        it('きぜつボタンをクリックすると onTrashWithAttachments が呼ばれる', () => {
            renderMenu({ area: 'active', onTrashWithAttachments });
            fireEvent.click(screen.getByText('きぜつ'));
            expect(onTrashWithAttachments).toHaveBeenCalledTimes(1);
        });
    });

    // ── つけたカード操作 ─────────────────────────────────────────
    describe('つけたカード操作', () => {
        const attachedCards: CardType[] = [
            { id: 'energy-1', tId: 'e1', f: true, d: 0, cnd: [], l: 'p1-active', o: 0, name: 'Fire Energy' },
        ];

        it('付属カードがあるとき「つけたカード」ボタンが表示される', () => {
            renderMenu({ area: 'active', attachedCards });
            expect(screen.getByText(/つけたカード/)).toBeInTheDocument();
        });

        it('付属カードがないとき「つけたカード」ボタンが非表示', () => {
            renderMenu({ area: 'active', attachedCards: [] });
            expect(screen.queryByText(/つけたカード/)).not.toBeInTheDocument();
        });

        it('「つけたカード」ボタンをクリックすると一覧が展開される', () => {
            renderMenu({ area: 'active', attachedCards, onDetachCard });
            fireEvent.click(screen.getByText(/つけたカード/));
            expect(screen.getByText('Fire Energy')).toBeInTheDocument();
        });

        it('はがすボタンをクリックすると onDetachCard が正しい引数で呼ばれる', () => {
            renderMenu({ area: 'active', attachedCards, onDetachCard });
            fireEvent.click(screen.getByText(/つけたカード/));
            fireEvent.click(screen.getByTitle('手札に戻す'));
            expect(onDetachCard).toHaveBeenCalledWith('energy-1', 'p1-hand');
        });

        it('player-2 のカードははがすと p2-hand に戻る', () => {
            renderMenu({ area: 'active', playerId: 'player-2', attachedCards, onDetachCard });
            fireEvent.click(screen.getByText(/つけたカード/));
            fireEvent.click(screen.getByTitle('手札に戻す'));
            expect(onDetachCard).toHaveBeenCalledWith('energy-1', 'p2-hand');
        });

        it('再度クリックすると一覧が折りたたまれる', () => {
            renderMenu({ area: 'active', attachedCards, onDetachCard });
            const toggleBtn = screen.getByText(/つけたカード/);
            fireEvent.click(toggleBtn);
            expect(screen.getByText('Fire Energy')).toBeInTheDocument();
            fireEvent.click(toggleBtn);
            expect(screen.queryByText('Fire Energy')).not.toBeInTheDocument();
        });
    });
});
