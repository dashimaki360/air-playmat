import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import type { Card as CardType, AreaId, DraggableItemData, CardStatusCondition, CardInfo } from '../types/game';
import { CARD_IMAGE_BASE_URL } from '../constants';
import { CardMenu } from './CardMenu';
import { Skull, Flame, Moon, Zap, HelpCircle } from 'lucide-react';

const STATUS_ICONS = {
    poison: Skull,
    burn: Flame,
    asleep: Moon,
    paralyzed: Zap,
    confused: HelpCircle,
};

interface CardProps {
    card: CardType;
    area: AreaId;
    playerId: string;
    index?: number;
    onUpdateStatus: (id: string, updater: (c: CardType) => CardType) => void;
    /** cId → CardInfo のルックアップ Map */
    cardLookup?: Map<string, CardInfo>;
    /** true の場合、このカードは別のカードに付属して表示されている（ドラッグ・メニュー無効） */
    isAttached?: boolean;
    /** このカードに付属しているカードの数（バッジ表示用） */
    attachedCount?: number;
    /** このポケモンに付属しているカード一覧（CardMenu用） */
    attachedCards?: CardType[];
    /** カードをはがすコールバック */
    onDetachCard?: (cardId: string, targetLoc: string) => void;
    /** きぜつコールバック */
    onTrashWithAttachments?: () => void;
    /** CardStackのベースカードID。スタック全体ドラッグ時に使う */
    stackBaseCardId?: string;
}

export function Card({ card, area, playerId, index, onUpdateStatus, cardLookup, isAttached = false, attachedCount = 0, attachedCards, onDetachCard, onTrashWithAttachments, stackBaseCardId }: CardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const cardInfo = cardLookup?.get(card.cId);
    const imageUrl = cardInfo?.imageUrl ? CARD_IMAGE_BASE_URL + cardInfo.imageUrl : undefined;
    const cardName = cardInfo?.name;

    const draggableData: DraggableItemData = {
        type: 'card',
        card,
        sourceArea: area,
        playerId,
        index,
        stackBaseCardId,
    };

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        data: draggableData,
        disabled: isAttached, // 付属カードはドラッグ不可
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            zIndex: isDragging ? 50 : 1,
        }
        : undefined;

    const handleAddDamage = (amount: number) => {
        onUpdateStatus(card.id, (c) => ({
            ...c,
            d: Math.max(0, c.d + amount),
        }));
    };

    const handleToggleStatus = (statusId: CardStatusCondition) => {
        onUpdateStatus(card.id, (c) => {
            const current = c.cnd;
            const newStatus = current.includes(statusId)
                ? current.filter((s) => s !== statusId)
                : [...current, statusId];
            return { ...c, cnd: newStatus };
        });
    };

    return (
        <div className="relative inline-block touch-none" style={style}>
            <div
                ref={(el) => {
                    setNodeRef(el);
                    (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }}
                {...listeners}
                {...attributes}
                className={`w-20 h-28 sm:w-24 sm:h-32 md:w-32 md:h-44 rounded-lg shadow-md border-2 overflow-hidden bg-slate-200 cursor-grab active:cursor-grabbing flex flex-col justify-between relative
          ${isDragging ? 'opacity-50 ring-4 ring-blue-500 border-blue-500' : 'border-slate-800'}
          ${!card.f ? 'bg-gradient-to-br from-blue-700 to-indigo-900 border-blue-400' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isAttached) {
                        if (!menuOpen && cardRef.current) {
                            const rect = cardRef.current.getBoundingClientRect();
                            setMenuPos({ top: rect.top, left: rect.right + 8 });
                        }
                        setMenuOpen(!menuOpen);
                    }
                }}
            >
                {card.f ? (
                    <>
                        {/* Background Image */}
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={cardName || 'Card Image'}
                                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                                draggable={false}
                            />
                        ) : null}

                        {/* Card Content Overlay */}
                        <div className={`relative z-10 p-1 h-full flex flex-col justify-between ${imageUrl ? '' : 'bg-white text-slate-900'}`}>
                            {!imageUrl && <div className="font-bold text-xs truncate drop-shadow-md">{cardName || 'Card'}</div>}
                            {/* Status Icons */}
                            {area !== 'deck' && area !== 'trash' && (
                                <div className="flex flex-wrap gap-0.5 mt-1">
                                    {card.cnd.map((status) => {
                                        const Icon = STATUS_ICONS[status];
                                        return Icon ? (
                                            <div key={status} className="bg-red-500 text-white rounded-full p-0.5 shadow-sm">
                                                <Icon size={12} />
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            )}
                            {/* Damage Counters */}
                            {area !== 'deck' && area !== 'trash' && card.d > 0 && (
                                <div className="bg-red-600 text-white font-bold text-base rounded-full min-w-6 px-1.5 py-0.5 text-center mt-auto self-end shadow-md border border-red-800">
                                    {card.d}
                                </div>
                            )}
                            {/* Attached cards count badge */}
                            {attachedCount > 0 && (
                                <div className="absolute bottom-1 left-1 bg-blue-500 text-white font-bold text-[10px] rounded-full min-w-5 px-1 py-0.5 text-center shadow-md border border-blue-700 z-20">
                                    +{attachedCount}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full w-full">
                        <div className="w-12 h-12 rounded-full border-4 border-white/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-white/40"></div>
                        </div>
                    </div>
                )}
            </div>

            {menuOpen && (area === 'active' || area === 'bench') && createPortal(
                <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}>
                    <CardMenu
                        area={area}
                        playerId={playerId}
                        onAddDamage={handleAddDamage}
                        onToggleStatus={handleToggleStatus}
                        currentStatus={card.cnd}
                        attachedCards={attachedCards}
                        cardLookup={cardLookup}
                        onDetachCard={onDetachCard}
                        onTrashWithAttachments={onTrashWithAttachments}
                    />
                </div>,
                document.body
            )}
            {menuOpen && createPortal(
                <div
                    className="fixed inset-0 bg-transparent"
                    style={{ zIndex: 9998 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                    }}
                />,
                document.body
            )}
        </div>
    );
}
