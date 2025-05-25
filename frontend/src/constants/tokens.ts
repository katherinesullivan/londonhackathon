export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
  chainId: number;
  isNative?: boolean;
}

export const TOKENS_BY_CHAIN: Record<number, TokenConfig[]> = {
  // Dispatch Testnet (779672)
  779672: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'DIS',
      name: 'Dispatch',
      decimals: 18,
      icon: '/icons/dispatch.svg',
      chainId: 779672,
      isNative: true,
    },
    {
      address: '0x1234567890123456789012345678901234567890', // Example USDC on Dispatch
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 779672,
    },
  ],

  // XPLA Testnet (5050502)
  5050502: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'XPLA',
      name: 'XPLA',
      decimals: 18,
      icon: '/icons/xpla.svg',
      chainId: 5050502,
      isNative: true,
    },
  ],

  // Arbitrum Sepolia (421614)
  421614: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      icon: '/icons/ethereum.svg',
      chainId: 421614,
      isNative: true,
    },
    {
      address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Example USDC on Arbitrum Sepolia
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 421614,
    },
    {
      address: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // Example WETH on Arbitrum Sepolia
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      icon: '/icons/weth.svg',
      chainId: 421614,
    },
  ],

  // Polygon Amoy (80002)
  80002: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18,
      icon: '/icons/polygon.svg',
      chainId: 80002,
      isNative: true,
    },
    {
      address: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Example USDC on Polygon Amoy
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 80002,
    },
    {
      address: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9', // Example WMATIC on Polygon Amoy
      symbol: 'WMATIC',
      name: 'Wrapped MATIC',
      decimals: 18,
      icon: '/icons/wmatic.svg',
      chainId: 80002,
    },
  ],

  // Base Sepolia (84532)
  84532: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      icon: '/icons/ethereum.svg',
      chainId: 84532,
      isNative: true,
    },
    {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Example USDC on Base Sepolia
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 84532,
    },
  ],

  // Dexalot Testnet (432201) - Rich DEX with many tokens
  [432201]: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ALOT',
      name: 'Dexalot Token',
      decimals: 18,
      icon: '/icons/alot.svg',
      chainId: 432201,
      isNative: true,
    },
    {
      address: '0x1234567890123456789012345678901234567890', // Mock address
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 432201,
      isNative: false,
    },
    {
      address: '0x2345678901234567890123456789012345678901', // Mock address
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      icon: '/icons/usdt.svg',
      chainId: 432201,
      isNative: false,
    },
    {
      address: '0x3456789012345678901234567890123456789012', // Mock address
      symbol: 'AVAX',
      name: 'Avalanche',
      decimals: 18,
      icon: '/icons/avax.svg',
      chainId: 432201,
      isNative: false,
    },
    {
      address: '0x4567890123456789012345678901234567890123', // Mock address
      symbol: 'BTC.b',
      name: 'Bitcoin (Bridged)',
      decimals: 8,
      icon: '/icons/btc.svg',
      chainId: 432201,
      isNative: false,
    },
    {
      address: '0x5678901234567890123456789012345678901234', // Mock address
      symbol: 'ETH.e',
      name: 'Ethereum (Bridged)',
      decimals: 18,
      icon: '/icons/eth.svg',
      chainId: 432201,
      isNative: false,
    },
  ],
};

export const getTokensByChain = (chainId: number): TokenConfig[] => {
  return TOKENS_BY_CHAIN[chainId] || [];
};

export const findToken = (chainId: number, address: string): TokenConfig | undefined => {
  const tokens = getTokensByChain(chainId);
  return tokens.find(token => token.address.toLowerCase() === address.toLowerCase());
};

export const getNativeToken = (chainId: number): TokenConfig | undefined => {
  const tokens = getTokensByChain(chainId);
  return tokens.find(token => token.isNative);
}; 