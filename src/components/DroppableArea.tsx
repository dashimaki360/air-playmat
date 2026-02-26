
import { useDroppable } from '@dnd-kit/core';
import type { AreaId } from '../types/game';

interface DroppableAreaProps {
    id: AreaId;
    title: string;
    children: React.ReactNode;
    className?: string;
    playerId: string;
}

export function DroppableArea({ id, title, children, className = '', playerId }: DroppableAreaProps) {
    // We use combination of playerId and areaId to ensure uniqueness across playmat
    const droppableId = `${playerId}-${id}`;

    const { isOver, setNodeRef } = useDroppable({
        id: droppableId,
        data: {
            type: 'area',
            areaId: id,
            playerId,
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={`border-2 rounded-xl p-2 md:p-4 flex flex-col gap-2 relative transition-colors
        ${isOver ? 'border-green-400 bg-green-400/10' : 'border-slate-700 bg-slate-800/50'}
        ${className}`}
        >
            <div className="absolute top-0 right-0 p-1 md:p-2 opacity-30 text-xs md:text-sm font-bold uppercase tracking-wider pointer-events-none select-none">
                {title}
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4 flex-1 items-start content-start relative z-10">
                {children}
            </div>
        </div>
    );
}
