// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/chainlink-contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";

interface IDEXFactory {
    function getPair(address tokenA, address tokenB) external view returns (address);
}

interface IDEXRouter {
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

interface IDEXPair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/**
 * @title LiquidityAggregator
 * @notice Aggregates liquidity across multiple DEXs and chains to find optimal swap routes
 * @dev Implements HIGHEST NET VALUE routing with multi-factor optimization
 * 
 * The aggregator uses a weighted scoring system that prioritizes:
 * 1. Net Value (50%) - The actual value received after deducting ALL costs
 * 2. Liquidity Depth (20%) - Available liquidity to minimize slippage
 * 3. Gas Efficiency (15%) - Transaction cost optimization
 * 4. Expected Slippage (10%) - Price impact minimization
 * 5. DEX Reliability (5%) - Historical performance and uptime
 * 
 * HIGHEST NET VALUE = Output Value - Gas Costs - Slippage Costs - Protocol Fees
 */
contract LiquidityAggregator is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    // ============ Constants for Highest Net Value Optimization ============
    
    // Weight distribution for route scoring (must total 10000 = 100%)
    uint256 public constant NET_VALUE_WEIGHT = 5000;    // 50% - Highest net value after all costs
    uint256 public constant LIQUIDITY_WEIGHT = 2000;    // 20% - Available liquidity depth
    uint256 public constant GAS_WEIGHT = 1500;          // 15% - Gas efficiency
    uint256 public constant SLIPPAGE_WEIGHT = 1000;     // 10% - Expected slippage
    uint256 public constant RELIABILITY_WEIGHT = 500;    // 5% - DEX reliability score
    uint256 public constant WEIGHT_DENOMINATOR = 10000;

    // ============ State Variables ============
    
    struct DEXInfo {
        string name;
        address factory;
        address router;
        uint256 gasOverhead;        // Average gas used for swap
        uint256 reliabilityScore;   // 0-100 based on historical performance
        bool isActive;
        uint256 volumeTraded;       // Total volume for reputation
    }

    struct Route {
        address[] path;
        address[] dexRouters;       // Router for each hop
        uint256 expectedOutput;
        uint256 estimatedGas;
        uint256 liquidityDepth;
        uint256 priceImpact;
        uint256 netValue;          // Output value minus all costs (HIGHEST PRIORITY)
        uint256 confidence;         // 0-100 confidence score
    }

    struct LiquidityCache {
        uint256 reserve0;
        uint256 reserve1;
        uint256 lastUpdate;
        uint256 volumeLast24h;
    }

    // Chain ID => DEX Router => DEX Info
    mapping(uint256 => mapping(address => DEXInfo)) public dexInfoByChain;
    // Chain ID => Set of DEX routers
    mapping(uint256 => EnumerableSet.AddressSet) private dexListByChain;
    // DEX Router => Token A => Token B => Liquidity Cache
    mapping(address => mapping(address => mapping(address => LiquidityCache))) public liquidityCache;
    // Token => Chainlink Price Feed
    mapping(address => AggregatorV3Interface) public priceFeeds;
    // Chain ID => Current gas price
    mapping(uint256 => uint256) public chainGasPrice;
    
    uint256 public cacheValidityPeriod = 60;  // 60 seconds cache
    uint256 public maxHops = 3;                // Maximum hops in route
    uint256 public minLiquidityUSD = 10000;    // Minimum $10k liquidity
    
    // ============ Events ============
    
    event RouteFound(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 netValue,
        uint256 confidence
    );
    
    event DEXAdded(
        uint256 indexed chainId,
        address indexed router,
        string name
    );
    
    event LiquidityUpdated(
        address indexed dex,
        address indexed token0,
        address indexed token1,
        uint256 reserve0,
        uint256 reserve1
    );

    constructor() Ownable(msg.sender) ReentrancyGuard() {}

    // ============ Main Functions - Highest Net Value Routing ============

