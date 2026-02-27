import React, { useState } from 'react';
import { Plus, Minus, Skull, Flame, Moon, Zap, HelpCircle, Layers, Trash2 } from 'lucide-react';
import type { CardStatusCondition, AreaId, Card as CardType } from '../types/game';

interface CardMenuProps {
    area: AreaId;
    playerId: string;
    onAddDamage: (amount: number) => void;
    onToggleStatus: (status: CardStatusCondition) => void;
    currentStatus: CardStatusCondition[];
    /** このポケモンに付属しているカード一覧 */
    attachedCards?: CardType[];
    /** カードをはがす（カードID, 移動先） */
    onDetachCard?: (cardId: string, targetLoc: string) => void;
    /** きぜつ（ポケモンと付属カード全てをトラッシュ） */
    onTrashWithAttachments?: () => void;
}

export function CardMenu({
    area,
    playerId,
    onAddDamage,
    onToggleStatus,
    currentStatus,
    attachedCards = [],
    onDetachCard,
    onTrashWithAttachments,
}: CardMenuProps) {
    const pPrefix = playerId === 'player-1' ? 'p1' : 'p2';
    const [showAttached, setShowAttached] = useState(false);
    // Prevent clicks from triggering drag
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();

    return (
        <div
            className="w-52 bg-slate-800 border border-slate-600 rounded shadow-lg p-2 text-sm text-white flex flex-col gap-2 max-h-[400px] overflow-y-auto"
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

            {/* スタック操作 (active/bench のみ) */}
            {(area === 'active' || area === 'bench') && (
                <div className="border-t border-slate-600 my-1 pt-1">
                    <div className="text-xs text-slate-400 mb-1">カード操作</div>

                    {/* つけたカードを見る */}
                    {attachedCards.length > 0 && (
                        <button
                            onClick={() => setShowAttached(!showAttached)}
                            className="w-full p-1.5 bg-blue-700 hover:bg-blue-600 rounded flex items-center gap-2 mb-1"
                        >
                            <Layers size={14} />
                            つけたカード ({attachedCards.length})
                        </button>
                    )}

                    {/* つけたカード一覧 */}
                    {showAttached && attachedCards.length > 0 && (
                        <div className="bg-slate-900 rounded p-2 mb-1 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                            {attachedCards.map((c) => (
                                <div key={c.id} className="flex items-center justify-between gap-1 text-xs">
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        {c.imageUrl ? (
                                            <img src={c.imageUrl} alt="" className="w-6 h-8 rounded object-cover flex-shrink-0" />
                                        ) : null}
                                        <span className="truncate">{c.name || 'Card'}</span>
                                    </div>
                                    {onDetachCard && (
                                        <button
                                            onClick={() => onDetachCard(c.id, `${pPrefix}-hand`)}
                                            className="bg-orange-600 hover:bg-orange-500 text-white px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
                                            title="手札に戻す"
                                        >
                                            はがす
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* きぜつ（全トラッシュ） */}
                    {onTrashWithAttachments && (
                        <button
                            onClick={onTrashWithAttachments}
                            className="w-full p-1.5 bg-red-700 hover:bg-red-600 rounded flex items-center gap-2"
                        >
                            <Trash2 size={14} />
                            きぜつ
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
