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

  // Echo Testnet (Avalanche L1)
  echo: {
    id: 397,
    name: 'Echo Testnet',
    shortName: 'Echo',
    icon: '/icons/echo.svg',
    rpcUrl: 'https://subnets.avax.network/echo/testnet/rpc',
    blockExplorer: 'https://subnets.avax.network/echo/testnet',
    nativeCurrency: {
      name: 'ECHO',
      symbol: 'ECHO',
      decimals: 18,
    },
    isTestnet: true,
    category: 'avalanche-l1',
    isAvalancheL1: true,
  },

  // Ethereum Sepolia
  sepolia: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    icon: '/icons/ethereum.svg',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    isTestnet: true,
    category: 'ethereum',
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
  dispatch: 'https://test.core.app/tools/testnet-faucet/?subnet=dispatch&token=dispatch',
  echo: 'https://test.core.app/tools/testnet-faucet/?subnet=echo&token=echo',
  sepolia: 'https://faucets.chain.link/sepolia',
  polygonAmoy: 'https://faucet.polygon.technology/',
}; 