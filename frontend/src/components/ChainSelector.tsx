import React, { useState } from 'react';
import { SUPPORTED_CHAINS, CHAIN_CATEGORIES } from '../constants/chains';

// Simple icon component to replace lucide-react
function ChevronDown({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>▼</div>;
}

interface ChainSelectorProps {
  selectedChain: string;
  onChainSelect: (chainId: string) => void;
  label: string;
}

export default function ChainSelector({ selectedChain, onChainSelect, label }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedChainConfig = SUPPORTED_CHAINS[selectedChain];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: CHAIN_CATEGORIES[selectedChainConfig?.category]?.color || '#666' }}
          >
            {selectedChainConfig?.shortName?.[0] || '?'}
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">{selectedChainConfig?.name || 'Select Chain'}</div>
            <div className="text-sm text-gray-500">{selectedChainConfig?.category || ''}</div>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {Object.entries(SUPPORTED_CHAINS).map(([chainKey, chain]) => (
            <button
              key={chainKey}
              onClick={() => {
                onChainSelect(chainKey);
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: CHAIN_CATEGORIES[chain.category]?.color || '#666' }}
              >
                {chain.shortName[0]}
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">{chain.name}</div>
                <div className="text-sm text-gray-500">{chain.category}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 