    /**
     * @notice Find the best route with HIGHEST NET VALUE optimization
     * @dev This is the main function that implements the highest net value model
     * @param chainId Chain to search on
     * @param tokenIn Input token
     * @param tokenOut Output token  
     * @param amountIn Amount to swap
     * @return bestRoute Optimal route with highest net value after all costs
     */
    function findBestRoute(
        uint256 chainId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (Route memory bestRoute) {
        Route[] memory candidates = _findAllRoutes(chainId, tokenIn, tokenOut, amountIn);
        
        if (candidates.length == 0) {
            revert("No routes found");
        }
        
        uint256 bestScore = 0;
        
        // Evaluate each route based on HIGHEST NET VALUE
        for (uint256 i = 0; i < candidates.length; i++) {
            // STEP 1: Calculate the NET VALUE (most important metric)
            uint256 outputValueUSD = _getValueInUSD(tokenOut, candidates[i].expectedOutput);
            uint256 inputValueUSD = _getValueInUSD(tokenIn, amountIn);
            uint256 gasCostUSD = _getGasCostInUSD(chainId, candidates[i].estimatedGas);
            uint256 slippageCostUSD = (inputValueUSD * candidates[i].priceImpact) / 10000;
            
            // NET VALUE = What you get - What you pay in costs
            candidates[i].netValue = outputValueUSD > (gasCostUSD + slippageCostUSD) ? 
                outputValueUSD - gasCostUSD - slippageCostUSD : 0;
            
            // STEP 2: Calculate composite score with NET VALUE as primary factor
            uint256 score = _calculateRouteScore(candidates[i], inputValueUSD);
            
            // STEP 3: Select route with highest score (primarily based on net value)
            if (score > bestScore) {
                bestScore = score;
                bestRoute = candidates[i];
            }
        }
        
        emit RouteFound(tokenIn, tokenOut, amountIn, bestRoute.netValue, bestRoute.confidence);
        return bestRoute;
    }

    /**
     * @notice Calculate weighted score for route optimization with NET VALUE priority
     * @dev Net value has 50% weight in the final score
     */
    function _calculateRouteScore(
        Route memory route,
        uint256 inputValueUSD
    ) private pure returns (uint256 score) {
        // Net value score (normalized to 0-100) - HIGHEST WEIGHT
        uint256 netValueScore = (route.netValue * 100) / inputValueUSD;
        if (netValueScore > 100) netValueScore = 100;
        
        // Liquidity depth score (logarithmic scale)
        uint256 liquidityScore = _getLiquidityScore(route.liquidityDepth, inputValueUSD);
        
        // Gas efficiency score (inverse of gas cost percentage)
        uint256 gasScore = route.estimatedGas > 0 ? 
            100 - ((route.estimatedGas * 100) / 3000000) : 100; // Assume 3M gas is worst case
            
        // Slippage score (inverse of price impact)
        uint256 slippageScore = route.priceImpact < 10000 ? 
            100 - (route.priceImpact / 100) : 0;
            
        // Reliability score (from DEX info)
        uint256 reliabilityScore = route.confidence;
        
        // Calculate weighted total with NET VALUE as primary factor (50% weight)
        score = (netValueScore * NET_VALUE_WEIGHT +      // 50% weight on net value
                liquidityScore * LIQUIDITY_WEIGHT +       // 20% weight on liquidity
                gasScore * GAS_WEIGHT +                  // 15% weight on gas
                slippageScore * SLIPPAGE_WEIGHT +        // 10% weight on slippage
                reliabilityScore * RELIABILITY_WEIGHT) /  // 5% weight on reliability
                WEIGHT_DENOMINATOR;
    }

    /**
     * @notice Calculate liquidity score using logarithmic scale
     * @dev Higher liquidity reduces slippage, improving net value
     */
    function _getLiquidityScore(uint256 liquidity, uint256 tradeSize) 
        private 
        pure 
        returns (uint256) 
    {
        if (liquidity == 0) return 0;
        
        // Ratio of liquidity to trade size
        uint256 ratio = (liquidity * 100) / tradeSize;
        
        if (ratio >= 1000) return 100;      // 10x+ liquidity = perfect score
        if (ratio >= 500) return 90;        // 5x liquidity = 90
        if (ratio >= 200) return 75;        // 2x liquidity = 75  
        if (ratio >= 100) return 50;        // 1x liquidity = 50
        return (ratio / 2);                  // Linear below 1x
    }

    // ============ Route Discovery Functions ============

    /**
     * @notice Find all possible routes between tokens
     * @dev Discovers both direct and multi-hop routes for net value comparison
     */
    function _findAllRoutes(
        uint256 chainId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) private view returns (Route[] memory) {
        Route[] memory routes = new Route[](100); // Max 100 routes
        uint256 routeCount = 0;
        
        // Direct routes
        routeCount = _findDirectRoutes(
            chainId,
            tokenIn, 
            tokenOut,
            amountIn,
            routes,
            routeCount
        );
        
        // Multi-hop routes (if enabled)
        if (maxHops >= 2) {
            routeCount = _findMultiHopRoutes(
                chainId,
                tokenIn,
                tokenOut,
                amountIn,
                routes,
                routeCount
            );
        }
        
        // Resize array to actual count
        Route[] memory finalRoutes = new Route[](routeCount);
        for (uint256 i = 0; i < routeCount; i++) {
            finalRoutes[i] = routes[i];
        }
        
        return finalRoutes;
    }

    /**
     * @notice Find direct swap routes
     */
    function _findDirectRoutes(
        uint256 chainId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        Route[] memory routes,
        uint256 startIndex
    ) private view returns (uint256 newIndex) {
        newIndex = startIndex;
        address[] memory dexList = dexListByChain[chainId].values();
        
        for (uint256 i = 0; i < dexList.length; i++) {
            DEXInfo memory dex = dexInfoByChain[chainId][dexList[i]];
            if (!dex.isActive) continue;
            
            // Check if pair exists
            address pair = IDEXFactory(dex.factory).getPair(tokenIn, tokenOut);
            if (pair == address(0)) continue;
            
            // Get liquidity info
            LiquidityCache memory cache = liquidityCache[dex.router][tokenIn][tokenOut];
            if (cache.lastUpdate + cacheValidityPeriod < block.timestamp) {
                // Cache expired, would need to fetch fresh data
                continue;
            }
            
            // Calculate expected output
            address[] memory path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
            
            try IDEXRouter(dex.router).getAmountsOut(amountIn, path) returns (uint[] memory amounts) {
                if (amounts[1] == 0) continue;
                
                // Create route
                address[] memory dexRouters = new address[](1);
                dexRouters[0] = dex.router;
                
                routes[newIndex] = Route({
                    path: path,
                    dexRouters: dexRouters,
                    expectedOutput: amounts[1],
                    estimatedGas: 150000 + dex.gasOverhead, // Base gas + DEX overhead
                    liquidityDepth: _calculateLiquidityDepth(cache.reserve0, cache.reserve1, tokenIn, tokenOut),
                    priceImpact: _calculatePriceImpact(amountIn, cache.reserve0, cache.reserve1, tokenIn == pair),
                    netValue: 0, // Calculated later in findBestRoute
                    confidence: dex.reliabilityScore
                });
                
                newIndex++;
                if (newIndex >= routes.length) break;
            } catch {
                continue;
            }
        }
        
        return newIndex;
    }

    /**
     * @notice Find multi-hop routes through intermediate tokens
     * @dev Multi-hop can improve net value by accessing better liquidity pools
     */
    function _findMultiHopRoutes(
        uint256 chainId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        Route[] memory routes,
        uint256 startIndex
    ) private view returns (uint256 newIndex) {
        newIndex = startIndex;
        
        // Common intermediate tokens (WAVAX, USDC, USDT, etc.)
        address[] memory intermediates = _getIntermediateTokens(chainId);
        address[] memory dexList = dexListByChain[chainId].values();
        
        for (uint256 i = 0; i < intermediates.length; i++) {
            address intermediate = intermediates[i];
            if (intermediate == tokenIn || intermediate == tokenOut) continue;
            
            // Try route: tokenIn -> intermediate -> tokenOut
            for (uint256 j = 0; j < dexList.length; j++) {
                DEXInfo memory dex1 = dexInfoByChain[chainId][dexList[j]];
                if (!dex1.isActive) continue;
                
                // Check first hop
                address pair1 = IDEXFactory(dex1.factory).getPair(tokenIn, intermediate);
                if (pair1 == address(0)) continue;
                
                for (uint256 k = 0; k < dexList.length; k++) {
                    DEXInfo memory dex2 = dexInfoByChain[chainId][dexList[k]];
                    if (!dex2.isActive) continue;
                    
                    // Check second hop
                    address pair2 = IDEXFactory(dex2.factory).getPair(intermediate, tokenOut);
                    if (pair2 == address(0)) continue;
                    
                    // Calculate route
                    address[] memory path = new address[](3);
                    path[0] = tokenIn;
                    path[1] = intermediate;
                    path[2] = tokenOut;
                    
                    // Get output from first DEX
                    address[] memory path1 = new address[](2);
                    path1[0] = tokenIn;
                    path1[1] = intermediate;
                    
                    try IDEXRouter(dex1.router).getAmountsOut(amountIn, path1) returns (uint[] memory amounts1) {
                        if (amounts1[1] == 0) continue;
                        
                        // Get output from second DEX
                        address[] memory path2 = new address[](2);
                        path2[0] = intermediate;
                        path2[1] = tokenOut;
                        
                        try IDEXRouter(dex2.router).getAmountsOut(amounts1[1], path2) returns (uint[] memory amounts2) {
                            if (amounts2[1] == 0) continue;
                            
                            address[] memory dexRouters = new address[](2);
                            dexRouters[0] = dex1.router;
                            dexRouters[1] = dex2.router;
                            
                            // Calculate aggregate metrics
                            uint256 totalGas = 250000 + dex1.gasOverhead + dex2.gasOverhead;
                            uint256 avgReliability = (dex1.reliabilityScore + dex2.reliabilityScore) / 2;
                            
                            routes[newIndex] = Route({
                                path: path,
                                dexRouters: dexRouters,
                                expectedOutput: amounts2[1],
                                estimatedGas: totalGas,
                                liquidityDepth: _getMinLiquidity(chainId, path, dexRouters),
                                priceImpact: _getAggregatedPriceImpact(chainId, path, dexRouters, amountIn),
                                netValue: 0, // Calculated in findBestRoute
                                confidence: avgReliability
                            });
                            
                            newIndex++;
                            if (newIndex >= routes.length) return newIndex;
                        } catch {
                            continue;
                        }
                    } catch {
                        continue;
                    }
                }
            }
        }
        
        return newIndex;
    }

    // ============ Helper Functions ============

    /**
     * @notice Get common intermediate tokens for routing
     */
    function _getIntermediateTokens(uint256 chainId) private pure returns (address[] memory) {
        address[] memory tokens = new address[](5);
        
        if (chainId == 43114) { // Avalanche
            tokens[0] = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7; // WAVAX
            tokens[1] = 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E; // USDC
            tokens[2] = 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7; // USDT
            tokens[3] = 0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB; // WETH.e
            tokens[4] = 0x50b7545627a5162F82A992c33b87aDc75187B218; // WBTC.e
        }
        // Add other chains as needed
        
        return tokens;
    }

    /**
     * @notice Calculate liquidity depth in USD
     */
    function _calculateLiquidityDepth(
        uint256 reserve0,
        uint256 reserve1,
        address token0,
        address token1
    ) private view returns (uint256) {
        uint256 value0 = _getValueInUSD(token0, reserve0);
        uint256 value1 = _getValueInUSD(token1, reserve1);
        return value0 + value1;
    }

    /**
     * @notice Calculate price impact for a trade
     */
    function _calculatePriceImpact(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut,
        bool isToken0
    ) private pure returns (uint256) {
        if (reserveIn == 0) return 10000; // 100% impact
        
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        uint256 amountOut = numerator / denominator;
        
        // Calculate price impact in basis points
        uint256 priceImpact = (amountIn * 10000) / reserveIn;
        return priceImpact > 10000 ? 10000 : priceImpact;
    }

    /**
     * @notice Get minimum liquidity across multi-hop route
     */
    function _getMinLiquidity(
        uint256 chainId,
        address[] memory path,
        address[] memory dexRouters
    ) private view returns (uint256 minLiquidity) {
        minLiquidity = type(uint256).max;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            LiquidityCache memory cache = liquidityCache[dexRouters[i]][path[i]][path[i+1]];
            uint256 liquidity = _calculateLiquidityDepth(
                cache.reserve0,
                cache.reserve1,
                path[i],
                path[i+1]
            );
            
            if (liquidity < minLiquidity) {
                minLiquidity = liquidity;
            }
        }
    }

