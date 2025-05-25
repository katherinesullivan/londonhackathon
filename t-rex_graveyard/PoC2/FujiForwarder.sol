// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../lib/chainlink-contracts/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "../../lib/chainlink-contracts/src/v0.8/ccip/libraries/Client.sol";
import "../../lib/chainlink-contracts/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Interfaces for external contracts
interface ITeleporterMessenger {
    struct TeleporterFeeInfo {
        address feeTokenAddress;
        uint256 amount;
    }
    
    struct TeleporterMessageInput {
        bytes32 destinationBlockchainID;
        address destinationAddress;
        TeleporterFeeInfo feeInfo;
        uint256 requiredGasLimit;
        address[] allowedRelayerAddresses;
        bytes message;
    }
    
    function sendCrossChainMessage(TeleporterMessageInput calldata messageInput) external;
}

interface ITeleporterReceiver {
    function receiveTeleporterMessage(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        bytes calldata message
    ) external;
}

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
}

/**
 * @title FujiForwarder
 * @notice Hub contract on Fuji C-Chain that bridges between Avalanche and external chains
 * @dev Receives from both Teleporter (Avalanche L1s) and CCIP (external chains), then forwards appropriately
 */
contract FujiForwarder is 
    ITeleporterReceiver, 
    CCIPReceiver, 
    Ownable, 
    ReentrancyGuard, 
    Pausable 
{
    using SafeERC20 for IERC20;

    ITeleporterMessenger public immutable teleporter;
    
    uint256 public constant PROTOCOL_FEE_BPS = 5; // 0.05% hub fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_GAS_LIMIT = 200000;
    
    address public feeRecipient;
    mapping(uint64 => bool) public supportedCCIPChains;
    mapping(bytes32 => bool) public supportedAvalancheChains;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => SwapInfo) public swapInfo;
    
    // Hardcoded constants for testnet
    address public constant FUJI_USDC = 0x5425890298aed601595a70AB815c96711a31Bc65;
    address public constant FUJI_WAVAX = 0xd00ae08403B9bbb9124bB305C09058E32C39A48c;
    address public constant TRADERJOE_ROUTER = 0x2D99ABD9008Dc933ff5c0CD271B88309593aB921;
    address public constant CCIP_ROUTER_FUJI = 0xF694E193200268f9a4868e4Aa017A0118C9a8177;
    
    // Chain selectors
    uint64 public constant ARBITRUM_SEPOLIA_SELECTOR = 3478487238524512106;
    uint64 public constant POLYGON_AMOY_SELECTOR = 16281711391670634445;
    
    struct SwapInfo {
        address user;
        address originalSender;
        address tokenOut;
        uint256 minAmountOut;
        address recipient;
        uint256 deadline;
        bytes routeData;
        bool isFromAvalanche;
        bool processed;
    }
    
    // Events
    event TokensReceivedFromAvalanche(
        bytes32 indexed swapId,
        bytes32 sourceChain,
        address token,
        uint256 amount
    );
    
    event TokensReceivedFromExternal(
        bytes32 indexed swapId,
        uint64 sourceChain,
        address token,
        uint256 amount
    );
    
    event TokensForwardedToExternal(
        bytes32 indexed swapId,
        uint64 destinationChain,
        address token,
        uint256 amount
    );
    
    event TokensForwardedToAvalanche(
        bytes32 indexed swapId,
        bytes32 destinationChain,
        address token,
        uint256 amount
    );

    constructor(
        address _teleporter,
        address _feeRecipient
    ) CCIPReceiver(CCIP_ROUTER_FUJI) Ownable(msg.sender) {
        teleporter = ITeleporterMessenger(_teleporter);
        feeRecipient = _feeRecipient;
        
        // Add supported tokens
        supportedTokens[FUJI_USDC] = true;
        supportedTokens[FUJI_WAVAX] = true;
        
        // Add supported chains
        supportedCCIPChains[ARBITRUM_SEPOLIA_SELECTOR] = true;
        supportedCCIPChains[POLYGON_AMOY_SELECTOR] = true;
    }

    /**
     * @notice Receive tokens from Avalanche L1s via Teleporter
     */
    function receiveTeleporterMessage(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        bytes calldata message
    ) external override {
        require(msg.sender == address(teleporter), "Unauthorized teleporter caller");
        require(supportedAvalancheChains[sourceBlockchainID], "Unsupported source chain");
        
        (
            bytes32 swapId,
            address originalSender,
            address tokenOut,
            uint256 minAmountOut,
            address recipient,
            uint256 deadline,
            bytes memory routeData
        ) = abi.decode(message, (bytes32, address, address, uint256, address, uint256, bytes));
        
        // Decode route data to determine if this goes to external chain
        (bool goesToExternal, uint64 externalChainSelector, address tokenIn, uint256 amountIn) = 
            _decodeRouteData(routeData);
        
        // Store swap info
        swapInfo[swapId] = SwapInfo({
            user: originSenderAddress,
            originalSender: originalSender,
            tokenOut: tokenOut,
            minAmountOut: minAmountOut,
            recipient: recipient,
            deadline: deadline,
            routeData: routeData,
            isFromAvalanche: true,
            processed: false
        });
        
        emit TokensReceivedFromAvalanche(swapId, sourceBlockchainID, tokenIn, amountIn);
        
        if (goesToExternal) {
            _forwardToExternalChain(swapId, externalChainSelector, tokenIn, amountIn);
        } else {
            _processLocalCompletion(swapId, tokenIn, amountIn);
        }
    }

    /**
     * @notice Receive tokens from external chains via CCIP
     */
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        uint64 sourceChainSelector = message.sourceChainSelector;
        require(supportedCCIPChains[sourceChainSelector], "Unsupported source chain");
        
        // Decode message data
        (
            bytes32 swapId,
            address originalSender,
            address tokenOut,
            uint256 minAmountOut,
            address recipient,
            uint256 deadline,
            bytes memory routeData
        ) = abi.decode(message.data, (bytes32, address, address, uint256, address, uint256, bytes));
        
        // Get received token and amount
        require(message.destTokenAmounts.length > 0, "No tokens received");
        address receivedToken = message.destTokenAmounts[0].token;
        uint256 receivedAmount = message.destTokenAmounts[0].amount;
        
        // Store swap info
        swapInfo[swapId] = SwapInfo({
            user: abi.decode(message.sender, (address)),
            originalSender: originalSender,
            tokenOut: tokenOut,
            minAmountOut: minAmountOut,
            recipient: recipient,
            deadline: deadline,
            routeData: routeData,
            isFromAvalanche: false,
            processed: false
        });
        
        emit TokensReceivedFromExternal(swapId, sourceChainSelector, receivedToken, receivedAmount);
        
        // Decode route data to determine destination
        (bool goesToAvalanche, bytes32 avalancheChainId) = _decodeAvalancheRoute(routeData);
        
        if (goesToAvalanche) {
            _forwardToAvalanche(swapId, avalancheChainId, receivedToken, receivedAmount);
        } else {
            _processLocalCompletion(swapId, receivedToken, receivedAmount);
        }
    }

    /**
     * @notice Forward tokens to external chain via CCIP
     */
    function _forwardToExternalChain(
        bytes32 swapId,
        uint64 destinationChain,
        address token,
        uint256 amount
    ) private {
        require(supportedCCIPChains[destinationChain], "Unsupported destination chain");
        
        // Take hub fee
        uint256 feeAmount = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amount - feeAmount;
        
        if (feeAmount > 0) {
            IERC20(token).safeTransfer(feeRecipient, feeAmount);
        }
        
        // Create CCIP token transfer
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: token,
            amount: amountAfterFee
        });
        
        SwapInfo memory swap = swapInfo[swapId];
        
        // Encode completion data
        bytes memory data = abi.encode(
            swapId,
            swap.recipient,
            swap.tokenOut,
            swap.minAmountOut
        );
        
        // Create CCIP message
        Client.EVM2AnyMessage memory ccipMessage = Client.EVM2AnyMessage({
            receiver: abi.encode(_getExternalRouterAddress(destinationChain)),
            data: data,
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: MIN_GAS_LIMIT})
            ),
            feeToken: address(0) // Pay in native AVAX
        });
        
        // Calculate required fee
        uint256 fees = IRouterClient(i_ccipRouter).getFee(destinationChain, ccipMessage);
        require(address(this).balance >= fees, "Insufficient native token for fees");
        
        // Approve router for token transfer
        IERC20(token).approve(i_ccipRouter, amountAfterFee);
        
        // Send via CCIP
        IRouterClient(i_ccipRouter).ccipSend{value: fees}(destinationChain, ccipMessage);
        
        emit TokensForwardedToExternal(swapId, destinationChain, token, amountAfterFee);
    }

    /**
     * @notice Forward tokens to Avalanche L1 via Teleporter
     */
    function _forwardToAvalanche(
        bytes32 swapId,
        bytes32 destinationChain,
        address token,
        uint256 amount
    ) private {
        require(supportedAvalancheChains[destinationChain], "Unsupported destination L1");
        
        // Take hub fee
        uint256 feeAmount = (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amount - feeAmount;
        
        if (feeAmount > 0) {
            IERC20(token).safeTransfer(feeRecipient, feeAmount);
        }
        
        SwapInfo memory swap = swapInfo[swapId];
        
        // Prepare completion message
        bytes memory message = abi.encode(
            swapId,
            token,
            amountAfterFee,
            swap.tokenOut,
            swap.minAmountOut,
            swap.recipient
        );
        
        // Approve teleporter
        IERC20(token).approve(address(teleporter), amountAfterFee);
        
        // Send via Teleporter
        ITeleporterMessenger.TeleporterMessageInput memory teleporterMsg = 
            ITeleporterMessenger.TeleporterMessageInput({
                destinationBlockchainID: destinationChain,
                destinationAddress: _getAvalancheRouterAddress(destinationChain),
                feeInfo: ITeleporterMessenger.TeleporterFeeInfo({
                    feeTokenAddress: address(0), // Pay with native AVAX
                    amount: 0 // No additional fee for internal forwarding
                }),
                requiredGasLimit: 300000,
                allowedRelayerAddresses: new address[](0),
                message: message
            });
            
        teleporter.sendCrossChainMessage(teleporterMsg);
        
        emit TokensForwardedToAvalanche(swapId, destinationChain, token, amountAfterFee);
    }

    /**
     * @notice Process local completion on Fuji C-Chain
     */
    function _processLocalCompletion(
        bytes32 swapId,
        address tokenIn,
        uint256 amountIn
    ) private {
        SwapInfo storage swap = swapInfo[swapId];
        require(!swap.processed, "Swap already processed");
        
        uint256 amountOut = amountIn;
        
        // Execute swap if tokens are different
        if (tokenIn != swap.tokenOut) {
            amountOut = _executeLocalSwap(tokenIn, swap.tokenOut, amountIn, swap.minAmountOut);
        }
        
        require(amountOut >= swap.minAmountOut, "Insufficient output amount");
        
        // Transfer to recipient
        IERC20(swap.tokenOut).safeTransfer(swap.recipient, amountOut);
        
        swap.processed = true;
    }

    /**
     * @notice Execute local swap on Fuji C-Chain
     */
    function _executeLocalSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) private returns (uint256 amountOut) {
        // Approve TraderJoe router
        IERC20(tokenIn).approve(TRADERJOE_ROUTER, amountIn);
        
        // Create path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // Execute swap
        uint[] memory amounts = IDEXRouter(TRADERJOE_ROUTER).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
    }

    // Helper functions for route decoding
    function _decodeRouteData(bytes memory routeData) 
        private 
        pure 
        returns (bool goesToExternal, uint64 externalChainSelector, address tokenIn, uint256 amountIn) 
    {
        if (routeData.length > 0) {
            // Simple encoding: first 32 bytes = boolean for external, next 8 bytes = chain selector
            (goesToExternal, externalChainSelector, tokenIn, amountIn) = 
                abi.decode(routeData, (bool, uint64, address, uint256));
        }
    }

    function _decodeAvalancheRoute(bytes memory routeData) 
        private 
        pure 
        returns (bool goesToAvalanche, bytes32 avalancheChainId) 
    {
        if (routeData.length > 0) {
            // Decode avalanche destination info
            (goesToAvalanche, avalancheChainId) = abi.decode(routeData, (bool, bytes32));
        }
    }

    function _getExternalRouterAddress(uint64 chainSelector) private pure returns (address) {
        // Return hardcoded router addresses for supported external chains
        if (chainSelector == ARBITRUM_SEPOLIA_SELECTOR) {
            return 0x2345678901234567890123456789012345678901; // Arbitrum router
        } else if (chainSelector == POLYGON_AMOY_SELECTOR) {
            return 0x3456789012345678901234567890123456789012; // Polygon router
        }
        return address(0);
    }

    function _getAvalancheRouterAddress(bytes32 chainId) private pure returns (address) {
        // Return hardcoded router addresses for supported Avalanche L1s
        return 0x1234567890123456789012345678901234567890; // Default L1 router
    }

    // Admin functions
    function addSupportedCCIPChain(uint64 chainSelector) external onlyOwner {
        supportedCCIPChains[chainSelector] = true;
    }

    function addSupportedAvalancheChain(bytes32 blockchainID) external onlyOwner {
        supportedAvalancheChains[blockchainID] = true;
    }

    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // View functions
    function getSwapInfo(bytes32 swapId) external view returns (SwapInfo memory) {
        return swapInfo[swapId];
    }

    function isChainSupported(uint64 chainSelector) external view returns (bool) {
        return supportedCCIPChains[chainSelector];
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    receive() external payable {}
}