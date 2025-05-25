export interface ContractAddresses {
  [chainId: number]: {
    liquidityAggregator?: string;
    crossChainSwapRouter?: string;
    ccipRouter?: string;
    teleporter?: string;
  };
}

// Contract addresses for different networks
export const CONTRACT_ADDRESSES: ContractAddresses = {
  // Fuji Testnet (43113) - DEPLOYED!
  43113: {
    ccipRouter: '0x554472a2720E5E7D5D3C817529aBA05EEd5F82D8',
    teleporter: '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf',
    liquidityAggregator: '0xaB01AF7ecf4F4D2b8cAAA64b6f8b97f9a0186464', // DEPLOYED!
    crossChainSwapRouter: '0xCa002d1F05FE44AdeBA62f3b5bfe304DC9B2687A', // DEPLOYED!
  },
  // Arbitrum Sepolia (421614)
  421614: {
    ccipRouter: '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165',
    // These will be filled after deployment
    liquidityAggregator: undefined,
    crossChainSwapRouter: undefined,
  },
  // Base Sepolia (84532) 
  84532: {
    ccipRouter: '0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93',
    // These will be filled after deployment
    liquidityAggregator: undefined,
    crossChainSwapRouter: undefined,
  },
  // Polygon Amoy (80002)
  80002: {
    ccipRouter: '0x9C32fCB86BF0f4a1A8921a9Fe46de3198bb884B2',
    // These will be filled after deployment
    liquidityAggregator: undefined,
    crossChainSwapRouter: undefined,
  },
  // Dexalot Testnet (432201) - Avalanche L1
  432201: {
    // Dexalot specific addresses will be configured
    liquidityAggregator: '0xaB01AF7ecf4F4D2b8cAAA64b6f8b97f9a0186464', // Same as Fuji for now
    crossChainSwapRouter: '0xCa002d1F05FE44AdeBA62f3b5bfe304DC9B2687A', // Same as Fuji for now
  },
  // Local Anvil (31337)
  31337: {
    ccipRouter: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    teleporter: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    // These will be filled after deployment
    liquidityAggregator: undefined,
    crossChainSwapRouter: undefined,
  },
};

// RPC URLs for different networks
export const RPC_URLS: { [chainId: number]: string } = {
  43113: 'https://api.avax-test.network/ext/bc/C/rpc', // Fuji
  421614: 'https://sepolia-rollup.arbitrum.io/rpc', // Arbitrum Sepolia
  84532: 'https://sepolia.base.org', // Base Sepolia
  80002: 'https://rpc-amoy.polygon.technology', // Polygon Amoy
  432201: 'https://subnets.avax.network/dexalot/testnet/rpc', // Dexalot
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
  43113: '14767482510784806043', // Fuji
  421614: '3478487238524512106', // Arbitrum Sepolia  
  84532: '10344971235874465080', // Base Sepolia
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
      // Always try to get real data from Fuji C-chain contracts
      const realQuote = await this.getRealSwapQuote(fromChainId, toChainId, tokenIn, tokenOut, amountIn);
      if (realQuote) {
        return { ...realQuote, isRealData: true };
      }
      
      // If real data fails, return null instead of mock data
      return null;
    } catch (error) {
      console.error('Failed to get swap quote from contracts:', error);
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

  private determineRouteType(fromChainId: number, toChainId: number): SwapQuote['route'] {
    const avalancheChains = [43113, 779672, 5050502, 432201]; // Fuji, Dispatch, XPLA, Dexalot
    
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