    /**
     * @notice Get aggregated price impact for multi-hop
     */
    function _getAggregatedPriceImpact(
        uint256 chainId,
        address[] memory path,
        address[] memory dexRouters,
        uint256 initialAmount
    ) private view returns (uint256 totalImpact) {
        uint256 currentAmount = initialAmount;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            DEXInfo memory dex = dexInfoByChain[chainId][dexRouters[i]];
            address pair = IDEXFactory(dex.factory).getPair(path[i], path[i+1]);
            
            if (pair != address(0)) {
                (uint112 reserve0, uint112 reserve1,) = IDEXPair(pair).getReserves();
                bool isToken0 = IDEXPair(pair).token0() == path[i];
                
                uint256 impact = _calculatePriceImpact(
                    currentAmount,
                    isToken0 ? reserve0 : reserve1,
                    isToken0 ? reserve1 : reserve0,
                    isToken0
                );
                
                totalImpact += impact;
                
                // Update amount for next hop
                address[] memory subPath = new address[](2);
                subPath[0] = path[i];
                subPath[1] = path[i+1];
                
                try IDEXRouter(dexRouters[i]).getAmountsOut(currentAmount, subPath) 
                    returns (uint[] memory amounts) {
                    currentAmount = amounts[1];
                } catch {
                    currentAmount = 0;
                    break;
                }
            }
        }
    }

    /**
     * @notice Get token value in USD using Chainlink price feeds
     * @dev Critical for net value calculation
     */
    function _getValueInUSD(address token, uint256 amount) private view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[token];
        if (address(priceFeed) == address(0)) return 0;
        
        try priceFeed.latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256,
            uint80
        ) {
            if (price <= 0) return 0;
            return (amount * uint256(price)) / (10 ** priceFeed.decimals());
        } catch {
            return 0;
        }
    }

    /**
     * @notice Get gas cost in USD
     * @dev Essential for net value calculation
     */
    function _getGasCostInUSD(uint256 chainId, uint256 gasUsed) private view returns (uint256) {
        uint256 gasPrice = chainGasPrice[chainId];
        if (gasPrice == 0) gasPrice = 25 gwei; // Default
        
        uint256 gasCostWei = gasUsed * gasPrice;
        
        // Get native token price (e.g., AVAX)
        address nativeToken = _getNativeToken(chainId);
        return _getValueInUSD(nativeToken, gasCostWei);
    }

    /**
     * @notice Get native token address for chain
     */
    function _getNativeToken(uint256 chainId) private pure returns (address) {
        if (chainId == 43114) return 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7; // WAVAX
        if (chainId == 1) return 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH
        if (chainId == 137) return 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270; // WMATIC
        return address(0);
    }

    // ============ Admin Functions ============

    /**
     * @notice Add DEX to aggregator
     */
    function addDEX(
        uint256 chainId,
        string memory name,
        address factory,
        address router,
        uint256 gasOverhead,
        uint256 reliabilityScore
    ) external onlyOwner {
        require(reliabilityScore <= 100, "Invalid reliability score");
        
        dexInfoByChain[chainId][router] = DEXInfo({
            name: name,
            factory: factory,
            router: router,
            gasOverhead: gasOverhead,
            reliabilityScore: reliabilityScore,
            isActive: true,
            volumeTraded: 0
        });
        
        dexListByChain[chainId].add(router);
        emit DEXAdded(chainId, router, name);
    }

    /**
     * @notice Update liquidity cache
     */
    function updateLiquidityCache(
        address dexRouter,
        address token0,
        address token1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 volume24h
    ) external {
        liquidityCache[dexRouter][token0][token1] = LiquidityCache({
            reserve0: reserve0,
            reserve1: reserve1,
            lastUpdate: block.timestamp,
            volumeLast24h: volume24h
        });
        
        // Also update reverse mapping
        liquidityCache[dexRouter][token1][token0] = LiquidityCache({
            reserve0: reserve1,
            reserve1: reserve0,
            lastUpdate: block.timestamp,
            volumeLast24h: volume24h
        });
        
        emit LiquidityUpdated(dexRouter, token0, token1, reserve0, reserve1);
    }

    /**
     * @notice Set price feed for token
     */
    function setPriceFeed(address token, address feed) external onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(feed);
    }

    /**
     * @notice Update gas price for chain
     */
    function updateGasPrice(uint256 chainId, uint256 gasPrice) external onlyOwner {
        chainGasPrice[chainId] = gasPrice;
    }

    /**
     * @notice Set cache validity period
     */
    function setCacheValidityPeriod(uint256 period) external onlyOwner {
        cacheValidityPeriod = period;
    }

    /**
     * @notice Set maximum hops allowed
     */
    function setMaxHops(uint256 _maxHops) external onlyOwner {
        require(_maxHops <= 4, "Too many hops");
        maxHops = _maxHops;
    }

    /**
     * @notice Toggle DEX active status
     */
    function setDEXActive(uint256 chainId, address router, bool active) external onlyOwner {
        dexInfoByChain[chainId][router].isActive = active;
    }

    // ============ View Functions ============

    /**
     * @notice Get all active DEXs for a chain
     */
    function getActiveDEXs(uint256 chainId) external view returns (address[] memory) {
        return dexListByChain[chainId].values();
    }

    /**
     * @notice Calculate route efficiency score (for external use)
     * @dev Returns both efficiency percentage and net value in USD
     */
    function getRouteEfficiency(
        uint256 chainId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address[] calldata path,
        address[] calldata dexRouters
    ) external view returns (uint256 efficiency, uint256 netValue) {
        // Calculate expected output
        uint256 expectedOutput = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            address[] memory subPath = new address[](2);
            subPath[0] = path[i];
            subPath[1] = path[i + 1];
            
            try IDEXRouter(dexRouters[i]).getAmountsOut(expectedOutput, subPath) 
                returns (uint[] memory amounts) {
                expectedOutput = amounts[1];
            } catch {
                return (0, 0);
            }
        }
        
        // Calculate costs
        uint256 totalGas = 150000 * (path.length - 1);
        uint256 outputValueUSD = _getValueInUSD(tokenOut, expectedOutput);
        uint256 gasCostUSD = _getGasCostInUSD(chainId, totalGas);
        
        // NET VALUE = Output - Costs
        netValue = outputValueUSD > gasCostUSD ? outputValueUSD - gasCostUSD : 0;
        
        // Efficiency = (Net Value / Input Value) * 100
        efficiency = (netValue * 100) / _getValueInUSD(tokenIn, amountIn);
    }
}