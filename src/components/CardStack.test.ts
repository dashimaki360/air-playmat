import { describe, it, expect } from 'vitest';
import { buildEvolutionChain } from './CardStack';
import type { Card } from '../types/game';

const makeCard = (id: string, att?: string): Card => ({
    id,
    tId: 'test',
    f: true,
    d: 0,
    cnd: [],
    l: 'p1-active',
    o: 0,
    att,
});

describe('buildEvolutionChain', () => {
    it('付属カードなしの場合はbaseCardのみ返す', () => {
        const base = makeCard('base');
        const chain = buildEvolutionChain(base, []);
        expect(chain).toEqual([base]);
    });

    it('1枚の付属カードがある場合は2要素のチェーンを返す', () => {
        const base = makeCard('base');
        const evo  = makeCard('evo', 'base');
        const chain = buildEvolutionChain(base, [evo]);
        expect(chain).toEqual([base, evo]);
    });

    it('2段階の進化チェーン（base→evo1→evo2）を正しく辿る', () => {
        const base = makeCard('base');
        const evo1 = makeCard('evo1', 'base');
        const evo2 = makeCard('evo2', 'evo1');
        const chain = buildEvolutionChain(base, [evo1, evo2]);
        expect(chain).toEqual([base, evo1, evo2]);
    });

    it('進化とエネルギーが混在する場合、子を持つカード（進化）を優先する', () => {
        // base に evo と energy が両方 att されているが、evo は evo2 の親でもある
        const base   = makeCard('base');
        const evo    = makeCard('evo',    'base');
        const evo2   = makeCard('evo2',   'evo');
        const energy = makeCard('energy', 'base'); // 子なし

        const chain = buildEvolutionChain(base, [energy, evo, evo2]);
        // energy が先に並んでいても evo が優先される
        expect(chain[1]).toEqual(evo);
        expect(chain[2]).toEqual(evo2);
    });

    it('エネルギーが複数ついているだけ（進化なし）の場合は先頭のカードが選ばれる', () => {
        const base  = makeCard('base');
        const eng1  = makeCard('eng1', 'base');
        const eng2  = makeCard('eng2', 'base');

        const chain = buildEvolutionChain(base, [eng1, eng2]);
        // どちらも子なし → 先頭を選ぶ
        expect(chain.length).toBe(2);
        expect(chain[0]).toEqual(base);
    });
});
