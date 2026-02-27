import { useDroppable } from '@dnd-kit/core';
import type { Card as CardType, AreaId } from '../types/game';
import { Card } from './Card';

interface CardStackProps {
    /** ベースポケモン（ルートカード、att が undefined のカード） */
    baseCard: CardType;
    /** このポケモンに付属している全カード */
    attachedCards: CardType[];
    area: AreaId;
    playerId: string;
    index?: number;
    onUpdateStatus: (id: string, updater: (c: CardType) => CardType) => void;
    onDetachCard?: (cardId: string, targetLoc: string) => void;
    onTrashWithAttachments?: (cardId: string) => void;
}

/**
 * ポケモンカード + 付属カード（エネルギー・道具・進化）をスタック表示するコンポーネント
 * 
 * - ポケモン本体が最前面に表示
 * - エネルギー・道具は上方向にずらして背面に表示（カード上端が見える）
 * - 進化元カードは非表示（メニューから確認可能）
 */
export function CardStack({ baseCard, attachedCards, area, playerId, index, onUpdateStatus, onDetachCard, onTrashWithAttachments }: CardStackProps) {
    // このスタック全体がドロップ先になる（カードの上にカードを重ねる）
    const droppableId = `card-drop-${baseCard.id}`;
    const { isOver, setNodeRef: setDropRef } = useDroppable({
        id: droppableId,
        data: {
            type: 'card',
            cardId: baseCard.id,
            playerId,
        },
    });

    // 進化チェーンの最上位カード（表示するメインカード）を見つける
    const topEvolution = findTopEvolution(baseCard, attachedCards);

    // エネルギー・道具（進化チェーンに属さないカード）をフィルタ
    const evolutionIds = getEvolutionChainIds(baseCard, attachedCards);
    const nonEvolutionCards = attachedCards.filter(c => !evolutionIds.has(c.id));

    // ずらし幅の計算（カードが多い場合は縮小）
    const maxOffset = 20; // 最大ずらし幅 (px)
    const minOffset = 8;  // 最小ずらし幅 (px)
    const offsetPerCard = nonEvolutionCards.length <= 3
        ? maxOffset
        : Math.max(minOffset, Math.floor(60 / nonEvolutionCards.length));

    return (
        <div
            ref={setDropRef}
            className={`relative inline-block transition-all ${isOver ? 'ring-2 ring-green-400 rounded-lg' : ''}`}
            style={{
                // エネルギー・道具分の上方向パディング
                paddingTop: nonEvolutionCards.length > 0 ? `${nonEvolutionCards.length * offsetPerCard}px` : '0',
            }}
        >
            {/* エネルギー・道具（上方向にずらして表示） */}
            {nonEvolutionCards.map((card, i) => (
                <div
                    key={card.id}
                    className="absolute left-0 pointer-events-none z-0"
                    style={{
                        top: `${i * offsetPerCard}px`,
                    }}
                >
                    <div className="opacity-80 scale-[0.97]">
                        <Card
                            card={card}
                            area={area}
                            playerId={playerId}
                            onUpdateStatus={() => {}} // 付属カードは直接操作不可
                            isAttached={true}
                        />
                    </div>
                </div>
            ))}

            {/* メインポケモンカード（最前面） */}
            <div className="relative z-10">
                <Card
                    card={topEvolution}
                    area={area}
                    playerId={playerId}
                    index={index}
                    onUpdateStatus={onUpdateStatus}
                    attachedCount={attachedCards.length}
                    attachedCards={attachedCards}
                    onDetachCard={onDetachCard}
                    onTrashWithAttachments={onTrashWithAttachments ? () => onTrashWithAttachments(baseCard.id) : undefined}
                />
            </div>

            {/* ドロップ時の緑オーバーレイ */}
            {isOver && (
                <div className="absolute inset-0 bg-green-400/20 rounded-lg border-2 border-green-400 pointer-events-none z-20" />
            )}
        </div>
    );
}

/**
 * 進化チェーンの最上位カードを見つける
 * baseCard → 進化1 → 進化2 のチェーンで、最上位を返す
 */
function findTopEvolution(baseCard: CardType, attachedCards: CardType[]): CardType {
    let current = baseCard;
    let found = true;
    while (found) {
        found = false;
        for (const c of attachedCards) {
            if (c.att === current.id) {
                // このカードの上にさらに重なっているカードがあるなら、それは進化カード
                const hasChild = attachedCards.some(child => child.att === c.id);
                if (hasChild || !attachedCards.some(other => other.att === c.id && other.id !== c.id)) {
                    // c.att が current のカードで、かつそれが進化チェーンの一部かチェック
                    // 簡単な判定: att が直前のカードID で、かつ他のカードの att にもなっている = 進化チェーン
                    current = c;
                    found = true;
                    break;
                }
            }
        }
    }
    return current;
}

/**
 * 進化チェーンに属するカードIDのセットを返す（baseCard自体は含まない）
 */
function getEvolutionChainIds(baseCard: CardType, attachedCards: CardType[]): Set<string> {
    const ids = new Set<string>();
    let current = baseCard;
    let found = true;
    while (found) {
        found = false;
        for (const c of attachedCards) {
            if (c.att === current.id && !ids.has(c.id)) {
                // c がさらに誰かの att 先になっている → 進化チェーンの中間
                const isMiddle = attachedCards.some(other => other.att === c.id);
                if (isMiddle) {
                    ids.add(c.id);
                    current = c;
                    found = true;
                    break;
                }
                // c がチェーンの最上位（誰の att 先にもなっていない）→ これが最上位進化
                if (!isMiddle) {
                    ids.add(c.id);
                    found = false;
                    break;
                }
            }
        }
    }
    return ids;
}
