import { useState, useCallback } from 'react';

export type GameLogAction =
    | 'draw'
    | 'move'
    | 'attach'
    | 'detach'
    | 'trash'
    | 'shuffle'
    | 'coin'
    | 'damage'
    | 'status'
    | 'return'
    | 'system';

export type GameLogEntry = {
    id: string;
    timestamp: number;
    playerId: string | null;
    action: GameLogAction;
    message: string;
};

const DEFAULT_MAX_LOGS = 100;

let logCounter = 0;

export function useGameLog(maxLogs: number = DEFAULT_MAX_LOGS) {
    const [logs, setLogs] = useState<GameLogEntry[]>([]);

    const addLog = useCallback((playerId: string | null, action: GameLogAction, message: string) => {
        const entry: GameLogEntry = {
            id: `log-${Date.now()}-${logCounter++}`,
            timestamp: Date.now(),
            playerId,
            action,
            message,
        };

        setLogs(prev => {
            const next = [entry, ...prev];
            return next.length > maxLogs ? next.slice(0, maxLogs) : next;
        });
    }, [maxLogs]);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return { logs, addLog, clearLogs };
}
