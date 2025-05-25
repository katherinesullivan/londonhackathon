# 🦖 T-rex - Prehistoric Cross-Chain Bridge

**RAWR! Stomp through the blockchain jungle like a prehistoric beast!** 🦕

A fun, T-rex themed cross-chain bridge connecting Avalanche L1s with external blockchains using Teleporter and Chainlink CCIP.

## 🌿 Overview

T-rex enables seamless token swapping between prehistoric blockchain networks:
- **Avalanche L1s** (Dispatch, Echo) using Teleporter
- **External Chains** (Ethereum Sepolia, Polygon Amoy) via CCIP
- **Hybrid Routes** with realistic mock pricing data

## 🦴 Key Features

### 🎨 T-rex Jungle Theme
- **Prehistoric UI** with jungle green color scheme
- **T-rex Branding** throughout the interface
- **Cave-themed Wallet** connection with 🏔️ icons
- **Subtle T-rex Background** elements for immersion

### 🌐 Supported Networks (4 Prehistoric Testnets)
- **Dispatch Testnet** (779672) - Avalanche L1 🦖
- **Echo Testnet** (397) - Avalanche L1 🦕  
- **Ethereum Sepolia** (11155111) - External chain
- **Polygon Amoy** (80002) - External chain

### 💰 Realistic Mock Pricing
- **Real Market Prices**: ETH ($2,500), MATIC ($0.35), AVAX ($22.80)
- **Dynamic Slippage**: 0.1% - 3% based on trade size and liquidity
- **Realistic Fees**: Gas ($0.08 - $8.50), Bridge ($0.80 - $3.50), Protocol (0.05%)
- **Time Estimates**: 30s - 20min depending on route complexity

## 🚀 Quick Start

