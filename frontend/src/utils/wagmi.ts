import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';

// Custom chain for Dispatch (Avalanche L1)
const dispatchTestnet = {
  id: 779672,
  name: 'Dispatch Testnet',
  network: 'dispatch-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Dispatch',
    symbol: 'DIS',
  },
  rpcUrls: {
    public: { http: ['https://subnets.avax.network/dispatch/testnet/rpc'] },
    default: { http: ['https://subnets.avax.network/dispatch/testnet/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Dispatch Explorer', url: 'https://subnets.avax.network/dispatch/testnet' },
  },
  testnet: true,
} as const;

// Custom chain for Echo (Avalanche L1)
const echoTestnet = {
  id: 397,
  name: 'Echo Testnet',
  network: 'echo-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Echo',
    symbol: 'ECHO',
  },
  rpcUrls: {
    public: { http: ['https://subnets.avax.network/echo/testnet/rpc'] },
    default: { http: ['https://subnets.avax.network/echo/testnet/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Echo Explorer', url: 'https://subnets.avax.network/echo/testnet' },
  },
  testnet: true,
} as const;

// Custom chain for Polygon Amoy
const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    public: { http: ['https://rpc-amoy.polygon.technology'] },
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'Amoy Explorer', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
} as const;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    dispatchTestnet,
    echoTestnet,
    sepolia,
    polygonAmoy,
  ],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        switch (chain.id) {
          case 779672:
            return { http: 'https://subnets.avax.network/dispatch/testnet/rpc' };
          case 397:
            return { http: 'https://subnets.avax.network/echo/testnet/rpc' };
          case 11155111:
            return { http: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY' };
          case 80002:
            return { http: 'https://rpc-amoy.polygon.technology' };
          default:
            return null;
        }
      },
    }),
    publicProvider(),
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'Avalanche Cross-Chain Swap',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains,
});

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export { chains }; 