import React from 'react';
import { RefreshCcw, Plus, Minus, Skull, Flame, Moon, Zap, HelpCircle } from 'lucide-react';
import type { CardStatusCondition, AreaId } from '../types/game';

interface CardMenuProps {
    area: AreaId;
    onAddDamage: (amount: number) => void;
    onToggleStatus: (status: CardStatusCondition) => void;
    currentStatus: CardStatusCondition[];
}

export function CardMenu({
    area,
    onAddDamage,
    onToggleStatus,
    currentStatus,
}: CardMenuProps) {
    // Prevent clicks from triggering drag
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div
            className="absolute top-0 left-full ml-2 w-48 bg-slate-800 border border-slate-600 rounded shadow-lg p-2 z-50 text-sm text-white flex flex-col gap-2"
            onClick={stopProp}
            onPointerDown={stopProp}
        >
            <div className="border-t border-slate-600 mb-1 pb-1 pt-1 first:border-t-0 first:pt-0">
                <div className="text-xs text-slate-400 mb-1">ダメージ</div>
                <div className="flex gap-1 mb-1">
                    <button onClick={() => onAddDamage(10)} className="flex-1 p-1 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-1">
                        <Plus size={14} /> 10
                    </button>
                    <button onClick={() => onAddDamage(-10)} className="flex-1 p-1 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-1">
                        <Minus size={14} /> 10
                    </button>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => onAddDamage(50)} className="flex-1 p-1 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-1">
                        <Plus size={14} /> 50
                    </button>
                    <button onClick={() => onAddDamage(-50)} className="flex-1 p-1 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-1">
                        <Minus size={14} /> 50
                    </button>
                </div>
            </div>

            {area !== 'bench' && (
                <div className="border-t border-slate-600 my-1 pt-1">
                    <div className="text-xs text-slate-400 mb-1">状態異常</div>
                    <div className="flex flex-wrap gap-1">
                        {[
                            { id: 'poison', icon: Skull, label: 'どく' },
                            { id: 'burn', icon: Flame, label: 'やけど' },
                            { id: 'asleep', icon: Moon, label: 'ねむり' },
                            { id: 'paralyzed', icon: Zap, label: 'マヒ' },
                            { id: 'confused', icon: HelpCircle, label: 'こんらん' },
                        ].map(({ id, icon: Icon, label }) => {
                            const isActive = currentStatus.includes(id as CardStatusCondition);
                            return (
                                <button
                                    key={id}
                                    onClick={() => onToggleStatus(id as CardStatusCondition)}
                                    title={label}
                                    className={`p-1.5 rounded ${isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                        }`}
                                >
                                    <Icon size={14} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
