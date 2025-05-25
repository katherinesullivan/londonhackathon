#!/usr/bin/env node

/**
 * Script to initialize deployed contracts with DEX data and configuration
 * Usage: node update-contracts.js
 */

const { ethers } = require('ethers');

// Contract addresses on Fuji
const CONTRACTS = {
  43113: {
    liquidityAggregator: '0xaB01AF7ecf4F4D2b8cAAA64b6f8b97f9a0186464',
    crossChainSwapRouter: '0xCa002d1F05FE44AdeBA62f3b5bfe304DC9B2687A',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc'
  }
};

const LIQUIDITY_AGGREGATOR_ABI = [
  "function addDEX(uint256 chainId, string name, address factory, address router, uint256 gasOverhead, uint256 reliabilityScore) external",
  "function getActiveDEXs(uint256 chainId) external view returns (address[])",
  "function setPriceFeed(address token, address feed) external",
  "function updateGasPrice(uint256 chainId, uint256 gasPrice) external",
  "function owner() external view returns (address)"
];

const CROSS_CHAIN_SWAP_ROUTER_ABI = [
  "function addDEX(address dexRouter) external",
  "function addChainlinkChain(uint64 chainSelector) external",
  "function addAvalancheL1(bytes32 blockchainID) external",
  "function supportedDEXs(address) external view returns (bool)",
  "function owner() external view returns (address)"
];

// DEX configurations for Fuji testnet
const FUJI_DEXS = [
  {
    name: "TraderJoe",
    factory: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
    router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
    gasOverhead: 180000,
    reliabilityScore: 95
  },
  {
    name: "Pangolin",
    factory: "0xefa94DE7a4656D787667C749f7E1223D71E9FD88",
    router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
    gasOverhead: 160000,
    reliabilityScore: 90
  }
];

// Chainlink price feeds on Fuji
const PRICE_FEEDS = {
  "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7": "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD", // AVAX/USD
  "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E": "0x7898AcCC83587C3C55116c5230C17a6d441077C8", // USDC/USD
  "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7": "0x7898AcCC83587C3C55116c5230C17a6d441077C8"  // USDT/USD (using USDC feed)
};

async function initializeContracts() {
  console.log('🔧 Initializing deployed contracts with data...\n');
  
  // Check if we have a private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY environment variable not set');
    console.log('💡 Run: export PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }
  
  const chainId = 43113;
  const config = CONTRACTS[chainId];
  
  try {
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log(`🔑 Using wallet: ${wallet.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} AVAX\n`);
    
    // Initialize LiquidityAggregator
    console.log('📊 Initializing LiquidityAggregator...');
    const liquidityAggregator = new ethers.Contract(
      config.liquidityAggregator,
      LIQUIDITY_AGGREGATOR_ABI,
      wallet
    );
    
    // Check if we're the owner
    const liquidityOwner = await liquidityAggregator.owner();
    console.log(`   Owner: ${liquidityOwner}`);
    console.log(`   Wallet: ${wallet.address}`);
    
    if (liquidityOwner.toLowerCase() === wallet.address.toLowerCase()) {
      // Add DEXs
      for (const dex of FUJI_DEXS) {
        try {
          console.log(`   Adding DEX: ${dex.name}...`);
          const tx = await liquidityAggregator.addDEX(
            chainId,
            dex.name,
            dex.factory,
            dex.router,
            dex.gasOverhead,
            dex.reliabilityScore
          );
          await tx.wait();
          console.log(`   ✅ ${dex.name} added successfully`);
        } catch (error) {
          console.log(`   ⚠️ ${dex.name} failed: ${error.message}`);
        }
      }
      
      // Set price feeds
      console.log('   Setting price feeds...');
      for (const [token, feed] of Object.entries(PRICE_FEEDS)) {
        try {
          const tx = await liquidityAggregator.setPriceFeed(token, feed);
          await tx.wait();
          console.log(`   ✅ Price feed set for ${token.slice(0, 10)}...`);
        } catch (error) {
          console.log(`   ⚠️ Price feed failed: ${error.message}`);
        }
      }
      
      // Update gas price
      try {
        const tx = await liquidityAggregator.updateGasPrice(chainId, ethers.parseUnits('25', 'gwei'));
        await tx.wait();
        console.log(`   ✅ Gas price updated to 25 gwei`);
      } catch (error) {
        console.log(`   ⚠️ Gas price update failed: ${error.message}`);
      }
    } else {
      console.log('   ⚠️ Not the owner of LiquidityAggregator, skipping initialization');
    }
    
    // Initialize CrossChainSwapRouter
    console.log('\n🌉 Initializing CrossChainSwapRouter...');
    const crossChainRouter = new ethers.Contract(
      config.crossChainSwapRouter,
      CROSS_CHAIN_SWAP_ROUTER_ABI,
      wallet
    );
    
    const routerOwner = await crossChainRouter.owner();
    console.log(`   Owner: ${routerOwner}`);
    
    if (routerOwner.toLowerCase() === wallet.address.toLowerCase()) {
      // Add DEXs to CrossChainSwapRouter
      for (const dex of FUJI_DEXS) {
        try {
          console.log(`   Adding DEX: ${dex.name}...`);
          const tx = await crossChainRouter.addDEX(dex.router);
          await tx.wait();
          console.log(`   ✅ ${dex.name} added successfully`);
        } catch (error) {
          console.log(`   ⚠️ ${dex.name} failed: ${error.message}`);
        }
      }
      
      // Add supported chains
      const chainSelectors = [
        { name: 'Arbitrum Sepolia', selector: '3478487238524512106' },
        { name: 'Base Sepolia', selector: '10344971235874465080' },
        { name: 'Polygon Amoy', selector: '16281711391670634445' }
      ];
      
      for (const chain of chainSelectors) {
        try {
          console.log(`   Adding chain: ${chain.name}...`);
          const tx = await crossChainRouter.addChainlinkChain(chain.selector);
          await tx.wait();
          console.log(`   ✅ ${chain.name} added successfully`);
        } catch (error) {
          console.log(`   ⚠️ ${chain.name} failed: ${error.message}`);
        }
      }
    } else {
      console.log('   ⚠️ Not the owner of CrossChainSwapRouter, skipping initialization');
    }
    
    console.log('\n🎉 Contract initialization completed!');
    console.log('🧪 Run "node test-contracts.js" to verify the changes');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

// Run initialization if this is the main module
if (require.main === module) {
  initializeContracts();
}

module.exports = { initializeContracts }; 