import { useState } from 'react';
import type { GameLogEntry } from '../hooks/useGameLog';

type GameLogProps = {
    logs: GameLogEntry[];
    isOpen?: boolean;
    onToggle?: () => void;
};

const playerLabel = (playerId: string | null) => {
    if (!playerId) return null;
    return playerId === 'p1' ? 'P1' : 'P2';
};

const playerColor = (playerId: string | null) => {
    if (!playerId) return 'text-slate-400';
    return playerId === 'p1' ? 'text-blue-400' : 'text-red-400';
};

export function GameLog({ logs, isOpen: controlledIsOpen, onToggle }: GameLogProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(true);
    const isOpen = controlledIsOpen ?? internalIsOpen;
    const handleToggle = onToggle ?? (() => setInternalIsOpen(prev => !prev));

    return (
        <div className="bg-slate-800/90 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 hover:bg-slate-700 transition-colors text-sm font-bold text-slate-300"
            >
                <span>ログ ({logs.length})</span>
                <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
            </button>

            {isOpen && (
                <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                    {logs.length === 0 ? (
                        <div className="text-xs text-slate-500 text-center py-2">ログはまだありません</div>
                    ) : (
                        logs.map(entry => (
                            <div key={entry.id} className="flex items-start gap-2 text-xs leading-relaxed">
                                {playerLabel(entry.playerId) && (
                                    <span className={`font-bold shrink-0 ${playerColor(entry.playerId)}`}>
                                        {playerLabel(entry.playerId)}
                                    </span>
                                )}
                                <span className="text-slate-300">{entry.message}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
