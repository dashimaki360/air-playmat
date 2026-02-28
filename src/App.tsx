import { useState } from 'react';
import { Board } from './components/Board';
import { DeckManager } from './components/DeckManager';
import { useDeckManager } from './hooks/useDeckManager';

type Tab = 'deck' | 'battle';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('battle');
  const { decks, selectedIndex, isLoading, error, importDeck, selectDeck, removeDeck } = useDeckManager();

  const selectedDeck = selectedIndex !== null ? decks[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 bg-slate-800">
        <button
          onClick={() => setActiveTab('deck')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'deck'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          デッキ管理
        </button>
        <button
          onClick={() => setActiveTab('battle')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'battle'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          対戦
          {selectedDeck && (
            <span className="ml-2 text-xs text-green-400">({selectedDeck.code})</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'deck' ? (
        <DeckManager
          decks={decks}
          selectedIndex={selectedIndex}
          isLoading={isLoading}
          error={error}
          onImport={importDeck}
          onSelect={selectDeck}
          onRemove={removeDeck}
        />
      ) : (
        <Board key={selectedDeck?.code ?? 'default'} deckCards={selectedDeck?.cards} />
      )}
    </div>
  );
}

export default App;
