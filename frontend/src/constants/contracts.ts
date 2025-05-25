// Mock deployed contract addresses
export const CONTRACT_ADDRESSES = {
  // Dispatch Testnet
  779672: {
    LIQUIDITY_AGGREGATOR: '0x1234567890123456789012345678901234567890',
    CROSS_CHAIN_SWAP_ROUTER: '0x2345678901234567890123456789012345678901',
  },
  // Echo Testnet
  397: {
    LIQUIDITY_AGGREGATOR: '0x3456789012345678901234567890123456789012',
    CROSS_CHAIN_SWAP_ROUTER: '0x4567890123456789012345678901234567890123',
  },
  // Ethereum Sepolia
  11155111: {
    LIQUIDITY_AGGREGATOR: '0x5678901234567890123456789012345678901234',
    CROSS_CHAIN_SWAP_ROUTER: '0x6789012345678901234567890123456789012345',
  },
  // Polygon Amoy
  80002: {
    LIQUIDITY_AGGREGATOR: '0x7890123456789012345678901234567890123456',
    CROSS_CHAIN_SWAP_ROUTER: '0x8901234567890123456789012345678901234567',
  },
};

// Minimal ABI for CrossChainSwapRouter interactions
export const CROSS_CHAIN_SWAP_ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "name": "sourceToken", "type": "address" },
          { "name": "destinationToken", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "minAmountOut", "type": "uint256" },
          { "name": "destinationChain", "type": "uint64" },
          { "name": "recipient", "type": "address" },
          { "name": "deadline", "type": "uint256" },
          { "name": "gasLimit", "type": "uint256" }
        ],
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "initiateSwap",
    "outputs": [{ "name": "swapId", "type": "bytes32" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "swapId", "type": "bytes32" }],
    "name": "getSwapStatus",
    "outputs": [
      { "name": "status", "type": "uint8" },
      { "name": "timestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getEstimate",
    "outputs": [
      { "name": "amountOut", "type": "uint256" },
      { "name": "gasEstimate", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "name": "owner", "type": "address" }, { "name": "spender", "type": "address" }],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const; 