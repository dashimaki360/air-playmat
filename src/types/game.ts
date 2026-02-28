export type CardStatusCondition = 'poison' | 'burn' | 'asleep' | 'paralyzed' | 'confused';

export type CardType = 'pokemon' | 'item' | 'pokemon-tool' | 'supporter' | 'stadium' | 'energy' | 'technical-machine';

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
  f: boolean; // isFaceUp (旧 face)
  d: number; // damageCounters (旧 dmg)
  cnd: CardStatusCondition[]; // statusConditions
  l: string; // location (e.g. "p1-hand", "p2-active", "stadium") (旧 loc)
  o: number; // order / zIndex for stacked areas (旧 ord)
  att?: string; // attachedTo: 親カードのID（進化元・エネルギー/道具の付け先）
  tp?: CardType; // カードの種類（Firebase通信量削減のため短縮）

  // Optional for mock UI display
  name?: string;
  imageUrl?: string;
};

export type PlayerState = {
  n: string; // プレイヤー名 (旧 name)
  d: string[]; // deck (カードIDの配列)
  c: Record<string, Card>; // cards (フィールドや手札にあるカード)
};

export type GameState = {
  roomId: string;
  m: { // meta
    t: string; // turn: 現在のターンプレイヤー (e.g. "p1")
    s: string; // status: 試合状況
    a: string; // lastAction: 直近のアクションログ
  };
  p1: PlayerState;
  p2: PlayerState;
};

// デッキインポート用の型
export type { CardInfo } from '../lib/pokemon-tcg/deck-scraper';

export type DeckData = {
  code: string;
  cards: import('../lib/pokemon-tcg/deck-scraper').CardInfo[];
};

// For dnd-kit drop payloads to identify where a Card comes from and goes to
export type DraggableItemData = {
  type: 'card';
  card: Card;
  sourceArea: AreaId;
  playerId: string;
  index?: number;
  /** CardStackのベースカードID。スタック全体を移動するときに使う */
  stackBaseCardId?: string;
};
