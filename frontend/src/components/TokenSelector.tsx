import React, { useState } from 'react';
import { TokenConfig } from '../constants/tokens';

// Simple icon component to replace lucide-react
function ChevronDown({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>▼</div>;
}

interface TokenSelectorProps {
  selectedToken: string;
  tokens: TokenConfig[];
  onTokenSelect: (tokenAddress: string) => void;
}

export default function TokenSelector({ selectedToken, tokens, onTokenSelect }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedTokenConfig = tokens.find(token => token.address === selectedToken);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {selectedTokenConfig?.symbol?.[0] || '?'}
          </div>
          <span className="font-medium text-gray-900">
            {selectedTokenConfig?.symbol || 'Select Token'}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {tokens.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                onTokenSelect(token.address);
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {token.symbol[0]}
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">{token.symbol}</div>
                <div className="text-xs text-gray-500">{token.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 