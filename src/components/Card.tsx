import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Card as CardType, AreaId, DraggableItemData } from '../types/game';
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
}

export function Card({ card, area, playerId, index, onUpdateStatus }: CardProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const draggableData: DraggableItemData = {
        type: 'card',
        card,
        sourceArea: area,
        playerId,
        index,
    };

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
        data: draggableData,
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

    const handleToggleStatus = (statusId: string) => {
        onUpdateStatus(card.id, (c) => {
            const current = c.cnd;
            const newStatus = current.includes(statusId as any)
                ? current.filter((s) => s !== statusId)
                : [...current, statusId as any];
            return { ...c, cnd: newStatus };
        });
    };

    return (
        <div className="relative inline-block touch-none" style={style}>
            <div
                ref={setNodeRef}
                {...listeners}
                {...attributes}
                className={`w-20 h-28 sm:w-24 sm:h-32 md:w-32 md:h-44 rounded-lg shadow-md border-2 overflow-hidden bg-slate-200 cursor-grab active:cursor-grabbing flex flex-col justify-between
          ${isDragging ? 'opacity-50 ring-4 ring-blue-500 border-blue-500' : 'border-slate-800'}
          ${!card.f ? 'bg-gradient-to-br from-blue-700 to-indigo-900 border-blue-400' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                }}
            >
                {card.f ? (
                    <div className="p-1 h-full flex flex-col justify-between text-slate-900 bg-white">
                        <div className="font-bold text-xs truncate">{card.name || 'Card'}</div>
                        {/* Status Icons */}
                        <div className="flex flex-wrap gap-0.5 mt-1">
                            {card.cnd.map((status) => {
                                const Icon = STATUS_ICONS[status];
                                return Icon ? (
                                    <div key={status} className="bg-red-500 text-white rounded-full p-0.5">
                                        <Icon size={12} />
                                    </div>
                                ) : null;
                            })}
                        </div>
                        {/* Damage Counters */}
                        {card.d > 0 && (
                            <div className="bg-red-600 text-white font-bold text-base rounded-full min-w-6 px-1.5 py-0.5 text-center mt-auto self-end shadow-sm border border-red-800">
                                {card.d}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full w-full">
                        <div className="w-12 h-12 rounded-full border-4 border-white/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-4 border-white/40"></div>
                        </div>
                    </div>
                )}
            </div>

            {menuOpen && (
                <CardMenu
                    area={area}
                    onAddDamage={handleAddDamage}
                    onToggleStatus={handleToggleStatus}
                    currentStatus={card.cnd}
                />
            )}
            {menuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                    }}
                />
            )}
        </div>
    );
}
