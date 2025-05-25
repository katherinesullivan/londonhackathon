export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  icon: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
  category: 'avalanche-l1' | 'ethereum' | 'polygon' | 'arbitrum';
  isAvalancheL1?: boolean;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  // Dispatch Testnet (Avalanche L1)
  dispatch: {
    id: 779672,
    name: 'Dispatch Testnet',
    shortName: 'Dispatch',
    icon: '/icons/dispatch.svg',
    rpcUrl: 'https://subnets.avax.network/dispatch/testnet/rpc',
    blockExplorer: 'https://subnets.avax.network/dispatch/testnet',
    nativeCurrency: {
      name: 'DISPATCH',
      symbol: 'DIS',
      decimals: 18,
    },
    isTestnet: true,
    category: 'avalanche-l1',
    isAvalancheL1: true,
  },

  // XPLA Testnet (Another Avalanche L1 example)
  xpla: {
    id: 5050502,
    name: 'XPLA Testnet',
    shortName: 'XPLA',
    icon: '/icons/xpla.svg',
    rpcUrl: 'https://subnets.avax.network/xpla/testnet/rpc',
    blockExplorer: 'https://subnets.avax.network/xpla/testnet',
    nativeCurrency: {
      name: 'XPLA',
      symbol: 'XPLA',
      decimals: 18,
    },
    isTestnet: true,
    category: 'avalanche-l1',
    isAvalancheL1: true,
  },

  // Arbitrum Sepolia
  arbitrumSepolia: {
    id: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'Arb Sep',
    icon: '/icons/arbitrum.svg',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    isTestnet: true,
    category: 'arbitrum',
    isAvalancheL1: false,
  },

  // Polygon Amoy
  polygonAmoy: {
    id: 80002,
    name: 'Polygon Amoy',
    shortName: 'Amoy',
    icon: '/icons/polygon.svg',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://www.oklink.com/amoy',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    isTestnet: true,
    category: 'polygon',
    isAvalancheL1: false,
  },

  // Base Sepolia
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'Base',
    icon: '/icons/base.svg',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    isTestnet: true,
    category: 'ethereum',
    isAvalancheL1: false,
  },

  dexalot: {
    id: 432201,
    name: 'Dexalot Testnet',
    shortName: 'Dexalot',
    icon: '/icons/dexalot.svg',
    rpcUrl: 'https://subnets.avax.network/dexalot/testnet/rpc',
    blockExplorer: 'https://subnets.avax.network/dexalot/testnet',
    nativeCurrency: {
      name: 'ALOT',
      symbol: 'ALOT',
      decimals: 18,
    },
    isTestnet: true,
    category: 'avalanche-l1',
    isAvalancheL1: true,
  },
};

export const CHAIN_CATEGORIES = {
  'avalanche-l1': {
    name: 'Avalanche L1',
    color: '#e84142',
  },
  ethereum: {
    name: 'Ethereum',
    color: '#627eea',
  },
  polygon: {
    name: 'Polygon',
    color: '#8247e5',
  },
  arbitrum: {
    name: 'Arbitrum',
    color: '#28a0f0',
  },
};

// Faucet links for testnets
export const FAUCETS: Record<string, string> = {
  dispatch: 'https://faucet.avax.network/',
  xpla: 'https://faucet.avax.network/',
  arbitrumSepolia: 'https://faucet.arbitrum.io/',
  polygonAmoy: 'https://faucet.polygon.technology/',
  baseSepolia: 'https://faucet.base.org/',
}; 