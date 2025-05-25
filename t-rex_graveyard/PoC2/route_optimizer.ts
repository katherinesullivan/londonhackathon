import { ethers } from 'ethers';

// Core types for routing
interface ChainInfo {
  chainId: number;
  avalancheBlockchainID?: string;
  chainlinkChainSelector?: string;
  isAvalancheChain: boolean;
  routerAddress: string;
  name: string;
}

interface RouteStep {
  dexRouter: string;
  tokenIn: string;
  tokenOut: string;
  expectedAmountOut: string;
  estimatedGas: string;
  extraData: string;
}

interface ChainPath {
  chains: ChainInfo[];
  stepsPerChain: RouteStep[][];
}

interface RouteQuote {
  expectedOutput: string;
  estimatedGasCost: string;
  estimatedTimeSeconds: string;
  confidence: number;
  path: ChainPath;
  netValueUSD: string;
  model: ScoringModel;
}

enum ScoringModel {
  MAX_OUTPUT = 0,
  FASTEST_ROUTE = 1
}

// Chain configurations with DEX information
interface DexInfo {
  name: string;
  router: string;
  avgGas: number;
}

interface ChainConfig {
  name: string;
  rpc: string;
  isAvalancheChain: boolean;
  avalancheBlockchainID?: string;
  chainlinkChainSelector?: string;
  routerAddress: string;
  bridgeTokens: string[];
  dexes: DexInfo[];
  tokens: Record<string, string>;
}

