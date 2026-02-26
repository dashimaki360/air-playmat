export type CardStatusCondition = 'poison' | 'burn' | 'asleep' | 'paralyzed' | 'confused';

export type AreaId = 
  | 'deck' 
  | 'hand' 
  | 'trash' 
  | 'active' 
  | 'bench' 
  | 'prize' 
  | 'stadium';

// Firebase通信量削減のため物理キー名を短縮したカード構造
export type Card = {
  id: string; // Unique ID (UUID)
  tId: string; // templateId (Master ID for image/name)
  face: boolean; // isFaceUp
  dmg: number; // damageCounters
  cnd: CardStatusCondition[]; // statusConditions
  loc: string; // location (e.g. "p1-hand", "p2-active", "stadium")
  ord: number; // order / zIndex for stacked areas
  
  // Optional for mock UI display
  name?: string;
  imageUrl?: string;
};

export type PlayerState = {
  name: string; // プレイヤーの表示名
};

export type GameState = {
  roomId: string;
  players: Record<string, PlayerState>;
  // すべてのカードをフラットに辞書(Record)形式で持つ（差分更新用）
  cards: Record<string, Card>; 
};

// For dnd-kit drop payloads to identify where a Card comes from and goes to
export type DraggableItemData = {
  type: 'card';
  card: Card;
  sourceArea: AreaId;
  playerId: string;
  index?: number; 
};
