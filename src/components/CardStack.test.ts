import { describe, it, expect } from 'vitest';
import { buildEvolutionChain } from './CardStack';
import type { Card, CardType } from '../types/game';

const makeCard = (id: string, att?: string, tp?: CardType): Card => ({
    id,
    tId: 'test',
    f: true,
    d: 0,
    cnd: [],
    l: 'p1-active',
    o: 0,
    att,
    tp,
});

describe('buildEvolutionChain', () => {
    it('付属カードなしの場合はbaseCardのみ返す', () => {
        const base = makeCard('base');
        const chain = buildEvolutionChain(base, []);
        expect(chain).toEqual([base]);
    });

    it('tp=pokemonの付属カードがある場合は2要素のチェーンを返す', () => {
        const base = makeCard('base', undefined, 'pokemon');
        const evo  = makeCard('evo', 'base', 'pokemon');
        const chain = buildEvolutionChain(base, [evo]);
        expect(chain).toEqual([base, evo]);
    });

    it('2段階の進化チェーン（base→evo1→evo2）を正しく辿る', () => {
        const base = makeCard('base', undefined, 'pokemon');
        const evo1 = makeCard('evo1', 'base', 'pokemon');
        const evo2 = makeCard('evo2', 'evo1', 'pokemon');
        const chain = buildEvolutionChain(base, [evo1, evo2]);
        expect(chain).toEqual([base, evo1, evo2]);
    });

    it('tp=pokemonの進化とtp=energyが混在する場合、進化のみチェーンに入る', () => {
        const base   = makeCard('base',   undefined, 'pokemon');
        const evo    = makeCard('evo',    'base',    'pokemon');
        const evo2   = makeCard('evo2',   'evo',     'pokemon');
        const energy = makeCard('energy', 'base',    'energy');

        const chain = buildEvolutionChain(base, [energy, evo, evo2]);
        expect(chain[1]).toEqual(evo);
        expect(chain[2]).toEqual(evo2);
    });

    it('エネルギーが複数ついているだけ（進化なし）の場合はbaseCardのみのチェーンになる', () => {
        const base = makeCard('base',  undefined, 'pokemon');
        const eng1 = makeCard('eng1', 'base',    'energy');
        const eng2 = makeCard('eng2', 'base',    'energy');

        const chain = buildEvolutionChain(base, [eng1, eng2]);
        expect(chain.length).toBe(1);
        expect(chain[0]).toEqual(base);
    });
});

describe('buildEvolutionChain (tp フィールドによる区別)', () => {
    it('tp=pokemonの進化カードはチェーンに含まれる', () => {
        const base = makeCard('base', undefined, 'pokemon');
        const evo  = makeCard('evo', 'base', 'pokemon');
        const chain = buildEvolutionChain(base, [evo]);
        expect(chain).toEqual([base, evo]);
    });

    it('tp=energyのカードはチェーンに含まれない（nonEvolutionCards扱い）', () => {
        const base   = makeCard('base',   undefined, 'pokemon');
        const energy = makeCard('energy', 'base',    'energy');
        const chain  = buildEvolutionChain(base, [energy]);
        expect(chain).toEqual([base]);
    });

    it('tp=pokemonの進化とtp=energyが混在する場合、進化のみチェーンに入る', () => {
        const base   = makeCard('base',   undefined, 'pokemon');
        const evo    = makeCard('evo',    'base',    'pokemon');
        const energy = makeCard('energy', 'base',    'energy');
        const chain  = buildEvolutionChain(base, [energy, evo]);
        expect(chain).toEqual([base, evo]);
    });

    it('tp=itemのカードはチェーンに含まれない', () => {
        const base = makeCard('base', undefined, 'pokemon');
        const item = makeCard('item', 'base',    'item');
        const chain = buildEvolutionChain(base, [item]);
        expect(chain).toEqual([base]);
    });

    it('tpがundefinedの場合はpokemon扱いにならずbaseCardのみのチェーンになる', () => {
        const base = makeCard('base');
        const evo  = makeCard('evo', 'base'); // tp未設定
        const chain = buildEvolutionChain(base, [evo]);
        expect(chain).toEqual([base]);
    });
});
