import { useState } from 'react';
import Head from 'next/head';
import SwapInterface from '../src/components/SwapInterface';
import WalletConnect from '../src/components/WalletConnect';

// Simple icon components to replace lucide-react
function ArrowLeftRight({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>🔄</div>;
}

function Shield({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>🛡️</div>;
}

function Zap({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>⚡</div>;
}

function ExternalLink({ className }: { className?: string }) {
  return <div className={`${className} flex items-center justify-center`}>🔗</div>;
}

export default function Home() {
  return (
    <>
      <Head>
        <title>CrossLink - Avalanche Cross-Chain Bridge</title>
        <meta name="description" content="Cross-chain swapping powered by Avalanche and Chainlink CCIP" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-x-hidden">
        {/* Compact Header */}
        <header className="bg-white bg-opacity-10 backdrop-blur-md border-b border-white border-opacity-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-2">
          <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <ArrowLeftRight className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">CrossLink</h1>
                  <p className="text-xs text-blue-200">Cross-Chain Bridge</p>
                </div>
              </div>
              
              {/* Real Wallet Connection */}
              <WalletConnect />
            </div>
          </div>
        </header>

        {/* Main Content - Fit everything on screen */}
        <div className="max-w-lg mx-auto px-3 py-2 flex flex-col min-h-[calc(100vh-60px)]">
          {/* Compact Hero Section */}
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-white mb-1">
              Cross-Chain Swap
            </h2>
            <p className="text-blue-200 text-xs mb-2">
              Bridge tokens between Avalanche L1s and external networks
            </p>
          </div>

          {/* Swap Interface - Main Focus */}
          <div className="flex-1">
          <SwapInterface />
          </div>

          {/* Compact Info Cards */}
          <div className="mt-2 space-y-1">
            {/* Status Info */}
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-1.5 border border-white border-opacity-20">
              <div className="flex items-center space-x-2 mb-0.5">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">Live on Testnet ✅</span>
              </div>
              <p className="text-blue-200 text-xs">
                Using deployed smart contracts • Connect wallet for real pricing
              </p>
            </div>

            {/* Quick Features */}
            <div className="grid grid-cols-3 gap-1">
              <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-1 text-center border border-white border-opacity-10">
                <Zap className="w-3 h-3 text-yellow-400 mx-auto mb-0.5" />
                <p className="text-xs text-white font-medium">Fast</p>
              </div>
              
              <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-1 text-center border border-white border-opacity-10">
                <Shield className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
                <p className="text-xs text-white font-medium">Secure</p>
              </div>
              
              <div className="bg-white bg-opacity-5 backdrop-blur-sm rounded-lg p-1 text-center border border-white border-opacity-10">
                <ArrowLeftRight className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
                <p className="text-xs text-white font-medium">Multi-Chain</p>
              </div>
            </div>

            {/* Faucet Links - Very Compact */}
            <div className="bg-gradient-to-r from-blue-800 to-purple-800 rounded-lg p-1.5 border border-blue-600">
              <h3 className="text-xs font-semibold text-white mb-1">Need Test Tokens?</h3>
              <div className="grid grid-cols-2 gap-1">
                <a 
                  href="https://faucets.chain.link/arbitrum-sepolia" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 px-1 py-0.5 rounded text-xs text-white transition-colors"
                >
                  Arbitrum
                </a>
                <a 
                  href="https://core.app/tools/testnet-faucet/?subnet=c&token=c" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 px-1 py-0.5 rounded text-xs text-white transition-colors"
                >
                  Fuji
                </a>
              </div>
            </div>
            </div>
          </div>
        </main>
    </>
  );
}