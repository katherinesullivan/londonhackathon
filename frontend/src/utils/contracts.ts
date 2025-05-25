export interface ContractAddresses {
  [chainId: number]: {
    liquidityAggregator?: string;
    crossChainSwapRouter?: string;
    ccipRouter?: string;
    teleporter?: string;
  };
}

// Contract addresses for different networks (Mock data)
export const CONTRACT_ADDRESSES: ContractAddresses = {
  // Dispatch Testnet (779672)
  779672: {
    ccipRouter: '0x1234567890123456789012345678901234567890',
    teleporter: '0x2345678901234567890123456789012345678901',
    liquidityAggregator: '0x3456789012345678901234567890123456789012',
    crossChainSwapRouter: '0x4567890123456789012345678901234567890123',
  },
  // Echo Testnet (397)
  397: {
    ccipRouter: '0x5678901234567890123456789012345678901234',
    teleporter: '0x6789012345678901234567890123456789012345',
    liquidityAggregator: '0x7890123456789012345678901234567890123456',
    crossChainSwapRouter: '0x8901234567890123456789012345678901234567',
  },
  // Ethereum Sepolia (11155111)
  11155111: {
    ccipRouter: '0x9012345678901234567890123456789012345678',
    liquidityAggregator: '0x0123456789012345678901234567890123456789',
    crossChainSwapRouter: '0x1234567890123456789012345678901234567890',
  },
  // Polygon Amoy (80002)
  80002: {
    ccipRouter: '0x9C32fCB86BF0f4a1A8921a9Fe46de3198bb884B2',
    liquidityAggregator: '0x2345678901234567890123456789012345678901',
    crossChainSwapRouter: '0x3456789012345678901234567890123456789012',
  },
};

// RPC URLs for different networks
export const RPC_URLS: { [chainId: number]: string } = {
  779672: 'https://subnets.avax.network/dispatch/testnet/rpc', // Dispatch
  397: 'https://subnets.avax.network/echo/testnet/rpc', // Echo
  11155111: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY', // Ethereum Sepolia
  80002: 'https://rpc-amoy.polygon.technology', // Polygon Amoy
};

// ABI fragments for the contracts we need to interact with
export const LIQUIDITY_AGGREGATOR_ABI = [
  // Core functions from the compiled ABI
  "function findBestRoute(uint256 chainId, address tokenIn, address tokenOut, uint256 amountIn) external returns (tuple(address[] path, address[] dexRouters, uint256 expectedOutput, uint256 estimatedGas, uint256 liquidityDepth, uint256 priceImpact, uint256 netValue, uint256 confidence))",
  "function getRouteEfficiency(uint256 chainId, address tokenIn, address tokenOut, uint256 amountIn, address[] path, address[] dexRouters) external view returns (uint256 efficiency, uint256 netValue)",
  "function getActiveDEXs(uint256 chainId) external view returns (address[])",
  "function dexInfoByChain(uint256, address) external view returns (string name, address factory, address router, uint256 gasOverhead, uint256 reliabilityScore, bool isActive, uint256 volumeTraded)"
];

export const CROSS_CHAIN_SWAP_ROUTER_ABI = [
  // Core functions from the compiled ABI
  "function getExpectedOutput(address tokenIn, address tokenOut, uint256 amountIn, address dexRouter, address[] path) external view returns (uint256 expectedOut)",
  "function getRouter() external view returns (address)",
  "function supportedDEXs(address) external view returns (bool)",
  "function supportedChainlinkChains(uint64) external view returns (bool)",
  "function supportedAvalancheL1s(bytes32) external view returns (bool)",
  "function feeRecipient() external view returns (address)",
  "function minGasLimit() external view returns (uint256)",
  "function paused() external view returns (bool)"
];

// Chain selectors for CCIP
export const CCIP_CHAIN_SELECTORS: { [chainId: number]: string } = {
  11155111: '16015286601757825753', // Ethereum Sepolia
  80002: '16281711391670634445', // Polygon Amoy
};

