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
 * 進化チェーン [baseCard, evo1, evo2, ...] を返す共通ヘルパー。
 *
 * 複数のカードが同じポケモンに att されている場合（進化カードとエネルギーが混在）、
 * 自身も他カードの att 先になっているカード（チェーン中間）を優先的に進化として扱う。
 * それでも判定できない場合は最初に見つかったカードを選ぶ。
 */
function buildEvolutionChain(baseCard: CardType, attachedCards: CardType[]): CardType[] {
    // cardId → そのカードに att されているカード一覧
    const childrenOf = new Map<string, CardType[]>();
    for (const c of attachedCards) {
        if (c.att) {
            if (!childrenOf.has(c.att)) childrenOf.set(c.att, []);
            childrenOf.get(c.att)!.push(c);
        }
    }

    const chain: CardType[] = [baseCard];
    let current = baseCard;
    while (true) {
        const children = childrenOf.get(current.id) ?? [];
        if (children.length === 0) break;
        // 自身が親になっているカード（中間進化）を優先。なければ先頭を選ぶ
        const next = children.find(c => childrenOf.has(c.id)) ?? children[0];
        chain.push(next);
        current = next;
    }
    return chain;
}

/** 進化チェーンの最上位カードを返す */
function findTopEvolution(baseCard: CardType, attachedCards: CardType[]): CardType {
    const chain = buildEvolutionChain(baseCard, attachedCards);
    return chain[chain.length - 1];
}

/** 進化チェーンに属するカードIDのセットを返す（baseCard自体は含まない） */
function getEvolutionChainIds(baseCard: CardType, attachedCards: CardType[]): Set<string> {
    const chain = buildEvolutionChain(baseCard, attachedCards);
    return new Set(chain.slice(1).map(c => c.id));
}
