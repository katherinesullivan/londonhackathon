import React, { useState, useEffect } from 'react';
import { WalletManager, WalletInfo } from '../utils/wallet';

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const walletManager = WalletManager.getInstance();

  useEffect(() => {
    // Check if already connected
    walletManager.getCurrentWallet().then(setWallet);

    // Listen for wallet changes
    const cleanup = walletManager.onWalletChange(setWallet);

    return cleanup;
  }, [walletManager]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const walletInfo = await walletManager.connectWallet();
      if (walletInfo) {
        setWallet(walletInfo);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await walletManager.disconnectWallet();
    setWallet(null);
  };

  if (wallet) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg transition-colors text-sm flex items-center space-x-1"
                  >
            <span>🏔️</span>
            <span>{walletManager.formatAddress(wallet.address)}</span>
          </button>
        
        {showDetails && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-3 min-w-48">
            <div className="text-xs space-y-1">
              <div className="font-medium text-gray-900">
                {walletManager.formatAddress(wallet.address)}
              </div>
              <div className="text-gray-600">
                Chain: {wallet.chainId}
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1 rounded text-xs transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
    >
      {isConnecting ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting...</span>
        </div>
      ) : (
        <>
          <span>🏔️</span>
          <span>Connect Wallet</span>
        </>
      )}
    </button>
  );
} 