# Frontend Structure - Cross-Chain Swap UI

## Project Structure

```
londonhackathon/
├── frontend/                     # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── SwapInterface.tsx
│   │   │   ├── ChainSelector.tsx
│   │   │   ├── TokenSelector.tsx
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── RouteDisplay.tsx
│   │   │   └── TransactionStatus.tsx
│   │   ├── hooks/
│   │   │   ├── useWallet.ts
│   │   │   ├── useTokenBalance.ts
│   │   │   ├── useSwapRoute.ts
│   │   │   └── useChainData.ts
│   │   ├── utils/
│   │   │   ├── chains.ts
│   │   │   ├── tokens.ts
│   │   │   ├── contracts.ts
│   │   │   └── format.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── pages/
│   │   │   ├── _app.tsx
│   │   │   └── index.tsx
│   │   └── constants/
│   │       ├── addresses.ts
│   │       └── abis.ts
│   ├── public/
│   │   └── icons/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── .env.local
├── src/                         # Smart contracts (existing)
├── script/                      # Deploy scripts (existing)
└── test/                        # Tests (existing)
```

## Setup Commands

```bash
# From root directory
cd frontend
npm install
npm run dev
```

## Supported Chains & Tokens

### Testnets:
1. **Avalanche Fuji C-Chain** (43113)
2. **Avalanche L1 Testnet** (Custom - you'll choose)
3. **Arbitrum Sepolia** (421614)
4. **Polygon Amoy** (80002)

### Test Tokens:
- AVAX (native)
- USDC (test version)
- Custom L1 Token