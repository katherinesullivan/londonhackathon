#!/bin/bash

echo "Setting up Cross-Chain Swap Frontend..."
echo "====================================="

# Create directory structure
mkdir -p src/components
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/styles
mkdir -p src/pages
mkdir -p src/constants
mkdir -p public/icons

# Initialize Next.js with TypeScript
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Install additional dependencies
echo "Installing dependencies..."
npm install @rainbow-me/rainbowkit@^2.0.0 wagmi@^2.0.0 viem@^2.0.0 @tanstack/react-query@^5.0.0
npm install ethers@^5.7.2 react-hot-toast@^2.4.1
npm install @web3modal/ethereum @web3modal/react

# Install Core Wallet SDK
npm install @avalabs/core-wallets-sdk

echo "Setup complete! Run 'npm run dev' to start the development server."