#!/usr/bin/env node

/**
 * Script to test deployed smart contract connectivity
 * Usage: node test-contracts.js
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
  "function findBestRoute(uint256 chainId, address tokenIn, address tokenOut, uint256 amountIn) external returns (tuple(address[] path, address[] dexRouters, uint256 expectedOutput, uint256 estimatedGas, uint256 liquidityDepth, uint256 priceImpact, uint256 netValue, uint256 confidence))",
  "function getRouteEfficiency(uint256 chainId, address tokenIn, address tokenOut, uint256 amountIn, address[] path, address[] dexRouters) external view returns (uint256 efficiency, uint256 netValue)",
  "function getActiveDEXs(uint256 chainId) external view returns (address[])",
  "function dexInfoByChain(uint256, address) external view returns (string name, address factory, address router, uint256 gasOverhead, uint256 reliabilityScore, bool isActive, uint256 volumeTraded)"
];

const CROSS_CHAIN_SWAP_ROUTER_ABI = [
  "function getExpectedOutput(address tokenIn, address tokenOut, uint256 amountIn, address dexRouter, address[] path) external view returns (uint256 expectedOut)",
  "function getRouter() external view returns (address)",
  "function supportedDEXs(address) external view returns (bool)",
  "function supportedChainlinkChains(uint64) external view returns (bool)",
  "function supportedAvalancheL1s(bytes32) external view returns (bool)",
  "function feeRecipient() external view returns (address)",
  "function minGasLimit() external view returns (uint256)",
  "function paused() external view returns (bool)"
];

async function testContracts() {
  console.log('🧪 Testing deployed smart contracts...\n');
  
  const chainId = 43113;
  const config = CONTRACTS[chainId];
  
  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Test basic connectivity
    console.log('🔗 Testing RPC connectivity...');
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (${network.chainId})\n`);
    
    // Test LiquidityAggregator
    console.log('📊 Testing LiquidityAggregator...');
    const liquidityAggregator = new ethers.Contract(
      config.liquidityAggregator,
      LIQUIDITY_AGGREGATOR_ABI,
      provider
    );
    
    try {
      // Test getActiveDEXs instead of non-existent functions
      const activeDEXs = await liquidityAggregator.getActiveDEXs(chainId);
      console.log(`✅ LiquidityAggregator responsive`);
      console.log(`   Active DEXs: ${activeDEXs.length} DEXs found`);
      console.log(`   DEX addresses: ${activeDEXs.slice(0, 3).join(', ')}${activeDEXs.length > 3 ? '...' : ''}`);
      
      // Test route efficiency calculation
      if (activeDEXs.length > 0) {
        const testAmount = ethers.parseEther('1.0');
        const dummyTokenA = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'; // WAVAX
        const dummyTokenB = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'; // USDC
        const path = [dummyTokenA, dummyTokenB];
        const dexRouters = [activeDEXs[0]];
        
        try {
          const efficiency = await liquidityAggregator.getRouteEfficiency(
            chainId, dummyTokenA, dummyTokenB, testAmount, path, dexRouters
          );
          console.log(`   Route efficiency: ${efficiency.efficiency}%, Net value: ${ethers.formatEther(efficiency.netValue)} ETH`);
        } catch (effError) {
          console.log(`   Route efficiency test: ${effError.message}`);
        }
      }
    } catch (error) {
      console.log(`⚠️  LiquidityAggregator call failed: ${error.message}`);
    }
    
    // Test CrossChainSwapRouter
    console.log('\n🌉 Testing CrossChainSwapRouter...');
    const crossChainRouter = new ethers.Contract(
      config.crossChainSwapRouter,
      CROSS_CHAIN_SWAP_ROUTER_ABI,
      provider
    );
    
    try {
      // Test actual functions that exist
      const isPaused = await crossChainRouter.paused();
      const feeRecipient = await crossChainRouter.feeRecipient();
      const minGasLimit = await crossChainRouter.minGasLimit();
      
      console.log(`✅ CrossChainSwapRouter responsive`);
      console.log(`   Paused: ${isPaused}`);
      console.log(`   Fee recipient: ${feeRecipient}`);
      console.log(`   Min gas limit: ${minGasLimit}`);
      
      // Test supported DEX check
      const testDEXAddress = '0x60aE616a2155Ee3d9A68541Ba4544862310933d4'; // TraderJoe Router
      const isSupported = await crossChainRouter.supportedDEXs(testDEXAddress);
      console.log(`   TraderJoe supported: ${isSupported}`);
      
    } catch (error) {
      console.log(`⚠️  CrossChainSwapRouter call failed: ${error.message}`);
    }
    
    console.log('\n🎉 Contract testing completed!');
    console.log('📍 Contract addresses:');
    console.log(`   LiquidityAggregator: ${config.liquidityAggregator}`);
    console.log(`   CrossChainSwapRouter: ${config.crossChainSwapRouter}`);
    console.log(`   Fuji Snowtrace: https://testnet.snowtrace.io/address/${config.liquidityAggregator}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this is the main module
if (require.main === module) {
  testContracts();
}

module.exports = { testContracts }; 