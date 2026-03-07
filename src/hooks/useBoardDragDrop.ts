import { useState } from 'react';
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { AreaId, DraggableItemData, CardInfo } from '../types/game';
import type { GameLogAction } from './useGameLog';

type UseBoardDragDropArgs = {
    moveCard: (cardId: string, sourceLoc: string, targetLoc: string) => void;
    attachCard: (cardId: string, targetCardId: string) => void;
    addLog: (player: string | null, action: GameLogAction, message: string) => void;
    cardLookup: Map<string, CardInfo>;
};

export function useBoardDragDrop({ moveCard, attachCard, addLog, cardLookup }: UseBoardDragDropArgs) {
    const [activeCardData, setActiveCardData] = useState<DraggableItemData | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (active.data.current?.type === 'card') {
            setActiveCardData(active.data.current as DraggableItemData);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveCardData(null);
        const { active, over } = event;

        if (!over) return;

        // カードの上にカードをドロップ（重ねる）
        if (active.data.current?.type === 'card' && over.data.current?.type === 'card') {
            const activeData = active.data.current as DraggableItemData;
            const targetCardId = over.data.current.cardId as string;

            // 自分自身には重ねられない
            if (activeData.card.id !== targetCardId) {
                attachCard(activeData.card.id, targetCardId);
                const pPrefix = activeData.playerId === 'player-1' ? 'p1' : 'p2';
                addLog(pPrefix, 'attach', `${cardLookup.get(activeData.card.cId)?.name || 'カード'}をつけた`);
            }
            return;
        }

        if (active.data.current?.type === 'card' && over.data.current?.type === 'area') {
            const activeData = active.data.current as DraggableItemData;
            const targetAreaId = over.data.current.areaId as AreaId;

            // Move card
            if (activeData.sourceArea !== targetAreaId) {
                const pPrefix = activeData.playerId === 'player-1' ? 'p1' : 'p2';

                const sourceLoc = activeData.sourceArea === 'stadium'
                    ? 'stadium'
                    : `${pPrefix}-${activeData.sourceArea}`;
                const targetLoc = targetAreaId === 'stadium'
                    ? 'stadium'
                    : `${pPrefix}-${targetAreaId}`;

                // スタックの場合はベースカードを移動（スタック全体が連動して動く）
                const cardIdToMove = activeData.stackBaseCardId ?? activeData.card.id;
                moveCard(cardIdToMove, sourceLoc, targetLoc);
                addLog(pPrefix, 'move', `${cardLookup.get(activeData.card.cId)?.name || 'カード'}を${targetAreaId}に移動`);
            }
        }
    };

    return { sensors, activeCardData, handleDragStart, handleDragEnd };
}