export interface SwapQuote {
  amountOut: string;
  gasFee: string;
  bridgeFee: string;
  protocolFee: string;
  totalFee: string;
  estimatedTime: string;
  confidence: 'High' | 'Medium' | 'Low';
  route: 'Teleporter' | 'CCIP' | 'Hybrid Route' | 'CCIP + Teleporter';
  priceImpact?: string;
  isRealData: boolean;
}

// Real market prices (updated January 2025)
const REAL_TOKEN_PRICES: { [key: string]: number | { [chainId: number]: number } } = {
  // Native tokens
  '0x0000000000000000000000000000000000000000': {
    779672: 0.0075,    // DIS (Dispatch) - small testnet token
    397: 0.012,        // ECHO - similar testnet token
    11155111: 2500,    // ETH (Sepolia testnet)
    80002: 0.35,       // MATIC (Polygon Amoy testnet)
  },
  
  // USDC prices (stable)
  '0xA0b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B0': 1.00,
  '0xB0b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B0': 1.00,
  '0xC0b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B0': 1.00,
  '0xD0b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B0': 1.00,
  
  // USDT prices (stable)
  '0xA1b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B1': 1.00,
  '0xB1b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B1': 1.00,
  '0xC1b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B1': 1.00,
  '0xD1b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B1': 1.00,
  
  // AVAX prices
  '0xA2b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B2': 22.80,
  '0xB2b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B2': 22.80,
  '0xC2b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B2': 22.80,
  '0xD2b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B2': 22.80,
  
  // LINK prices
  '0xA3b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B3': 15.30,
  '0xB3b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B3': 15.30,
  '0xC3b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B3': 15.30,
  '0xD3b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B3': 15.30,
  
  // WMATIC prices
  '0xA4b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B4': 0.35,
  '0xB4b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B4': 0.35,
  '0xC4b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B4': 0.35,
  '0xD4b86a33E6441b8dB2B2B0d0B0B0B0B0B0B0B0B4': 0.35,
};

// Helper function to get token price
function getTokenPrice(tokenAddress: string, chainId: number): number {
  // Handle native tokens
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    const nativeTokenPrices = REAL_TOKEN_PRICES[tokenAddress];
    if (typeof nativeTokenPrices === 'object' && nativeTokenPrices !== null) {
      return nativeTokenPrices[chainId] || 1.0;
    }
    return 1.0;
  }
  
  // Handle ERC-20 tokens
  const tokenPrice = REAL_TOKEN_PRICES[tokenAddress];
  return typeof tokenPrice === 'number' ? tokenPrice : 1.0;
}

export class ContractManager {
  private static instance: ContractManager;

  static getInstance(): ContractManager {
    if (!ContractManager.instance) {
      ContractManager.instance = new ContractManager();
    }
    return ContractManager.instance;
  }

