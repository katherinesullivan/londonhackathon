// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SwapTypes.sol";

/**
 * @title Teleporter Messenger Interface
 * @notice Interface for Avalanche Teleporter messaging
 */
interface ITeleporterMessenger {
    struct TeleporterMessageInput {
        bytes32 destinationBlockchainID;
        address destinationAddress;
        TeleporterFeeInfo feeInfo;
        uint256 requiredGasLimit;
        address[] allowedRelayerAddresses;
        bytes message;
    }

    struct TeleporterFeeInfo {
        address feeTokenAddress;
        uint256 amount;
    }

    function sendCrossChainMessage(
        TeleporterMessageInput calldata messageInput
    ) external returns (bytes32 messageID);
}

/**
 * @title Teleporter Receiver Interface  
 */
interface ITeleporterReceiver {
    function receiveTeleporterMessage(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        bytes calldata message
    ) external;
}

/**
 * @title Fuji Forwarder Interface
 * @notice Interface for the hub forwarder contract
 */
interface IFujiForwarder {
    function forwardToExternalChain(
        bytes32 swapId,
        SwapTypes.SwapParams calldata params,
        address bridgeToken,
        uint256 amount
    ) external;
    
    function forwardToAvalancheL1(
        bytes32 swapId,
        SwapTypes.SwapParams calldata params,
        address token,
        uint256 amount
    ) external;
}

/**
 * @title Route Executor Interface
 * @notice Interface for executing pre-calculated routes
 */
interface IRouteExecutor {
    function executeRoute(
        SwapTypes.RouteQuote calldata quote,
        SwapTypes.SwapParams calldata params,
        bytes calldata signature
    ) external payable returns (uint256 amountOut);
    
    function verifyRouteSignature(
        SwapTypes.RouteQuote calldata quote,
        bytes calldata signature
    ) external view returns (bool);
}

/**
 * @title Cross Chain Router Interface
 * @notice Common interface for all router implementations
 */
interface ICrossChainRouter {
    function initiateSwap(
        SwapTypes.SwapParams calldata params
    ) external payable returns (bytes32 swapId);
    
    function getExpectedOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        SwapTypes.ChainPath calldata path
    ) external view returns (uint256 expectedOut);
    
    function getSupportedTokens() external view returns (address[] memory);
    
    function getSupportedChains() external view returns (SwapTypes.ChainInfo[] memory);
}

/**
 * @title DEX Router Interface
 * @notice Unified interface for different DEX routers
 */
interface IDEXRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
        
    function factory() external pure returns (address);
}

/**
 * @title Price Feed Interface
 * @notice Chainlink-compatible price feed interface
 */
interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        );
        
    function decimals() external view returns (uint8);
}