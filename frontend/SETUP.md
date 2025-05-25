# Frontend Setup Guide

## 🚀 Quick Start

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
```

3. **Run Development Server**
```bash
npm run dev
```

4. **Open Browser**
Navigate to `http://localhost:3000`

## 📋 Required Configuration

### WalletConnect Project ID
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy the Project ID
4. Add to `.env.local`:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Infura (Optional)
For better Ethereum Sepolia connectivity:
1. Get API key from [Infura](https://infura.io)
2. Update RPC in `src/utils/wagmi.ts`

## 🔧 Features

### Supported Chains
- **Avalanche Fuji** (C-Chain testnet)
- **Dispatch Testnet** (Avalanche L1 example)
- **Arbitrum Sepolia**
- **Polygon Amoy**
- **Ethereum Sepolia**

### Supported Wallets
- **MetaMask** - Browser extension
- **Core Wallet** - Avalanche native wallet
- **WalletConnect** - Mobile wallets
- **Coinbase Wallet**
- **Rainbow Wallet**

### Routing Types
1. **Avalanche-only**: Uses Teleporter bridge
2. **Hybrid**: Teleporter → C-Chain → CCIP → External
3. **CCIP-only**: Direct CCIP bridge
4. **CCIP to Avalanche**: External → CCIP → C-Chain → Teleporter

## 🛠️ Development

### Project Structure
```
frontend/
├── pages/
│   ├── _app.tsx          # App configuration
│   └── index.tsx         # Main page
├── src/
│   ├── components/       # UI components
│   │   ├── SwapInterface.tsx
│   │   ├── ChainSelector.tsx
│   │   ├── TokenSelector.tsx
│   │   └── RouteDisplay.tsx
│   ├── constants/        # Configuration
│   │   ├── chains.ts
│   │   ├── tokens.ts
│   │   └── contracts.ts
│   ├── utils/           # Utilities
│   │   └── wagmi.ts
│   └── styles/          # CSS
│       └── globals.css
├── public/              # Static files
└── package.json
```

### Key Components

**SwapInterface**: Main swap UI with amount input, chain/token selection
**ChainSelector**: Dropdown for blockchain selection
**TokenSelector**: Dropdown for token selection  
**RouteDisplay**: Visual representation of swap routing

### Adding New Chains
1. Update `src/constants/chains.ts`
2. Add chain configuration to `src/utils/wagmi.ts`
3. Update token list in `src/constants/tokens.ts`

### Adding New Tokens
1. Update `src/constants/tokens.ts`
2. Add token contract addresses for each chain

## 🌐 Testnet Setup

### Get Test Tokens
- **Fuji AVAX**: [Avalanche Faucet](https://faucet.avax.network/)
- **Arbitrum ETH**: [Arbitrum Faucet](https://faucet.arbitrum.io/)
- **Polygon MATIC**: [Polygon Faucet](https://faucet.polygon.technology/)
- **Sepolia ETH**: [Sepolia Faucet](https://sepoliafaucet.com/)

### Network Configuration
Add these networks to your wallet:

**Avalanche Fuji**
- Network: Avalanche Fuji C-Chain
- RPC: https://api.avax-test.network/ext/bc/C/rpc
- Chain ID: 43113
- Symbol: AVAX
- Explorer: https://testnet.snowtrace.io

**Arbitrum Sepolia**
- Network: Arbitrum Sepolia
- RPC: https://sepolia-rollup.arbitrum.io/rpc
- Chain ID: 421614
- Symbol: ETH
- Explorer: https://sepolia.arbiscan.io

**Polygon Amoy**
- Network: Polygon Amoy
- RPC: https://rpc-amoy.polygon.technology
- Chain ID: 80002
- Symbol: MATIC
- Explorer: https://www.oklink.com/amoy

## 🚨 Known Issues

1. **Dependency Errors**: Install dependencies first: `npm install`
2. **Wallet Connection**: Ensure WalletConnect Project ID is set
3. **RPC Errors**: Some testnets may have connectivity issues
4. **Gas Estimation**: May not be accurate for cross-chain operations

## 📱 Mobile Support

The interface is responsive and works on mobile devices. For mobile wallets:
1. Use WalletConnect to connect
2. Scan QR code with wallet app
3. Approve connection in wallet

## 🔐 Security

- Only connect to official testnet RPC endpoints
- Never share private keys
- Use testnet funds only
- Verify contract addresses before interaction

## 📞 Support

For issues or questions:
1. Check console for error messages
2. Verify network connectivity
3. Ensure sufficient gas fees
4. Check testnet status pages 