  async getSwapQuote(
    fromChainId: number,
    toChainId: number,
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapQuote | null> {
    try {
      // Return realistic mock data since we can't connect to real contracts
      return this.getMockSwapQuote(fromChainId, toChainId, tokenIn, tokenOut, amountIn);
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      return null;
    }
  }

  private async getRealSwapQuote(
    fromChainId: number,
    toChainId: number,
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapQuote | null> {
    if (!window.ethereum) {
      throw new Error('Wallet not connected - please connect your wallet first');
    }

    // Dynamic import ethers to avoid SSR issues
    const { ethers } = await import('ethers');
    
    console.log('🔍 Starting contract call...');
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Check wallet connection and network
    const accounts = await provider.listAccounts();
    console.log('📱 Connected accounts:', accounts.length);
    
    if (accounts.length === 0) {
      throw new Error('No wallet accounts found - please connect your wallet');
    }
    
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);
    console.log('🌐 Connected to network:', currentChainId);
    console.log('🎯 Required network: 43113 (Fuji)');
    
    if (currentChainId !== 43113) {
      throw new Error(`Switch to Fuji testnet (43113). Currently on chain ${currentChainId}`);
    }
    
    const amountInWei = ethers.parseEther(amountIn);
    console.log('💰 Amount in wei:', amountInWei.toString());
    
    // Always use Fuji contracts (43113) for pricing
    const fujiAddresses = CONTRACT_ADDRESSES[43113];
    if (!fujiAddresses?.liquidityAggregator || !fujiAddresses?.crossChainSwapRouter) {
      throw new Error('Contracts not found on Fuji testnet');
    }

    console.log('🏗️ Contract addresses:');
    console.log('   LiquidityAggregator:', fujiAddresses.liquidityAggregator);
    console.log('   CrossChainSwapRouter:', fujiAddresses.crossChainSwapRouter);

    const routeType = this.determineRouteType(fromChainId, toChainId);
    console.log('🛣️ Route type:', routeType);

    try {
      // Create contract instances with real ABIs
      const liquidityAggregator = new ethers.Contract(
        fujiAddresses.liquidityAggregator,
        LIQUIDITY_AGGREGATOR_ABI,
        provider
      );

      const crossChainRouter = new ethers.Contract(
        fujiAddresses.crossChainSwapRouter,
        CROSS_CHAIN_SWAP_ROUTER_ABI,
        provider
      );

      console.log('📞 Calling contracts...');

      if (fromChainId === toChainId && fromChainId === 43113) {
        // Same chain swap on Fuji - use LiquidityAggregator
        console.log('🔄 Same chain swap - calling LiquidityAggregator...');
        
        try {
          // Call findBestRoute instead of getOptimalRoute
          const route = await liquidityAggregator.findBestRoute(fromChainId, tokenIn, tokenOut, amountInWei);
          console.log('✅ Route received:', route);

          // Get DEX info for gas estimation
          const activeDEXs = await liquidityAggregator.getActiveDEXs(fromChainId);
          console.log('✅ Active DEXs:', activeDEXs);

          // Estimate gas cost (simplified calculation)
          const estimatedGasPrice = 25; // 25 gwei
          const gasCostEth = (Number(route.estimatedGas) * estimatedGasPrice) / 1e9;
          const gasCostUSD = gasCostEth * 2500; // ETH price

          return {
            amountOut: ethers.formatEther(route.expectedOutput),
            gasFee: `$${gasCostUSD.toFixed(2)}`,
            bridgeFee: '$0.00', // No bridge for same chain
            protocolFee: '0.05%',
            totalFee: `$${gasCostUSD.toFixed(2)}`,
            estimatedTime: '30s - 2min',
            confidence: route.confidence > 80 ? 'High' : route.confidence > 60 ? 'Medium' : 'Low',
            route: 'Teleporter',
            priceImpact: `${(Number(route.priceImpact) / 100).toFixed(2)}%`,
            isRealData: true
          };
        } catch (sameChainError: any) {
          console.error('❌ Same chain call failed:', sameChainError);
          throw new Error(`Same chain swap failed: ${sameChainError.message}`);
        }
      } else {
        // Cross-chain swap - use CrossChainSwapRouter
        console.log('🌉 Cross-chain swap - calling CrossChainSwapRouter...');
        
        const destinationSelector = CCIP_CHAIN_SELECTORS[toChainId];
        if (!destinationSelector) {
          throw new Error(`Chain ${toChainId} not supported by CCIP`);
        }

        console.log('🎯 Destination selector:', destinationSelector);

        try {
          // Check if router is paused
          const isPaused = await crossChainRouter.paused();
          if (isPaused) {
            throw new Error('Cross-chain router is currently paused');
          }

          // Get the router address for DEX calls
          const routerAddress = await crossChainRouter.getRouter();
          console.log('📍 Router address:', routerAddress);

          // Create a simple path for estimation
          const path = [tokenIn, tokenOut];
          
          // Get expected output using the actual function
          const expectedOutput = await crossChainRouter.getExpectedOutput(
            tokenIn,
            tokenOut,
            amountInWei,
            routerAddress,
            path
          );
          console.log('✅ Expected output:', expectedOutput);

          // Estimate fees (simplified)
          const bridgeFeeEth = 0.001; // 0.001 ETH bridge fee estimate
          const gasFeeEth = 0.002; // 0.002 ETH gas fee estimate
          const bridgeFeeUSD = bridgeFeeEth * 2500;
          const gasFeeUSD = gasFeeEth * 2500;
          const totalFeeUSD = bridgeFeeUSD + gasFeeUSD;

          return {
            amountOut: ethers.formatEther(expectedOutput),
            gasFee: `$${gasFeeUSD.toFixed(2)}`,
            bridgeFee: `$${bridgeFeeUSD.toFixed(2)}`,
            protocolFee: '0.1%',
            totalFee: `$${totalFeeUSD.toFixed(2)}`,
            estimatedTime: '5-15min',
            confidence: 'Medium',
            route: routeType,
            priceImpact: '< 0.5%',
            isRealData: true
          };
        } catch (crossChainError: any) {
          console.error('❌ Cross-chain call failed:', crossChainError);
          throw new Error(`Cross-chain swap failed: ${crossChainError.message}`);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Contract call failed:', error);
      
      // Check if it's a connection issue
      if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network connection failed - check your internet connection');
      }
      
      // Check if it's a contract issue
      if (error.message && error.message.includes('execution reverted')) {
        throw new Error('Contract call reverted - contracts may need initialization');
      }
      
      throw new Error(`Contract error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getMockSwapQuote(
    fromChainId: number,
    toChainId: number,
    fromToken: string,
    toToken: string,
    amount: string
  ): SwapQuote | null {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return null;
      }

      // Get real token prices
      const fromPrice = getTokenPrice(fromToken, fromChainId);
      const toPrice = getTokenPrice(toToken, toChainId);
      
      // Calculate base conversion using real prices
      const fromValueUSD = amountNum * fromPrice;
      const baseToAmount = fromValueUSD / toPrice;

      // Apply realistic slippage (0.1% - 3% depending on liquidity)
      const slippagePercent = this.getRealisticSlippage(fromChainId, toChainId, fromValueUSD);
      const slippageMultiplier = 1 - (slippagePercent / 100);
      const finalToAmount = baseToAmount * slippageMultiplier;

      // Determine route type and fees
      const route = this.determineRouteType(fromChainId, toChainId);
      const fees = this.calculateRealisticFees(route, fromValueUSD, fromChainId, toChainId);

      // Calculate time estimates based on route complexity
      const timeEstimate = this.getTimeEstimate(route, fromChainId, toChainId);
      
      // Determine confidence based on liquidity and route
      const confidence = this.getConfidenceLevel(fromValueUSD, route);

      return {
        amountOut: finalToAmount.toFixed(6),
        route,
        gasFee: fees.gas,
        bridgeFee: fees.bridge,
        protocolFee: fees.protocol,
        totalFee: fees.total,
        estimatedTime: timeEstimate,
        confidence,
        priceImpact: slippagePercent.toFixed(2) + '%',
        isRealData: false,
      };
    } catch (error) {
      console.error('Error generating mock quote:', error);
      return null;
    }
  }

  private getRealisticSlippage(fromChainId: number, toChainId: number, valueUSD: number): number {
    // Lower slippage for higher value trades and more liquid pairs
    let baseSlippage = 0.5; // 0.5% base
    
    // Adjust based on trade size
    if (valueUSD < 100) {
      baseSlippage += 0.3; // Higher slippage for small trades
    } else if (valueUSD > 10000) {
      baseSlippage -= 0.2; // Lower slippage for large trades
    }
    
    // Cross-chain trades have higher slippage
    if (fromChainId !== toChainId) {
      baseSlippage += 0.4;
    }
    
    // Testnet pairs have higher slippage due to lower liquidity
    baseSlippage += 0.2;
    
    // Add some randomness for realism
    const randomFactor = (Math.random() - 0.5) * 0.4; // ±0.2%
    
    return Math.max(0.1, Math.min(3.0, baseSlippage + randomFactor));
  }

  private calculateRealisticFees(route: string, valueUSD: number, fromChainId: number, toChainId: number) {
    let gasFee = '$0.50';
    let bridgeFee = '$0.00';
    let protocolFee = '$0.00';
    
    // Gas fees vary by chain
    switch (fromChainId) {
      case 11155111: // Sepolia (Ethereum testnet)
        gasFee = valueUSD > 1000 ? '$8.50' : '$5.20';
        break;
      case 80002: // Polygon Amoy
        gasFee = '$0.15';
        break;
      case 779672: // Dispatch
        gasFee = '$0.08';
        break;
      case 397: // Echo
        gasFee = '$0.12';
        break;
      default:
        gasFee = '$0.50';
    }
    
    // Bridge fees for cross-chain - more realistic
    if (fromChainId !== toChainId) {
      if (route.includes('CCIP')) {
        bridgeFee = valueUSD > 1000 ? '$3.50' : '$2.80';
      } else if (route.includes('Teleporter')) {
        bridgeFee = valueUSD > 1000 ? '$1.20' : '$0.80';
      } else {
        bridgeFee = valueUSD > 1000 ? '$4.50' : '$3.20';
      }
    }
    
    // Protocol fees (percentage-based) - much more realistic
    const protocolFeePercent = 0.0005; // 0.05% (5 basis points)
    const protocolFeeUSD = Math.max(0.10, valueUSD * protocolFeePercent); // Minimum $0.10
    protocolFee = `$${protocolFeeUSD.toFixed(2)}`;
    
    // Calculate total
    const gasNum = parseFloat(gasFee.replace('$', ''));
    const bridgeNum = parseFloat(bridgeFee.replace('$', ''));
    const protocolNum = parseFloat(protocolFee.replace('$', ''));
    const totalNum = gasNum + bridgeNum + protocolNum;
    
    return {
      gas: gasFee,
      bridge: bridgeFee,
      protocol: protocolFee,
      total: `$${totalNum.toFixed(2)}`
    };
  }

  private getTimeEstimate(route: string, fromChainId: number, toChainId: number): string {
    if (fromChainId === toChainId) {
      return '~30 seconds';
    }
    
    switch (route) {
      case 'Teleporter':
        return '2-4 minutes';
      case 'CCIP':
        return '8-15 minutes';
      case 'Hybrid Route':
        return '5-12 minutes';
      case 'CCIP + Teleporter':
        return '10-20 minutes';
      default:
        return '5-10 minutes';
    }
  }

  private getConfidenceLevel(valueUSD: number, route: string): 'High' | 'Medium' | 'Low' {
    let score = 85; // Base confidence
    
    // Adjust based on trade size
    if (valueUSD > 10000) {
      score -= 10; // Large trades have more risk
    } else if (valueUSD < 100) {
      score -= 5; // Small trades may have higher slippage
    }
    
    // Adjust based on route complexity
    switch (route) {
      case 'Teleporter':
        score += 5; // Native Avalanche routing
        break;
      case 'CCIP':
        score += 0; // Standard cross-chain
        break;
      case 'Hybrid Route':
        score -= 5; // More complex
        break;
      case 'CCIP + Teleporter':
        score -= 10; // Most complex
        break;
    }
    
    // Add some randomness
    score += Math.floor((Math.random() - 0.5) * 10);
    
    if (score >= 85) return 'High';
    if (score >= 70) return 'Medium';
    return 'Low';
  }

  private determineRouteType(fromChainId: number, toChainId: number): SwapQuote['route'] {
    const avalancheChains = [779672, 397]; // Dispatch, Echo
    
    const isFromAvalanche = avalancheChains.includes(fromChainId);
    const isToAvalanche = avalancheChains.includes(toChainId);
    
    if (isFromAvalanche && isToAvalanche) {
      return 'Teleporter';
    } else if (isFromAvalanche && !isToAvalanche) {
      return 'Hybrid Route';
    } else if (!isFromAvalanche && isToAvalanche) {
      return 'CCIP + Teleporter';
    } else {
      return 'CCIP';
    }
  }

  async isContractDeployed(chainId: number): Promise<boolean> {
    const addresses = CONTRACT_ADDRESSES[chainId];
    return !!(addresses?.liquidityAggregator && addresses?.crossChainSwapRouter);
  }

  getContractAddresses(chainId: number) {
    return CONTRACT_ADDRESSES[chainId];
  }
} 