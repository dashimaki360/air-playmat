import { useState, useCallback } from 'react';

export type CoinResult = 'heads' | 'tails';

type CoinTossProps = {
    onResult: (result: CoinResult) => void;
};

export function CoinToss({ onResult }: CoinTossProps) {
    const [isFlipping, setIsFlipping] = useState(false);
    const [result, setResult] = useState<CoinResult | null>(null);

    const handleToss = useCallback(() => {
        if (isFlipping) return;

        setIsFlipping(true);
        setResult(null);

        setTimeout(() => {
            const coinResult: CoinResult = Math.random() < 0.5 ? 'heads' : 'tails';
            setResult(coinResult);
            setIsFlipping(false);
            onResult(coinResult);
        }, 800);
    }, [isFlipping, onResult]);

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleToss}
                disabled={isFlipping}
                aria-disabled={isFlipping}
                className={`
                    px-3 py-1.5 rounded-lg font-bold text-sm shadow-md border transition-all
                    ${isFlipping
                        ? 'bg-slate-600 text-slate-400 border-slate-500 cursor-not-allowed'
                        : 'bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-400 active:scale-95'
                    }
                `}
            >
                コイントス
            </button>

            {result && (
                <span className={`
                    font-bold text-sm px-2 py-1 rounded
                    ${result === 'heads'
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                        : 'bg-red-900/50 text-red-300 border border-red-700'
                    }
                `}>
                    {result === 'heads' ? '表' : '裏'}
                </span>
            )}
        </div>
    );
}
