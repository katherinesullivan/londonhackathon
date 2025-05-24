# Makefile for Cross-Chain Swap Router

-include .env

.PHONY: help build test deploy

help:
	@echo "Cross-Chain Swap Router - Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make build      - Build contracts"
	@echo "  make test       - Run tests"
	@echo "  make test-gas   - Run tests with gas report"
	@echo "  make test-v     - Run tests with verbosity"
	@echo "  make deploy-local - Deploy to local anvil"
	@echo "  make deploy-fuji  - Deploy to Fuji testnet"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make format     - Format code"

install:
	@echo "Installing dependencies..."
	@forge install OpenZeppelin/openzeppelin-contracts@v4.9.3 --no-commit
	@forge install smartcontractkit/chainlink --no-commit
	@echo "Dependencies installed!"

build:
	@echo "Building contracts..."
	@forge build

test:
	@echo "Running tests..."
	@forge test

test-gas:
	@echo "Running tests with gas report..."
	@forge test --gas-report

test-v:
	@echo "Running tests with verbosity..."
	@forge test -vvv

deploy-local:
	@echo "Starting local anvil..."
	@anvil --fork-url $(AVALANCHE_FUJI_RPC) &
	@sleep 3
	@echo "Deploying to local..."
	@forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

deploy-fuji:
	@echo "Deploying to Fuji testnet..."
	@forge script script/Deploy.s.sol --rpc-url $(AVALANCHE_FUJI_RPC) --broadcast --verify

clean:
	@echo "Cleaning build artifacts..."
	@forge clean

format:
	@echo "Formatting code..."
	@forge fmt

# Advanced commands
coverage:
	@echo "Running coverage..."
	@forge coverage

snapshot:
	@echo "Creating gas snapshot..."
	@forge snapshot

slither:
	@echo "Running slither analysis..."
	@slither src/

# Utility commands
fund-deployer:
	@echo "Funding deployer on Fuji..."
	@echo "Please use https://faucet.avax.network/"

verify:
	@echo "Verifying contracts on Snowtrace..."
	@forge verify-contract $(CONTRACT) --chain-id 43113 --watch