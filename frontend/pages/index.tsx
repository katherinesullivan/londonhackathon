import { useState } from 'react';
import Head from 'next/head';
import SwapInterface from '../src/components/SwapInterface';
import WalletConnect from '../src/components/WalletConnect';

// Simple icon components to replace lucide-react
function ArrowLeftRight({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>🔄</div>;
}



export default function Home() {
  return (
    <>
      <Head>
        <title>T-rex - Avalanche Cross-Chain Bridge</title>
        <meta name="description" content="RAWR! Cross-chain swapping powered by Avalanche and Chainlink CCIP" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 relative overflow-hidden">
        {/* Subtle T-rex Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-10 right-10 text-6xl opacity-10 transform rotate-12">
            🦖
          </div>
          <div className="absolute top-20 left-10 text-4xl opacity-5 transform -rotate-12">
            🦕
          </div>
        </div>

        {/* Compact Header */}
        <header className="bg-white bg-opacity-10 backdrop-blur-md border-b border-white border-opacity-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2">
          <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🦖</span>
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">T-rex</h1>
                  <p className="text-xs text-green-200">RAWR Cross-Chain Bridge</p>
                </div>
              </div>
              
              {/* Real Wallet Connection */}
              <WalletConnect />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-lg mx-auto px-3 py-4 flex flex-col min-h-[calc(100vh-60px)] relative z-10">
          {/* Compact Hero Section */}
          <div className="text-center mb-1">
            <h2 className="text-lg font-bold text-white mb-0.5">
              🦖 T-rex Swap
            </h2>
            <p className="text-green-200 text-xs mb-1">
              Stomp through the blockchain jungle like a prehistoric beast! 🦕
            </p>
          </div>

          {/* Swap Interface - Main Focus */}
          <div className="flex-1">
          <SwapInterface />
          </div>

          {/* Compact Info Cards */}
          <div className="mt-4 space-y-2">
            {/* Status Info */}
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-1.5 border border-white border-opacity-20">
              <div className="flex items-center space-x-2 mb-0.5">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">Demo Mode</span>
              </div>
                              <p className="text-green-200 text-xs">
                  T-rex is still evolving! Using mock data • 4 prehistoric testnets
                </p>
            </div>



            {/* Faucet Links - Very Compact */}
                          <div className="bg-gradient-to-r from-green-800 to-emerald-800 rounded-lg p-1.5 border border-green-600">
                              <h3 className="text-xs font-semibold text-white mb-1">🍖 Feed the T-rex (Get Test Tokens)</h3>
              <div className="grid grid-cols-2 gap-1">
                <a 
                  href="https://test.core.app/tools/testnet-faucet/?subnet=dispatch&token=dispatch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 px-1 py-0.5 rounded text-xs text-white transition-colors"
                >
                  Dispatch
                </a>
                <a 
                  href="https://test.core.app/tools/testnet-faucet/?subnet=echo&token=echo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 px-1 py-0.5 rounded text-xs text-white transition-colors"
                >
                  Echo
                </a>
                <a 
                  href="https://faucets.chain.link/sepolia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 px-1 py-0.5 rounded text-xs text-white transition-colors"
                >
                  Sepolia
                </a>
                <a 
                  href="https://faucet.polygon.technology/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 px-1 py-0.5 rounded text-xs text-white transition-colors"
                >
                  Amoy
                </a>
              </div>
            </div>
            </div>
          </div>
        </main>
    </>
  );
}