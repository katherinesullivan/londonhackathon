// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SwapTypes
 * @notice Shared type definitions for cross-chain routing system
 */
library SwapTypes {
    
    struct ChainInfo {
        uint256 chainId;
        bytes32 avalancheBlockchainID; // For Avalanche L1s
        uint64 chainlinkChainSelector; // For CCIP
        bool isAvalancheChain;
        address routerAddress;
        string name;
    }
    
    struct RouteStep {
        address dexRouter;
        address tokenIn;
        address tokenOut;
        uint256 expectedAmountOut;
        uint256 estimatedGas;
        bytes extraData; // For DEX-specific parameters
    }
    
    struct ChainPath {
        ChainInfo[] chains;
        RouteStep[][] stepsPerChain; // Steps to execute on each chain
    }
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
        uint256 deadline;
        ChainPath chainPath;
        RouteStep[] route; // Local route steps
        ScoringModel scoringModel;
        bytes extraData;
    }
    
    enum ScoringModel {
        MAX_OUTPUT,     // Optimize for highest output after all costs
        FASTEST_ROUTE   // Optimize for speed of execution
    }
    
    struct RouteQuote {
        uint256 expectedOutput;
        uint256 estimatedGasCost;
        uint256 estimatedTime; // in seconds
        uint256 confidence; // 0-100
        ChainPath path;
        uint256 netValue; // Output - All Costs
        ScoringModel model;
    }
    
    struct BridgeInfo {
        address bridgeContract;
        address tokenIn;
        address tokenOut;
        uint256 fee;
        uint256 estimatedTime;
    }
    
    // Events
    event RouteCalculated(
        bytes32 indexed routeId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 expectedOutput,
        ScoringModel model
    );
    
    event CrossChainSwapStarted(
        bytes32 indexed swapId,
        address indexed user,
        uint256 sourceChain,
        uint256 destinationChain,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    );
    
    event CrossChainSwapCompleted(
        bytes32 indexed swapId,
        address indexed recipient,
        uint256 amountOut,
        uint256 actualGasCost
    );
}