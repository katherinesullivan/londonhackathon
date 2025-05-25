import React, { useState, useEffect } from 'react';
import ChainSelector from './ChainSelector';
import TokenSelector from './TokenSelector';
import RouteDisplay from './RouteDisplay';
import { SUPPORTED_CHAINS } from '../constants/chains';
import { TOKENS_BY_CHAIN } from '../constants/tokens';
import { ContractManager, SwapQuote } from '../utils/contracts';

// Simple icon components to replace lucide-react
function ArrowUpDown({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>↕️</div>;
}

function Settings({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>⚙️</div>;
}

function Zap({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>⚡</div>;
}

interface SwapState {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number;
}

export default function SwapInterface() {
  const [swapState, setSwapState] = useState<SwapState>({
    fromChain: 'dispatch', // Start with Dispatch (Avalanche L1)
    toChain: 'polygonAmoy', // To Polygon Amoy testnet
    fromToken: '0x0000000000000000000000000000000000000000', // Native DIS
    toToken: '0x0000000000000000000000000000000000000000', // Native MATIC
    amount: '',
    slippage: 0.5,
  });

  const [showSlippage, setShowSlippage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const contractManager = ContractManager.getInstance();

  // Fetch quote when swap parameters change
  useEffect(() => {
    const fetchQuote = async () => {
      if (!swapState.amount || parseFloat(swapState.amount) <= 0) {
        setSwapQuote(null);
        setQuoteError(null);
        return;
      }

      const fromChainConfig = SUPPORTED_CHAINS[swapState.fromChain];
      const toChainConfig = SUPPORTED_CHAINS[swapState.toChain];

      if (!fromChainConfig || !toChainConfig) {
        return;
      }

      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const quote = await contractManager.getSwapQuote(
          fromChainConfig.id,
          toChainConfig.id,
          swapState.fromToken,
          swapState.toToken,
          swapState.amount
        );
        setSwapQuote(quote);
        if (!quote) {
          setQuoteError('Unable to generate quote. Please check your input parameters.');
        }
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        setSwapQuote(null);
        setQuoteError(error instanceof Error ? error.message : 'Failed to generate quote');
      } finally {
        setQuoteLoading(false);
      }
    };

    // Debounce quote fetching
    const timeoutId = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [swapState.fromChain, swapState.toChain, swapState.fromToken, swapState.toToken, swapState.amount, contractManager]);

  const handleSwapChains = () => {
    setSwapState(prev => ({
      ...prev,
      fromChain: prev.toChain,
      toChain: prev.fromChain,
      fromToken: '0x0000000000000000000000000000000000000000',
      toToken: '0x0000000000000000000000000000000000000000',
    }));
  };

  const handleSwap = async () => {
    if (!swapState.amount || parseFloat(swapState.amount) <= 0) {
      alert('🦖 T-rex needs food! Enter a valid amount.');
      return;
    }

    if (!swapQuote) {
      alert('🦕 Hold on! T-rex is still calculating the best route.');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual swap logic with smart contracts
      console.log('Initiating cross-chain swap:', swapState, swapQuote);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      alert('Swap initiated! Check your wallet for transaction confirmation.');
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fromChainConfig = SUPPORTED_CHAINS[swapState.fromChain];
  const toChainConfig = SUPPORTED_CHAINS[swapState.toChain];
  const fromTokens = TOKENS_BY_CHAIN[fromChainConfig?.id] || [];
  const toTokens = TOKENS_BY_CHAIN[toChainConfig?.id] || [];

  // Get route type for display
  const getRouteType = () => {
    if (swapQuote) {
      return swapQuote.route;
    }
    
    if (!fromChainConfig || !toChainConfig) return 'Direct';
    
    const isFromAvalanche = fromChainConfig.isAvalancheL1;
    const isToAvalanche = toChainConfig.isAvalancheL1;
    
    if (isFromAvalanche && isToAvalanche) {
      return 'Teleporter';
    } else if (isFromAvalanche && !isToAvalanche) {
      return 'Hybrid Route';
    } else if (!isFromAvalanche && isToAvalanche) {
      return 'CCIP + Teleporter';
    } else {
      return 'CCIP';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-xl shadow-2xl border border-green-200 overflow-hidden">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-green-700 to-emerald-700 px-3 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-white" />
              <h3 className="text-base font-bold text-white">🦖 T-rex Swap</h3>
            </div>
            <button
              onClick={() => setShowSlippage(!showSlippage)}
              className="text-white hover:text-green-200 transition-colors p-1 rounded"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          {/* Route Type Indicator */}
          <div className="mt-1 flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-green-100 text-xs font-medium">{getRouteType()}</span>
            {swapQuote && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-200">
                  🦖 Mock
                </span>
            )}
            {quoteError && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-200">
                ⚠️ Error
              </span>
            )}
          </div>
        </div>

        {/* Slippage Settings */}
        {showSlippage && (
          <div className="bg-green-50 px-3 py-2 border-b border-green-100">
                          <label className="block text-xs font-medium text-green-800 mb-1">
                Slippage Tolerance
              </label>
            <div className="flex space-x-2">
              {[0.1, 0.5, 1.0].map((value) => (
                <button
                  key={value}
                  onClick={() => setSwapState(prev => ({ ...prev, slippage: value }))}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    swapState.slippage === value
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-green-700 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-2 space-y-1.5">
          {/* From Section */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">🦖 From (T-rex starts here)</label>
            
            {/* From Chain Selector */}
            <ChainSelector
              selectedChain={swapState.fromChain}
              onChainSelect={(chainId) => setSwapState(prev => ({ 
                ...prev, 
                fromChain: chainId,
                fromToken: '0x0000000000000000000000000000000000000000'
              }))}
              label="Source Chain"
            />

            {/* From Token and Amount */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="col-span-2">
                <TokenSelector
                  selectedToken={swapState.fromToken}
                  tokens={fromTokens}
                  onTokenSelect={(tokenAddress) => setSwapState(prev => ({ ...prev, fromToken: tokenAddress }))}
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="🍖 Feed me!"
                  value={swapState.amount}
                  onChange={(e) => setSwapState(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right text-sm font-semibold transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center py-0.5">
            <button
              onClick={handleSwapChains}
              className="bg-green-100 hover:bg-green-200 rounded-full p-1.5 transition-all duration-200 border border-green-300 hover:scale-105"
            >
                              <span className="text-green-700 text-sm">🔄</span>
            </button>
          </div>

          {/* To Section */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">🦕 To (T-rex destination)</label>
            
            {/* To Chain Selector */}
            <ChainSelector
              selectedChain={swapState.toChain}
              onChainSelect={(chainId) => setSwapState(prev => ({ 
                ...prev, 
                toChain: chainId,
                toToken: '0x0000000000000000000000000000000000000000'
              }))}
              label="Destination Chain"
            />

            {/* To Token */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="col-span-2">
                <TokenSelector
                  selectedToken={swapState.toToken}
                  tokens={toTokens}
                  onTokenSelect={(tokenAddress) => setSwapState(prev => ({ ...prev, toToken: tokenAddress }))}
                />
              </div>
              <div>
                <div className="px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-right text-sm font-semibold text-gray-500">
                  {quoteLoading ? (
                    <div className="animate-pulse">...</div>
                  ) : swapQuote ? (
                    swapQuote.amountOut
                  ) : quoteError ? (
                    <span className="text-red-500 text-xs">Error</span>
                  ) : swapState.amount ? (
                    <span className="text-gray-400">~</span>
                  ) : (
                    '0.0'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Route Display */}
          <RouteDisplay 
            fromChain={swapState.fromChain}
            toChain={swapState.toChain}
            amount={swapState.amount}
          />

          {/* Error Display */}
          {quoteError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-1.5">
              <div className="flex items-center space-x-1">
                <span className="text-red-600 text-xs">⚠️</span>
                <span className="text-red-700 text-xs font-medium">🦖 T-rex is confused!</span>
              </div>
              <p className="text-red-600 text-xs mt-0.5">{quoteError}</p>
            </div>
          )}

          {/* Enhanced Cost Information with Real Data */}
          {swapState.amount && parseFloat(swapState.amount) > 0 && !quoteError && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-1.5 border border-green-200">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-semibold text-gray-800">🦴 T-rex Feeding Costs</h4>
                <div className="flex items-center space-x-1">
                  {quoteLoading && (
                    <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {swapQuote && (
                    <span className="text-xs px-1 py-0.5 rounded bg-green-100 text-green-700">
                      🦖 Mock
                    </span>
                  )}
                </div>
              </div>
              
              {swapQuote ? (
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gas Fee:</span>
                      <span className="font-medium">{swapQuote.gasFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bridge Fee:</span>
                      <span className="font-medium">{swapQuote.bridgeFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Protocol:</span>
                      <span className="font-medium">{swapQuote.protocolFee}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold text-gray-900">{swapQuote.totalFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{swapQuote.estimatedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confidence:</span>
                      <span className={`font-medium ${getConfidenceColor(swapQuote.confidence)}`}>
                        {swapQuote.confidence}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-1">
                  {quoteLoading ? '🦖 T-rex is calculating...' : 'Enter amount to feed the T-rex and see costs'}
                </div>
              )}
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!swapState.amount || parseFloat(swapState.amount) <= 0 || isLoading || quoteLoading || !swapQuote}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-sm py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>🦖 T-rex is stomping...</span>
              </div>
            ) : quoteLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>🦖 T-rex is thinking...</span>
              </div>
            ) : !swapQuote && swapState.amount ? (
              '🦕 Wake up T-rex!'
            ) : (
              '🦖 RAWR! Execute Swap'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 