### 1. Setup & Installation
```bash
# Clone and setup
git clone <repository>
cd londonhackathon

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### 2. Access the T-rex Bridge
- **URL**: http://localhost:3001 (or next available port)
- **Default Route**: Dispatch → Polygon Amoy
- **Default Tokens**: DIS → MATIC

### 3. Feed the T-rex! 🍖
Get test tokens from faucets:
- **Dispatch**: https://test.core.app/tools/testnet-faucet/?subnet=dispatch&token=dispatch
- **Echo**: https://test.core.app/tools/testnet-faucet/?subnet=echo&token=echo  
- **Sepolia**: https://faucets.chain.link/sepolia
- **Polygon Amoy**: https://faucet.polygon.technology/

## 🦖 T-rex Interface Features

### 🎯 Main Swap Interface
- **T-rex Swap Header** with prehistoric branding
- **From/To Selectors**: "T-rex starts here" → "T-rex destination"
- **Feed Input**: "🍖 Feed me!" placeholder
- **Route Display**: Shows Teleporter, CCIP, or Hybrid routes

### 🏔️ Cave-Themed Wallet Connection
- **Green Theme**: Matches jungle aesthetic
- **Cave Icon**: 🏔️ represents T-rex habitat
- **Connect State**: Shows wallet address with cave branding

### 🦴 T-rex Feeding Costs
- **Cost Breakdown**: Gas, Bridge, Protocol fees
- **Mock Data Badge**: "🦖 Mock" indicator
- **Confidence Levels**: High/Medium/Low based on trade parameters

### 🔄 Prehistoric Route Types
- **Teleporter**: Avalanche L1 ↔ L1 (fastest)
- **CCIP**: External ↔ External (standard)
- **Hybrid Route**: L1 → External (multi-hop)
- **CCIP + Teleporter**: External → L1 (complex)

## 🌿 Technical Architecture

### Frontend (Next.js + TypeScript)
```
frontend/
├── pages/
│   ├── index.tsx           # Main T-rex interface
│   └── _app.tsx           # Wallet providers
├── src/
│   ├── components/
│   │   ├── SwapInterface.tsx    # Main swap component
│   │   ├── WalletConnect.tsx    # Cave-themed wallet
│   │   ├── ChainSelector.tsx    # Network selection
│   │   └── TokenSelector.tsx    # Token selection
│   ├── constants/
│   │   ├── chains.ts           # 4 supported networks
│   │   └── tokens.ts           # Token configurations
│   ├── utils/
│   │   ├── contracts.ts        # Mock pricing engine
│   │   └── wallet.ts           # Wallet management
│   └── styles/
│       └── globals.css         # Jungle theme CSS
```

### 🎨 Jungle Theme Styling
- **Color Palette**: Green/Emerald/Teal gradients
- **Background**: `from-green-900 via-emerald-900 to-teal-900`
- **Components**: Green focus states, borders, buttons
- **Animations**: Jungle-themed pulse and shimmer effects

### 🦖 Mock Data Engine
```typescript
// Real market prices (January 2025)
const REAL_TOKEN_PRICES = {
  DIS: 0.0075,      // Dispatch token
  ECHO: 0.012,      // Echo token  
  ETH: 2500,        // Ethereum
  MATIC: 0.35,      // Polygon
  AVAX: 22.80,      // Avalanche
  USDC: 1.00,       // Stablecoin
  LINK: 15.30       // Chainlink
};
```

## 🔧 Configuration

### Environment Setup
```env
# Frontend environment (.env.local)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ENVIRONMENT=development
```

### Default Configuration
- **From Chain**: Dispatch (Avalanche L1)
- **To Chain**: Polygon Amoy (External)
- **Slippage**: 0.5% default
- **Mock Data**: Always enabled for demo

## 🦕 User Experience Flow

### 1. Landing Experience
- **T-rex Branding**: Immediate prehistoric theme
- **Jungle Background**: Subtle T-rex silhouettes
- **Default Setup**: Ready to swap Dispatch → Amoy

### 2. Wallet Connection
- **Cave Theme**: 🏔️ Connect Wallet button
- **Green Styling**: Matches jungle aesthetic
- **Status Display**: Shows connected address with cave icon

### 3. Token Swapping
- **Feed the T-rex**: Enter amount to "feed" the beast
- **Route Calculation**: T-rex "thinks" and calculates best path
- **Cost Display**: "T-rex Feeding Costs" breakdown
- **Execution**: "🦖 RAWR! Execute Swap" button

### 4. Loading States
- **Calculating**: "🦖 T-rex is calculating..."
- **Processing**: "🦖 T-rex is stomping..."
- **Thinking**: "🦖 T-rex is thinking..."

## 🎯 Demo Features

### ✅ Implemented
- **T-rex Themed UI** with jungle aesthetics
- **4 Testnet Support** (Dispatch, Echo, Sepolia, Amoy)
- **Realistic Mock Pricing** based on real market data
- **Dynamic Fee Calculation** with proper slippage
- **Route Type Detection** (Teleporter/CCIP/Hybrid)
- **Cave-themed Wallet** connection
- **Responsive Design** for all screen sizes

### 🔄 Mock Data System
- **Real Price Feeds**: Current market values
- **Dynamic Slippage**: 0.1% - 3% based on conditions
- **Realistic Fees**: Chain-specific gas costs
- **Time Estimates**: Route complexity based
- **Confidence Scoring**: Trade size and route dependent

## 🛠️ Development

### Adding New Prehistoric Networks
1. Update `frontend/src/constants/chains.ts`
2. Add to `SUPPORTED_CHAINS` object
3. Configure in wagmi providers

### Customizing T-rex Theme
1. Modify `frontend/src/styles/globals.css`
2. Update color variables and animations
3. Add new T-rex themed components

### Mock Data Customization
1. Edit `frontend/src/utils/contracts.ts`
2. Update `REAL_TOKEN_PRICES` object
3. Modify fee calculation logic

## 🚨 Current Status

### ✅ Frontend Complete
- **T-rex Theme**: Fully implemented
- **Mock Data**: Realistic pricing system
- **4 Networks**: All configured and working
- **Wallet Integration**: Cave-themed and functional

### ⚠️ Smart Contracts
- **Status**: Mock data only (no real contract calls)
- **Reason**: Focus on frontend demo experience
- **Future**: Can be connected to real contracts

### 🎯 Demo Ready
- **URL**: http://localhost:3001
- **Default**: Dispatch → Amoy swap ready
- **Experience**: Full T-rex themed journey

## 🦖 T-rex Easter Eggs

- **Background Elements**: Subtle T-rex silhouettes
- **Loading Messages**: Prehistoric themed states
- **Error Handling**: "T-rex is confused!" messages
- **Button Text**: "Wake up T-rex!" and "RAWR! Execute"
- **Input Placeholders**: "🍖 Feed me!" for amounts

## 📱 Responsive Design

- **Mobile Optimized**: Works on all screen sizes
- **Touch Friendly**: Large buttons and inputs
- **Compact Layout**: Efficient use of space
- **Jungle Theme**: Consistent across devices

## 🎉 Demo Instructions

1. **Start Server**: `cd frontend && npm run dev`
2. **Open Browser**: Navigate to http://localhost:3001
3. **Connect Wallet**: Click cave-themed connect button
4. **Feed T-rex**: Enter amount in "🍖 Feed me!" input
5. **Watch Magic**: See realistic pricing calculations
6. **Execute Swap**: Click "🦖 RAWR! Execute Swap"

---

**🦖 Built for London Hackathon 2024** 
*Stomp through the blockchain jungle with prehistoric power!* 🌿🦕