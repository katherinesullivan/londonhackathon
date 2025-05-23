// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/chainlink-contracts/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "../lib/chainlink-contracts/src/v0.8/ccip/libraries/Client.sol";
import "../lib/chainlink-contracts/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "../lib/chainlink-contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";

// Avalanche ICM/Teleporter interfaces
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
 * @title CrossChainSwapRouter
 * @notice Unified router for cross-chain swaps using Tesseract-style routing within Avalanche
 * and Chainlink CCIP for external chains
 */
contract CrossChainSwapRouter is CCIPReceiver, ITeleporterReceiver, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant PROTOCOL_FEE_BPS = 10; // 0.1% fee like Tesseract
    uint256 public constant MAX_SLIPPAGE_BPS = 500; // 5% max slippage
    uint256 public constant BPS_DENOMINATOR = 10000;

    // State variables
    ITeleporterMessenger public immutable teleporter;
    mapping(uint64 => bool) public supportedChainlinkChains;
    mapping(bytes32 => bool) public supportedAvalancheL1s;
    mapping(address => bool) public supportedDEXs;
    mapping(bytes32 => PendingSwap) public pendingSwaps;
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    address public feeRecipient;
    uint256 public minGasLimit = 200000;

    // Events
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 expectedAmountOut,
        ChainInfo destinationChain
    );
    
    event SwapCompleted(
        bytes32 indexed swapId,
        address indexed user,
        uint256 amountOut
    );
    
    event SwapFailed(
        bytes32 indexed swapId,
        address indexed user,
        string reason
    );
    
    event ChainlinkChainAdded(uint64 chainSelector);
    event AvalancheL1Added(bytes32 blockchainID);
    event DEXAdded(address dex);

    // Structs
    struct ChainInfo {
        bool isAvalancheL1;
        bytes32 avalancheBlockchainID;
        uint64 chainlinkChainSelector;
        address targetRouter;
    }
    
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address[] path;
        address recipient;
        ChainInfo destinationChain;
        bytes extraData; // For complex routing instructions
    }
    
    struct PendingSwap {
        address user;
        address tokenOut;
        uint256 minAmountOut;
        uint256 deadline;
        address recipient;
        bool completed;
    }

    // Custom errors
    error UnsupportedChain();
    error UnsupportedToken();
    error InsufficientOutput();
    error SwapExpired();
    error UnauthorizedCaller();
    error InvalidSwapId();
    error SwapAlreadyCompleted();

    constructor(
        address _router,
        address _teleporter,
        address _feeRecipient
    ) CCIPReceiver(_router) {
        teleporter = ITeleporterMessenger(_teleporter);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Initiate a cross-chain swap
     * @param params Swap parameters including routing information
     */
    function initiateSwap(SwapParams calldata params) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 swapId) 
    {
        // Validate inputs
        if (params.amountIn == 0) revert InsufficientOutput();
        
        // Transfer tokens from user
        IERC20(params.tokenIn).safeTransferFrom(
            msg.sender, 
            address(this), 
            params.amountIn
        );
        
        // Calculate fees
        uint256 feeAmount = (params.amountIn * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = params.amountIn - feeAmount;
        
        // Transfer fee to recipient
        if (feeAmount > 0) {
            IERC20(params.tokenIn).safeTransfer(feeRecipient, feeAmount);
        }
        
        // Generate unique swap ID
        swapId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                params.tokenIn,
                params.tokenOut,
                params.amountIn
            )
        );
        
        // Store pending swap info
        pendingSwaps[swapId] = PendingSwap({
            user: msg.sender,
            tokenOut: params.tokenOut,
            minAmountOut: params.minAmountOut,
            deadline: block.timestamp + 3600, // 1 hour deadline
            recipient: params.recipient == address(0) ? msg.sender : params.recipient,
            completed: false
        });
        
        // Route based on destination
        if (params.destinationChain.isAvalancheL1) {
            _routeViaAvalanche(swapId, params, amountAfterFee);
        } else {
            _routeViaChainlink(swapId, params, amountAfterFee);
        }
        
        emit SwapInitiated(
            swapId,
            msg.sender,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            params.minAmountOut,
            params.destinationChain
        );
    }

    /**
     * @notice Route swap through Avalanche L1s using Teleporter
     */
    function _routeViaAvalanche(
        bytes32 swapId,
        SwapParams calldata params,
        uint256 amount
    ) private {
        if (!supportedAvalancheL1s[params.destinationChain.avalancheBlockchainID]) {
            revert UnsupportedChain();
        }
        
        // Encode swap instructions for destination chain
        bytes memory message = abi.encode(
            swapId,
            params.tokenIn,
            params.tokenOut,
            amount,
            params.minAmountOut,
            params.path,
            params.recipient,
            params.extraData
        );
        
        // Approve teleporter if needed
        IERC20(params.tokenIn).safeApprove(address(teleporter), amount);
        
        // Send via Teleporter
        ITeleporterMessenger.TeleporterMessageInput memory input = 
            ITeleporterMessenger.TeleporterMessageInput({
                destinationBlockchainID: params.destinationChain.avalancheBlockchainID,
                destinationAddress: params.destinationChain.targetRouter,
                feeInfo: ITeleporterMessenger.TeleporterFeeInfo({
                    feeTokenAddress: address(0), // Use native token for fees
                    amount: msg.value
                }),
                requiredGasLimit: minGasLimit,
                allowedRelayerAddresses: new address[](0), // Any relayer
                message: message
            });
            
        teleporter.sendCrossChainMessage(input);
    }

    /**
     * @notice Route swap through external chains using Chainlink CCIP
     */
    function _routeViaChainlink(
        bytes32 swapId,
        SwapParams calldata params,
        uint256 amount
    ) private {
        if (!supportedChainlinkChains[params.destinationChain.chainlinkChainSelector]) {
            revert UnsupportedChain();
        }
        
        // Create CCIP message
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: params.tokenIn,
            amount: amount
        });
        
        bytes memory data = abi.encode(
            swapId,
            params.tokenOut,
            params.minAmountOut,
            params.path,
            params.recipient,
            params.extraData
        );
        
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(params.destinationChain.targetRouter),
            data: data,
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: minGasLimit})
            ),
            feeToken: address(0) // Pay in native token
        });
        
        // Get required fee
        uint256 fees = IRouterClient(i_router).getFee(
            params.destinationChain.chainlinkChainSelector,
            message
        );
        
        if (msg.value < fees) revert InsufficientOutput();
        
        // Approve router
        IERC20(params.tokenIn).safeApprove(i_router, amount);
        
        // Send via CCIP
        IRouterClient(i_router).ccipSend{value: fees}(
            params.destinationChain.chainlinkChainSelector,
            message
        );
    }

    /**
     * @notice Receive message from Teleporter (Avalanche L1s)
     */
    function receiveTeleporterMessage(
        bytes32 sourceBlockchainID,
        address originSenderAddress,
        bytes calldata message
    ) external override {
        if (msg.sender != address(teleporter)) revert UnauthorizedCaller();
        
        (
            bytes32 swapId,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 minAmountOut,
            address[] memory path,
            address recipient,
            bytes memory extraData
        ) = abi.decode(
            message, 
            (bytes32, address, address, uint256, uint256, address[], address, bytes)
        );
        
        _executeSwap(
            swapId,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            path,
            recipient,
            extraData
        );
    }

    /**
     * @notice Handle received CCIP messages
     */
    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        (
            bytes32 swapId,
            address tokenOut,
            uint256 minAmountOut,
            address[] memory path,
            address recipient,
            bytes memory extraData
        ) = abi.decode(
            message.data,
            (bytes32, address, uint256, address[], address, bytes)
        );
        
        // Get received token and amount
        address tokenIn = message.destTokenAmounts[0].token;
        uint256 amountIn = message.destTokenAmounts[0].amount;
        
        _executeSwap(
            swapId,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            path,
            recipient,
            extraData
        );
    }

    /**
     * @notice Execute the swap on destination chain
     */
    function _executeSwap(
        bytes32 swapId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address[] memory path,
        address recipient,
        bytes memory extraData
    ) private {
        PendingSwap storage swap = pendingSwaps[swapId];
        
        // For cross-chain swaps, we might not have the original swap data
        // In production, implement proper cross-chain state management
        
        uint256 amountOut = amountIn; // Default for same-token transfers
        
        // If tokens differ, perform swap
        if (tokenIn != tokenOut) {
            // Decode DEX router from extraData if provided
            address dexRouter = extraData.length > 0 ? 
                abi.decode(extraData, (address)) : 
                address(0);
                
            if (dexRouter != address(0) && supportedDEXs[dexRouter]) {
                // Approve DEX
                IERC20(tokenIn).safeApprove(dexRouter, amountIn);
                
                // Execute swap
                try IDEXRouter(dexRouter).swapExactTokensForTokens(
                    amountIn,
                    minAmountOut,
                    path.length > 0 ? path : _getDefaultPath(tokenIn, tokenOut),
                    address(this),
                    block.timestamp + 300
                ) returns (uint[] memory amounts) {
                    amountOut = amounts[amounts.length - 1];
                } catch {
                    // Swap failed, refund tokens
                    IERC20(tokenIn).safeTransfer(recipient, amountIn);
                    emit SwapFailed(swapId, recipient, "DEX swap failed");
                    return;
                }
            }
        }
        
        // Validate output
        if (amountOut < minAmountOut) {
            // Refund if slippage too high
            IERC20(tokenIn).safeTransfer(recipient, amountIn);
            emit SwapFailed(swapId, recipient, "Insufficient output amount");
            return;
        }
        
        // Transfer final tokens to recipient
        IERC20(tokenOut).safeTransfer(recipient, amountOut);
        
        // Mark swap as completed if we have the record
        if (swap.user != address(0)) {
            swap.completed = true;
        }
        
        emit SwapCompleted(swapId, recipient, amountOut);
    }

    /**
     * @notice Get default swap path for token pair
     */
    function _getDefaultPath(address tokenA, address tokenB) 
        private 
        pure 
        returns (address[] memory) 
    {
        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;
        return path;
    }

    /**
     * @notice Calculate expected output amount for a swap
     */
    function getExpectedOutput(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address dexRouter,
        address[] calldata path
    ) external view returns (uint256 expectedOut) {
        if (!supportedDEXs[dexRouter]) return 0;
        
        uint256 amountAfterFee = amountIn - (amountIn * PROTOCOL_FEE_BPS / BPS_DENOMINATOR);
        
        try IDEXRouter(dexRouter).getAmountsOut(
            amountAfterFee,
            path.length > 0 ? path : _getDefaultPath(tokenIn, tokenOut)
        ) returns (uint[] memory amounts) {
            expectedOut = amounts[amounts.length - 1];
        } catch {
            expectedOut = 0;
        }
    }

    /**
     * @notice Admin functions
     */
    function addChainlinkChain(uint64 chainSelector) external onlyOwner {
        supportedChainlinkChains[chainSelector] = true;
        emit ChainlinkChainAdded(chainSelector);
    }
    
    function addAvalancheL1(bytes32 blockchainID) external onlyOwner {
        supportedAvalancheL1s[blockchainID] = true;
        emit AvalancheL1Added(blockchainID);
    }
    
    function addDEX(address dex) external onlyOwner {
        supportedDEXs[dex] = true;
        emit DEXAdded(dex);
    }
    
    function setPriceFeed(address token, address feed) external onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(feed);
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }
    
    function setMinGasLimit(uint256 _minGasLimit) external onlyOwner {
        minGasLimit = _minGasLimit;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency functions
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
    
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
}