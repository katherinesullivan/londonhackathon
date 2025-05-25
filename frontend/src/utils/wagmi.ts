import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { avalancheFuji, arbitrumSepolia, polygonAmoy, sepolia } from 'wagmi/chains';
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

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    avalancheFuji,
    dispatchTestnet,
    arbitrumSepolia,
    polygonAmoy,
    sepolia,
  ],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        switch (chain.id) {
          case 43113:
            return { http: 'https://api.avax-test.network/ext/bc/C/rpc' };
          case 779672:
            return { http: 'https://subnets.avax.network/dispatch/testnet/rpc' };
          case 421614:
            return { http: 'https://sepolia-rollup.arbitrum.io/rpc' };
          case 80002:
            return { http: 'https://rpc-amoy.polygon.technology' };
          case 11155111:
            return { http: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY' };
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