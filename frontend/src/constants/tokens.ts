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
      address: '0x1234567890123456789012345678901234567890', // Mock USDC on Dispatch
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 779672,
    },
    {
      address: '0x2345678901234567890123456789012345678901', // Mock USDT on Dispatch
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      icon: '/icons/usdt.svg',
      chainId: 779672,
    },
  ],

  // Echo Testnet (397)
  397: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ECHO',
      name: 'Echo',
      decimals: 18,
      icon: '/icons/echo.svg',
      chainId: 397,
      isNative: true,
    },
    {
      address: '0x3456789012345678901234567890123456789012', // Mock USDC on Echo
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 397,
    },
    {
      address: '0x4567890123456789012345678901234567890123', // Mock AVAX on Echo
      symbol: 'AVAX',
      name: 'Avalanche',
      decimals: 18,
      icon: '/icons/avax.svg',
      chainId: 397,
    },
  ],

  // Ethereum Sepolia (11155111)
  11155111: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      icon: '/icons/ethereum.svg',
      chainId: 11155111,
      isNative: true,
    },
    {
      address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Mock USDC on Sepolia
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 11155111,
    },
    {
      address: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // Mock WETH on Sepolia
      symbol: 'WETH',
      name: 'Wrapped Ethereum',
      decimals: 18,
      icon: '/icons/weth.svg',
      chainId: 11155111,
    },
    {
      address: '0x5678901234567890123456789012345678901234', // Mock LINK on Sepolia
      symbol: 'LINK',
      name: 'Chainlink',
      decimals: 18,
      icon: '/icons/link.svg',
      chainId: 11155111,
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
      address: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Mock USDC on Polygon Amoy
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/icons/usdc.svg',
      chainId: 80002,
    },
    {
      address: '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9', // Mock WMATIC on Polygon Amoy
      symbol: 'WMATIC',
      name: 'Wrapped MATIC',
      decimals: 18,
      icon: '/icons/wmatic.svg',
      chainId: 80002,
    },
    {
      address: '0x6789012345678901234567890123456789012345', // Mock USDT on Polygon Amoy
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      icon: '/icons/usdt.svg',
      chainId: 80002,
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