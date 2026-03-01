import type { CardInfo } from './game';

export type PlayerId = 'p1' | 'p2';

export type RoomStatus = 'waiting' | 'playing' | 'ended';

export type RoomMeta = {
    createdAt: number;
    status: RoomStatus;
    p1Connected: boolean;
    p2Connected: boolean;
};

export type RoomPlayerInfo = {
    n: string;         // プレイヤー名
    deck: string;      // デッキコード
    deckCards: CardInfo[];
    ready: boolean;
};

export type RoomData = {
    meta: RoomMeta;
    p1: RoomPlayerInfo;
    p2?: RoomPlayerInfo;
};