const CHAIN_CONFIG: Record<number, ChainConfig> = {
  // Avalanche Fuji C-Chain
  43113: {
    name: 'Avalanche Fuji C-Chain',
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    isAvalancheChain: true,
    avalancheBlockchainID: '0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5',
    chainlinkChainSelector: '14767482510784806043',
    routerAddress: '0x1234567890123456789012345678901234567890', // Placeholder
    bridgeTokens: ['USDC', 'WAVAX'],
    dexes: [
      { name: 'TraderJoe', router: '0x2D99ABD9008Dc933ff5c0CD271B88309593aB921', avgGas: 150000 },
      { name: 'Pangolin', router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', avgGas: 140000 }
    ],
    tokens: {
      USDC: '0x5425890298aed601595a70AB815c96711a31Bc65',
      WAVAX: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c'
    }
  },
  
  // Arbitrum Sepolia
  421614: {
    name: 'Arbitrum Sepolia',
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    isAvalancheChain: false,
    chainlinkChainSelector: '3478487238524512106',
    routerAddress: '0x2345678901234567890123456789012345678901', // Placeholder
    bridgeTokens: ['USDC'],
    dexes: [
      { name: 'Uniswap V2', router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', avgGas: 160000 },
      { name: 'SushiSwap', router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', avgGas: 155000 }
    ],
    tokens: {
      USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      WETH: '0xE591bf0A0CF924A0674d7792db046B23CEbF5f34'
    }
  },

  // Polygon Amoy
  80002: {
    name: 'Polygon Amoy',
    rpc: 'https://rpc-amoy.polygon.technology',
    isAvalancheChain: false,
    chainlinkChainSelector: '16281711391670634445',
    routerAddress: '0x3456789012345678901234567890123456789012', // Placeholder
    bridgeTokens: ['USDC'],
    dexes: [
      { name: 'QuickSwap', router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', avgGas: 145000 },
      { name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', avgGas: 150000 }
    ],
    tokens: {
      USDC: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
    }
  }
};

// Gas prices and bridge times (in seconds)
const BRIDGE_CONFIG = {
  TELEPORTER: { avgGas: 200000, avgTimeSeconds: 60, costUSD: 0.5 },
  CCIP: { avgGas: 300000, avgTimeSeconds: 300, costUSD: 5.0 }
};

export class CrossChainRouteOptimizer {
  private priceCache: Map<string, number> = new Map();

  /**
   * Find optimal route for cross-chain swap
   */
  async findOptimalRoute(
    fromChain: number,
    toChain: number,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    scoringModel: ScoringModel = ScoringModel.MAX_OUTPUT
  ): Promise<RouteQuote> {
    console.log(`Finding route: ${fromChain} → ${toChain}, ${tokenIn} → ${tokenOut}, Amount: ${amountIn}`);

    // Generate all possible routes (up to 4 hops)
    const allRoutes = await this.generateAllRoutes(fromChain, toChain, tokenIn, tokenOut);
    
    // Score each route
    const scoredRoutes = await Promise.all(
      allRoutes.map(route => this.scoreRoute(route, amountIn, scoringModel))
    );

    // Select best route based on scoring model
    const bestRoute = this.selectBestRoute(scoredRoutes, scoringModel);
    
    if (!bestRoute) {
      throw new Error('No viable route found');
    }

    console.log(`Best route found with ${bestRoute.path.chains.length} chains, ${ScoringModel[scoringModel]} model`);
    return bestRoute;
  }

  /**
   * Generate all possible routes (direct, via hub, multi-hop)
   */
  private async generateAllRoutes(
    fromChain: number,
    toChain: number,
    tokenIn: string,
    tokenOut: string
  ): Promise<ChainPath[]> {
    const routes: ChainPath[] = [];

    // Route 1: Same chain (local swap only)
    if (fromChain === toChain) {
      const localRoute = this.createLocalRoute(fromChain, tokenIn, tokenOut);
      if (localRoute) routes.push(localRoute);
    } else {
      // Route 2: Direct cross-chain (source → destination)
      const directRoute = this.createDirectRoute(fromChain, toChain, tokenIn, tokenOut);
      if (directRoute) routes.push(directRoute);

      // Route 3: Via Fuji hub (source → Fuji → destination)
      if (fromChain !== 43113 && toChain !== 43113) {
        const hubRoute = this.createHubRoute(fromChain, toChain, tokenIn, tokenOut);
        if (hubRoute) routes.push(hubRoute);
      }
    }

    return routes.filter(route => route !== null);
  }

  /**
   * Create local route (same chain swap)
   */
  private createLocalRoute(chainId: number, tokenIn: string, tokenOut: string): ChainPath | null {
    const config = CHAIN_CONFIG[chainId];
    if (!config) return null;

    const chainInfo: ChainInfo = {
      chainId,
      avalancheBlockchainID: config.avalancheBlockchainID,
      chainlinkChainSelector: config.chainlinkChainSelector,
      isAvalancheChain: config.isAvalancheChain,
      routerAddress: config.routerAddress,
      name: config.name
    };

    const swapStep = this.createSwapStep(chainId, tokenIn, tokenOut);
    
    return {
      chains: [chainInfo],
      stepsPerChain: [swapStep ? [swapStep] : []]
    };
  }

  /**
   * Create direct cross-chain route
   */
  private createDirectRoute(fromChain: number, toChain: number, tokenIn: string, tokenOut: string): ChainPath | null {
    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig = CHAIN_CONFIG[toChain];
    
    if (!fromConfig || !toConfig) return null;

    // Check if direct bridging is possible
    const bridgeToken = this.findCommonBridgeToken(fromChain, toChain);
    if (!bridgeToken) return null;

    const fromChainInfo: ChainInfo = {
      chainId: fromChain,
      avalancheBlockchainID: fromConfig.avalancheBlockchainID,
      chainlinkChainSelector: fromConfig.chainlinkChainSelector,
      isAvalancheChain: fromConfig.isAvalancheChain,
      routerAddress: fromConfig.routerAddress,
      name: fromConfig.name
    };

    const toChainInfo: ChainInfo = {
      chainId: toChain,
      avalancheBlockchainID: toConfig.avalancheBlockchainID,
      chainlinkChainSelector: toConfig.chainlinkChainSelector,
      isAvalancheChain: toConfig.isAvalancheChain,
      routerAddress: toConfig.routerAddress,
      name: toConfig.name
    };

    // Create steps for each chain
    const fromSteps: RouteStep[] = [];
    const toSteps: RouteStep[] = [];

    // Source chain: swap to bridge token if needed
    if (tokenIn !== this.getTokenAddress(fromChain, bridgeToken)) {
      const step = this.createSwapStep(fromChain, tokenIn, this.getTokenAddress(fromChain, bridgeToken));
      if (step) fromSteps.push(step);
    }

    // Destination chain: swap from bridge token if needed
    if (this.getTokenAddress(toChain, bridgeToken) !== tokenOut) {
      const step = this.createSwapStep(toChain, this.getTokenAddress(toChain, bridgeToken), tokenOut);
      if (step) toSteps.push(step);
    }

    return {
      chains: [fromChainInfo, toChainInfo],
      stepsPerChain: [fromSteps, toSteps]
    };
  }

  /**
   * Create hub route via Fuji C-Chain
   */
  private createHubRoute(fromChain: number, toChain: number, tokenIn: string, tokenOut: string): ChainPath | null {
    const fujiConfig = CHAIN_CONFIG[43113];
    
    const fujiChainInfo: ChainInfo = {
      chainId: 43113,
      avalancheBlockchainID: fujiConfig.avalancheBlockchainID,
      chainlinkChainSelector: fujiConfig.chainlinkChainSelector,
      isAvalancheChain: fujiConfig.isAvalancheChain,
      routerAddress: fujiConfig.routerAddress,
      name: fujiConfig.name
    };

    // Find bridge tokens
    const fromBridgeToken = this.findCommonBridgeToken(fromChain, 43113);
    const toBridgeToken = this.findCommonBridgeToken(43113, toChain);
    
    if (!fromBridgeToken || !toBridgeToken) return null;

    // Create route: source → Fuji → destination
    const fromRoute = this.createDirectRoute(fromChain, 43113, tokenIn, this.getTokenAddress(43113, fromBridgeToken));
    const toRoute = this.createDirectRoute(43113, toChain, this.getTokenAddress(43113, toBridgeToken), tokenOut);

    if (!fromRoute || !toRoute) return null;

    // Combine routes through Fuji
    const fujiSteps: RouteStep[] = [];
    if (fromBridgeToken !== toBridgeToken) {
      const step = this.createSwapStep(43113, this.getTokenAddress(43113, fromBridgeToken), this.getTokenAddress(43113, toBridgeToken));
      if (step) fujiSteps.push(step);
    }

    return {
      chains: [fromRoute.chains[0], fujiChainInfo, toRoute.chains[1]],
      stepsPerChain: [
        fromRoute.stepsPerChain[0],
        fujiSteps,
        toRoute.stepsPerChain[1]
      ]
    };
  }

  /**
   * Create swap step for DEX
   */
  private createSwapStep(chainId: number, tokenIn: string, tokenOut: string): RouteStep | null {
    const config = CHAIN_CONFIG[chainId];
    if (!config || tokenIn === tokenOut) return null;

    // Find best DEX based on simulated output
    let bestDex = config.dexes[0];
    let bestOutput = '0';

    for (const dex of config.dexes) {
      const simulatedOutput = this.simulateSwapOutput(tokenIn, tokenOut, '1000000', dex.router);
      if (parseFloat(simulatedOutput) > parseFloat(bestOutput)) {
        bestOutput = simulatedOutput;
        bestDex = dex;
      }
    }

    return {
      dexRouter: bestDex.router,
      tokenIn,
      tokenOut,
      expectedAmountOut: bestOutput,
      estimatedGas: bestDex.avgGas.toString(),
      extraData: '0x'
    };
  }

  /**
   * Score a route based on the selected model
   */
  private async scoreRoute(route: ChainPath, amountIn: string, model: ScoringModel): Promise<RouteQuote> {
    const expectedOutput = this.calculateExpectedOutput(route, amountIn);
    const estimatedGas = this.calculateTotalGas(route);
    const estimatedTime = this.calculateTotalTime(route);
    const confidence = this.calculateConfidence(route);
    
    // Calculate costs
    const gasCostUSD = await this.calculateGasCostUSD(route, estimatedGas);
    const bridgeCostUSD = this.calculateBridgeCosts(route);
    const totalCostUSD = gasCostUSD + bridgeCostUSD;
    
    // Get output value in USD (simplified to 1:1 for demo)
    const outputValueUSD = parseFloat(expectedOutput);
    const netValueUSD = Math.max(0, outputValueUSD - totalCostUSD);

    return {
      expectedOutput,
      estimatedGasCost: estimatedGas,
      estimatedTimeSeconds: estimatedTime.toString(),
      confidence,
      path: route,
      netValueUSD: netValueUSD.toString(),
      model
    };
  }

  /**
   * Select best route based on scoring model
   */
  private selectBestRoute(routes: RouteQuote[], model: ScoringModel): RouteQuote | null {
    if (routes.length === 0) return null;

    return routes.reduce((best, current) => {
      if (model === ScoringModel.MAX_OUTPUT) {
        return parseFloat(current.netValueUSD) > parseFloat(best.netValueUSD) ? current : best;
      } else {
        return parseInt(current.estimatedTimeSeconds) < parseInt(best.estimatedTimeSeconds) ? current : best;
      }
    });
  }

  // Helper methods for calculations
  private calculateExpectedOutput(route: ChainPath, amountIn: string): string {
    let currentAmount = parseFloat(amountIn);
    
    for (let i = 0; i < route.stepsPerChain.length; i++) {
      for (const step of route.stepsPerChain[i]) {
        // Apply DEX fee (0.3% typical)
        currentAmount = currentAmount * 0.997;
      }
    }
    
    return currentAmount.toString();
  }

  private calculateTotalGas(route: ChainPath): string {
    let totalGas = 0;
    
    // Gas for swaps
    for (const steps of route.stepsPerChain) {
      for (const step of steps) {
        totalGas += parseInt(step.estimatedGas);
      }
    }
    
    // Gas for bridges
    for (let i = 1; i < route.chains.length; i++) {
      const prevChain = route.chains[i-1];
      const currentChain = route.chains[i];
      
      if (prevChain.isAvalancheChain && currentChain.isAvalancheChain) {
        totalGas += BRIDGE_CONFIG.TELEPORTER.avgGas;
      } else {
        totalGas += BRIDGE_CONFIG.CCIP.avgGas;
      }
    }
    
    return totalGas.toString();
  }

  private calculateTotalTime(route: ChainPath): number {
    let totalTime = 0;
    
    // Time for swaps (15 seconds each)
    for (const steps of route.stepsPerChain) {
      totalTime += steps.length * 15;
    }
    
    // Time for bridges
    for (let i = 1; i < route.chains.length; i++) {
      const prevChain = route.chains[i-1];
      const currentChain = route.chains[i];
      
      if (prevChain.isAvalancheChain && currentChain.isAvalancheChain) {
        totalTime += BRIDGE_CONFIG.TELEPORTER.avgTimeSeconds;
      } else {
        totalTime += BRIDGE_CONFIG.CCIP.avgTimeSeconds;
      }
    }
    
    return totalTime;
  }

  private calculateConfidence(route: ChainPath): number {
    let confidence = 100;
    
    // Reduce for each additional chain
    confidence -= (route.chains.length - 1) * 10;
    
    // Reduce for each swap step
    const totalSteps = route.stepsPerChain.reduce((sum, steps) => sum + steps.length, 0);
    confidence -= totalSteps * 5;
    
    return Math.max(60, confidence);
  }

  private async calculateGasCostUSD(route: ChainPath, totalGas: string): Promise<number> {
    // Simplified gas cost calculation ($0.50 per 100k gas)
    return (parseFloat(totalGas) / 100000) * 0.5;
  }

  private calculateBridgeCosts(route: ChainPath): number {
    let totalCost = 0;
    
    for (let i = 1; i < route.chains.length; i++) {
      const prevChain = route.chains[i-1];
      const currentChain = route.chains[i];
      
      if (prevChain.isAvalancheChain && currentChain.isAvalancheChain) {
        totalCost += BRIDGE_CONFIG.TELEPORTER.costUSD;
      } else {
        totalCost += BRIDGE_CONFIG.CCIP.costUSD;
      }
    }
    
    return totalCost;
  }

  private findCommonBridgeToken(fromChain: number, toChain: number): string | null {
    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig = CHAIN_CONFIG[toChain];
    
    if (!fromConfig || !toConfig) return null;
    
    // Find common bridge token (prefer USDC)
    const commonTokens = fromConfig.bridgeTokens.filter(token => 
      toConfig.bridgeTokens.includes(token)
    );
    
    if (commonTokens.includes('USDC')) return 'USDC';
    return commonTokens[0] || null;
  }

  private getTokenAddress(chainId: number, tokenSymbol: string): string {
    const config = CHAIN_CONFIG[chainId];
    return config?.tokens[tokenSymbol] || '';
  }

  private simulateSwapOutput(tokenIn: string, tokenOut: string, amountIn: string, dexRouter: string): string {
    // Simplified simulation (0.3% DEX fee)
    return (parseFloat(amountIn) * 0.997).toString();
  }

  /**
   * Sign route quote for verification
   */
  signRouteQuote(quote: RouteQuote, privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'string', 'string', 'uint256', 'uint8'],
        [
          quote.expectedOutput,
          quote.estimatedGasCost,
          quote.estimatedTimeSeconds,
          Math.floor(Date.now() / 1000),
          quote.model
        ]
      )
    );
    
    return wallet.signMessageSync(ethers.getBytes(messageHash));
  }
}

// Example usage
async function example() {
  const optimizer = new CrossChainRouteOptimizer();
  
  try {
    const quote = await optimizer.findOptimalRoute(
      421614, // Arbitrum Sepolia
      80002,  // Polygon Amoy
      '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // ARB USDC
      '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // POLYGON USDC
      '1000000', // 1 USDC
      ScoringModel.MAX_OUTPUT
    );
    
    console.log(`Expected output: ${quote.expectedOutput}`);
    console.log(`Net value: $${quote.netValueUSD}`);
    console.log(`Time: ${quote.estimatedTimeSeconds}s`);
    console.log(`Confidence: ${quote.confidence}%`);
    
  } catch (error) {
    console.error('Route optimization failed:', error);
  }
}

if (require.main === module) {
  example();
}