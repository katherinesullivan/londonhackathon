// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/chainlink-contracts/src/v0.8/ccip/interfaces/IRouterClient.sol";
import "../lib/chainlink-contracts/src/v0.8/ccip/libraries/Client.sol";
import "../lib/chainlink-contracts/src/v0.8/ccip/applications/CCIPReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Interfaces.sol";
import "./SwapTypes.sol";

// // Simple DEX router interface for local swaps
// interface IDEXRouter {
//     function swapExactTokensForTokens(
//         uint amountIn,
//         uint amountOutMin,
//         address[] calldata path,
//         address to,
//         uint deadline
//     ) external returns (uint[] memory amounts);

//     function getAmountsOut(uint amountIn, address[] calldata path)
//         external view returns (uint[] memory amounts);
// }

// Simple structs for routing data
struct SwapParams {
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 minAmountOut;
    address recipient;
    uint256 deadline;
    bytes routeData; // Encoded route information
}

/**
 * @title CrossChainRouterExternal
 * @notice Router for external chains that bridges to Fuji C-Chain using CCIP
 * @dev Handles the first hop of cross-chain swaps for external chains
 */
contract CrossChainRouterExternal is CCIPReceiver, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Contract state
    address public immutable fujiForwarderAddress;
    uint64 public immutable chainSelector;
    
    uint256 public constant PROTOCOL_FEE_BPS = 10; // 0.1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_GAS_LIMIT = 200000;
    
    address public feeRecipient;
    mapping(address => bool) public supportedDEXs;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => SwapParams) public pendingSwaps;
    
    // Chain-specific configuration (example for Arbitrum Sepolia)
    uint64 public constant FUJI_CHAIN_SELECTOR = 14767482510784806043;
    address public constant USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d; // Arbitrum Sepolia USDC
    address public constant WETH = 0xE591bf0A0CF924A0674d7792db046B23CEbF5f34; // Arbitrum Sepolia WETH
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    
    // Events
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    );
    
    event TokensBridgedToFuji(
        bytes32 indexed swapId,
        address token,
        uint256 amount
    );
    
    event SwapCompleted(
        bytes32 indexed swapId,
        address indexed recipient,
        uint256 amountOut
    );

    constructor(
        address _ccipRouter,
        uint64 _chainSelector,
        address _feeRecipient,
        address _fujiForwarder
    ) CCIPReceiver(_ccipRouter) Ownable(msg.sender) {
        chainSelector = _chainSelector;
        feeRecipient = _feeRecipient;
        fujiForwarderAddress = _fujiForwarder;
        
        // Add supported tokens
        supportedTokens[USDC] = true;
        supportedTokens[WETH] = true;
        
        // Add supported DEXs
        supportedDEXs[UNISWAP_V2_ROUTER] = true;
        supportedDEXs[SUSHISWAP_ROUTER] = true;
    }

    /**
     * @notice Initiate cross-chain swap from external chain
     */
    function initiateSwap(SwapParams calldata params) 
        external 
        payable
        nonReentrant 
        whenNotPaused 
        returns (bytes32 swapId) 
    {
        require(params.amountIn > 0, "Invalid amount");
        require(supportedTokens[params.tokenIn], "Unsupported input token");
        require(block.timestamp <= params.deadline, "Deadline exceeded");
        
        // Generate swap ID
        swapId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            params.tokenIn,
            params.amountIn,
            block.chainid
        ));
        
        // Store swap params
        pendingSwaps[swapId] = params;
        
        // Transfer tokens from user
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Take protocol fee
        uint256 feeAmount = (params.amountIn * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = params.amountIn - feeAmount;
        
        if (feeAmount > 0) {
            IERC20(params.tokenIn).safeTransfer(feeRecipient, feeAmount);
        }
        
        // Check if this needs bridging or local swap
        if (_needsBridging(params.routeData)) {
            _initiateBridgeToFuji(swapId, params, amountAfterFee);
        } else {
            _executeLocalSwap(swapId, params, amountAfterFee);
        }
        
        emit SwapInitiated(swapId, msg.sender, params.tokenIn, params.tokenOut, params.amountIn);
    }

    /**
     * @notice Execute local swap on current chain
     */
    function _executeLocalSwap(
        bytes32 swapId,
        SwapParams calldata params,
        uint256 amountIn
    ) private {
        uint256 amountOut = amountIn;
        
        if (params.tokenIn != params.tokenOut) {
            // Find best DEX route
            address bestDEX = _findBestDEX(params.tokenIn, params.tokenOut, amountIn);
            require(bestDEX != address(0), "No liquidity found");
            
            // Execute swap
            amountOut = _swapOnDEX(bestDEX, params.tokenIn, params.tokenOut, amountIn, params.minAmountOut);
        }
        
        // Transfer to recipient
        address recipient = params.recipient == address(0) ? msg.sender : params.recipient;
        IERC20(params.tokenOut).safeTransfer(recipient, amountOut);
        
        emit SwapCompleted(swapId, recipient, amountOut);
    }

    /**
     * @notice Initiate bridge to Fuji via CCIP
     */
    function _initiateBridgeToFuji(
        bytes32 swapId,
        SwapParams calldata params,
        uint256 amountIn
    ) private {
        // Swap to a bridgeable token if needed
        address bridgeToken = _getBridgeToken(params.tokenIn);
        uint256 bridgeAmount = amountIn;
        
        if (params.tokenIn != bridgeToken) {
            address bestDEX = _findBestDEX(params.tokenIn, bridgeToken, amountIn);
            require(bestDEX != address(0), "No bridge route found");
            bridgeAmount = _swapOnDEX(bestDEX, params.tokenIn, bridgeToken, amountIn, 0);
        }
        
        // Send to Fuji Forwarder via CCIP
        _sendViaCCIP(swapId, bridgeToken, bridgeAmount, params);
        
        emit TokensBridgedToFuji(swapId, bridgeToken, bridgeAmount);
    }

    /**
     * @notice Send tokens to Fuji via CCIP
     */
    function _sendViaCCIP(
        bytes32 swapId,
        address token,
        uint256 amount,
        SwapParams calldata params
    ) private {
        // Create CCIP token transfer
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: token,
            amount: amount
        });
        
        // Encode swap data for FujiForwarder
        bytes memory data = abi.encode(
            swapId,
            msg.sender,
            params.tokenOut,
            params.minAmountOut,
            params.recipient,
            params.deadline,
            params.routeData
        );
        
        // Create CCIP message
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(fujiForwarderAddress),
            data: data,
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV1({gasLimit: MIN_GAS_LIMIT})
            ),
            feeToken: address(0) // Pay in native token
        });
        
        // Calculate fees
        uint256 fees = IRouterClient(i_ccipRouter).getFee(FUJI_CHAIN_SELECTOR, message);
        require(msg.value >= fees, "Insufficient fee");
        
        // Approve router
        IERC20(token).approve(i_ccipRouter, amount);
        
        // Send via CCIP
        IRouterClient(i_ccipRouter).ccipSend{value: fees}(FUJI_CHAIN_SELECTOR, message);
    }

    /**
     * @notice Receive tokens from Fuji via CCIP (completion of cross-chain swap)
     */
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override {
        require(message.sourceChainSelector == FUJI_CHAIN_SELECTOR, "Invalid source chain");
        
        // Decode message
        (
            bytes32 swapId,
            address recipient,
            address tokenOut,
            uint256 minAmountOut
        ) = abi.decode(message.data, (bytes32, address, address, uint256));
        
        // Get received token and amount
        require(message.destTokenAmounts.length > 0, "No tokens received");
        address receivedToken = message.destTokenAmounts[0].token;
        uint256 receivedAmount = message.destTokenAmounts[0].amount;
        
        uint256 amountOut = receivedAmount;
        
        // Execute final swap if needed
        if (receivedToken != tokenOut) {
            address bestDEX = _findBestDEX(receivedToken, tokenOut, receivedAmount);
            require(bestDEX != address(0), "No final swap route");
            amountOut = _swapOnDEX(bestDEX, receivedToken, tokenOut, receivedAmount, minAmountOut);
        }
        
        require(amountOut >= minAmountOut, "Insufficient output");
        
        // Transfer to recipient
        IERC20(tokenOut).safeTransfer(recipient, amountOut);
        
        emit SwapCompleted(swapId, recipient, amountOut);
    }

    /**
     * @notice Swap tokens on specified DEX
     */
    function _swapOnDEX(
        address dexRouter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) private returns (uint256 amountOut) {
        require(supportedDEXs[dexRouter], "Unsupported DEX");
        
        // Approve DEX
        IERC20(tokenIn).approve(dexRouter, amountIn);
        
        // Create path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // Execute swap
        uint[] memory amounts = IDEXRouter(dexRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
    }

    /**
     * @notice Find best DEX for token pair
     */
    function _findBestDEX(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) private view returns (address bestDEX) {
        uint256 bestOutput = 0;
        
        // Check Uniswap V2
        if (supportedDEXs[UNISWAP_V2_ROUTER]) {
            uint256 output = _getOutputFromDEX(UNISWAP_V2_ROUTER, tokenIn, tokenOut, amountIn);
            if (output > bestOutput) {
                bestOutput = output;
                bestDEX = UNISWAP_V2_ROUTER;
            }
        }
        
        // Check SushiSwap
        if (supportedDEXs[SUSHISWAP_ROUTER]) {
            uint256 output = _getOutputFromDEX(SUSHISWAP_ROUTER, tokenIn, tokenOut, amountIn);
            if (output > bestOutput) {
                bestOutput = output;
                bestDEX = SUSHISWAP_ROUTER;
            }
        }
    }

    /**
     * @notice Get expected output from DEX
     */
    function _getOutputFromDEX(
        address dexRouter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) private view returns (uint256) {
        try IDEXRouter(dexRouter).getAmountsOut(
            amountIn,
            _createPath(tokenIn, tokenOut)
        ) returns (uint[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    function _createPath(address tokenA, address tokenB) private pure returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = tokenA;
        path[1] = tokenB;
        return path;
    }

    // Helper functions
    function _needsBridging(bytes memory routeData) private pure returns (bool) {
        // Simple check - if routeData is not empty, assume cross-chain
        return routeData.length > 0;
    }

    function _getBridgeToken(address token) private pure returns (address) {
        // Default to USDC for bridging
        if (token == WETH) return WETH;
        return USDC;
    }

    // Admin functions
    function addSupportedDEX(address dex) external onlyOwner {
        supportedDEXs[dex] = true;
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
    function getSupportedTokens() external view returns (address[] memory) {
        address[] memory tokens = new address[](2);
        tokens[0] = USDC;
        tokens[1] = WETH;
        return tokens;
    }

    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    function calculateFee(uint256 amount) external pure returns (uint256) {
        return (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
    }

    receive() external payable {}
}