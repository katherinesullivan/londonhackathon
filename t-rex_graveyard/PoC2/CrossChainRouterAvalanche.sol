// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
 * @title CrossChainRouterAvalanche
 * @notice Router for Avalanche L1s that bridges to Fuji C-Chain using Teleporter
 * @dev Handles the first hop of cross-chain swaps for Avalanche ecosystem
 */
contract CrossChainRouterAvalanche is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Contract state
    ITeleporterMessenger public immutable teleporter;
    address public immutable fujiForwarder;
    
    uint256 public constant PROTOCOL_FEE_BPS = 10; // 0.1%
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    address public feeRecipient;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => bool) public supportedDestinationChains;
    
    // Hardcoded constants for testnet
    bytes32 public constant FUJI_BLOCKCHAIN_ID = 0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5;
    address public constant FUJI_USDC = 0x5425890298aed601595a70AB815c96711a31Bc65;
    address public constant FUJI_WAVAX = 0xd00ae08403B9bbb9124bB305C09058E32C39A48c;
    
    // Events
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed user,
        address tokenIn,
        uint256 amountIn,
        address recipient
    );
    
    event TokensBridgedToFuji(
        bytes32 indexed swapId,
        address token,
        uint256 amount
    );

    constructor(
        address _teleporter,
        address _fujiForwarder,
        address _feeRecipient
    ) Ownable(msg.sender) {
        teleporter = ITeleporterMessenger(_teleporter);
        fujiForwarder = _fujiForwarder;
        feeRecipient = _feeRecipient;
        
        // Add supported tokens
        supportedTokens[FUJI_USDC] = true;
        supportedTokens[FUJI_WAVAX] = true;
    }

    /**
     * @notice Initiate cross-chain swap from Avalanche L1
     * @param params Swap parameters including route information
     */
    function initiateSwap(SwapParams calldata params) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        returns (bytes32 swapId) 
    {
        require(params.amountIn > 0, "Invalid amount");
        require(block.timestamp <= params.deadline, "Deadline exceeded");
        require(supportedTokens[params.tokenIn], "Unsupported token");
        
        // Generate unique swap ID
        swapId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            params.tokenIn,
            params.amountIn,
            block.number
        ));
        
        // Transfer tokens from user
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        
        // Take protocol fee
        uint256 feeAmount = (params.amountIn * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = params.amountIn - feeAmount;
        
        if (feeAmount > 0) {
            IERC20(params.tokenIn).safeTransfer(feeRecipient, feeAmount);
        }
        
        // Check if we need to swap to bridgeable token
        address bridgeToken = _getBridgeToken(params.tokenIn);
        uint256 bridgeAmount = amountAfterFee;
        
        if (params.tokenIn != bridgeToken) {
            // Simple 1:1 swap simulation for demo (in production, integrate with local DEX)
            bridgeAmount = _simulateSwap(params.tokenIn, bridgeToken, amountAfterFee);
        }
        
        // Prepare message for FujiForwarder
        bytes memory message = abi.encode(
            swapId,
            msg.sender,
            params.tokenOut,
            params.minAmountOut,
            params.recipient,
            params.deadline,
            params.routeData
        );
        
        // Send to Fuji via Teleporter
        _sendToFujiForwarder(bridgeToken, bridgeAmount, message);
        
        emit SwapInitiated(swapId, msg.sender, params.tokenIn, params.amountIn, params.recipient);
        emit TokensBridgedToFuji(swapId, bridgeToken, bridgeAmount);
    }

    /**
     * @notice Send tokens to FujiForwarder via Teleporter
     */
    function _sendToFujiForwarder(
        address token,
        uint256 amount,
        bytes memory message
    ) private {
        // Approve teleporter to spend tokens
        IERC20(token).approve(address(teleporter), amount);
        
        // Prepare Teleporter message
        ITeleporterMessenger.TeleporterMessageInput memory teleporterMsg = 
            ITeleporterMessenger.TeleporterMessageInput({
                destinationBlockchainID: FUJI_BLOCKCHAIN_ID,
                destinationAddress: fujiForwarder,
                feeInfo: ITeleporterMessenger.TeleporterFeeInfo({
                    feeTokenAddress: address(0), // Pay with native token
                    amount: msg.value
                }),
                requiredGasLimit: 500000,
                allowedRelayerAddresses: new address[](0),
                message: message
            });
        
        // Send via Teleporter
        teleporter.sendCrossChainMessage(teleporterMsg);
    }

    /**
     * @notice Receive completion notification from FujiForwarder
     */
    function receiveCompletion(
        bytes32 swapId,
        bool success,
        uint256 outputAmount
    ) external {
        require(msg.sender == fujiForwarder, "Unauthorized");
        // Log completion event or handle refunds if needed
    }

    // Helper functions
    function _getBridgeToken(address token) private pure returns (address) {
        // For demo, default to USDC for bridging
        if (token == FUJI_WAVAX) return FUJI_WAVAX;
        return FUJI_USDC;
    }

    function _simulateSwap(address tokenIn, address tokenOut, uint256 amountIn) private pure returns (uint256) {
        // Simplified swap simulation (apply 0.3% DEX fee)
        return (amountIn * 997) / 1000;
    }

    // Admin functions
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
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

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    function rescueNative() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // View functions
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    function calculateFee(uint256 amount) external pure returns (uint256) {
        return (amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
    }

    receive() external payable {}
}