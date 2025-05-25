const { ethers } = require('ethers');
const { CrossChainRouteOptimizer, ScoringModel } = require('./src/route_optimizer.js');

// Contract ABIs (simplified for testing)
const ROUTER_ABI = [
    "function initiateSwap((address,address,uint256,uint256,address,uint256,bytes)) external payable returns (bytes32)",
    "function isTokenSupported(address) external view returns (bool)",
    "function calculateFee(uint256) external pure returns (uint256)",
    "function getSupportedTokens() external view returns (address[])",
    "event SwapInitiated(bytes32 indexed swapId, address indexed user, address tokenIn, uint256 amountIn, address recipient)",
    "event TokensBridgedToFuji(bytes32 indexed swapId, address token, uint256 amount)"
];

const FORWARDER_ABI = [
    "function getSwapInfo(bytes32) external view returns ((address,address,address,uint256,address,uint256,bytes,bool,bool))",
    "function isChainSupported(uint64) external view returns (bool)",
    "function isTokenSupported(address) external view returns (bool)",
    "event TokensReceivedFromAvalanche(bytes32 indexed swapId, bytes32 sourceChain, address token, uint256 amount)",
    "event TokensForwardedToExternal(bytes32 indexed swapId, uint64 destinationChain, address token, uint256 amount)"
];

const ERC20_ABI = [
    "function balanceOf(address) external view returns (uint256)",
    "function transfer(address,uint256) external returns (bool)",
    "function approve(address,uint256) external returns (bool)",
    "function allowance(address,address) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)"
];

// Network configurations
const NETWORKS = {
    AVALANCHE_FUJI: {
        chainId: 43113,
        name: 'Avalanche Fuji C-Chain',
        rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
        isAvalanche: true,
        blockchainID: '0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5',
        tokens: {
            USDC: '0x5425890298aed601595a70AB815c96711a31Bc65',
            WAVAX: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c'
        }
    },
    POLYGON_AMOY: {
        chainId: 80002,
        name: 'Polygon Amoy',
        rpc: 'https://rpc-amoy.polygon.technology',
        isAvalanche: false,
        chainSelector: '16281711391670634445',
        tokens: {
            USDC: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
            WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
        }
    }
};

// Contract addresses (replace with actual deployed addresses)
const CONTRACT_ADDRESSES = {
    AVALANCHE_ROUTER: '0xda2C95B0922153382eAEaA6281Ce18e1f9D491d4', // Replace with actual
    FUJI_FORWARDER: '0x2345678901234567890123456789012345678901',   // Replace with actual
    POLYGON_ROUTER: '0xda2C95B0922153382eAEaA6281Ce18e1f9D491d4'    // Replace with actual
};

class CrossChainSwapTester {
    constructor() {
        this.providers = new Map();
        this.wallets = new Map();
        this.contracts = new Map();
        this.optimizer = new CrossChainRouteOptimizer();
    }

    async initialize(privateKey) {
        console.log('🚀 Initializing Cross-Chain Swap Tester...\n');

        // Setup providers and wallets
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            const provider = new ethers.JsonRpcProvider(config.rpc);
            const wallet = new ethers.Wallet(privateKey, provider);
            
            this.providers.set(networkName, provider);
            this.wallets.set(networkName, wallet);
            
            console.log(`✅ Connected to ${config.name}`);
            console.log(`   Address: ${wallet.address}`);
            
            // Check balance
            const balance = await provider.getBalance(wallet.address);
            console.log(`   Balance: ${ethers.formatEther(balance)} ${networkName === 'AVALANCHE_FUJI' ? 'AVAX' : 'MATIC'}\n`);
        }

        // Setup contracts
        await this.setupContracts();
    }

    async setupContracts() {
        console.log('📋 Setting up contract instances...\n');

        // Avalanche Router
        const avalancheWallet = this.wallets.get('AVALANCHE_FUJI');
        this.contracts.set('AVALANCHE_ROUTER', new ethers.Contract(
            CONTRACT_ADDRESSES.AVALANCHE_ROUTER,
            ROUTER_ABI,
            avalancheWallet
        ));

        // Fuji Forwarder
        this.contracts.set('FUJI_FORWARDER', new ethers.Contract(
            CONTRACT_ADDRESSES.FUJI_FORWARDER,
            FORWARDER_ABI,
            avalancheWallet
        ));

        // Polygon Router
        const polygonWallet = this.wallets.get('POLYGON_AMOY');
        this.contracts.set('POLYGON_ROUTER', new ethers.Contract(
            CONTRACT_ADDRESSES.POLYGON_ROUTER,
            ROUTER_ABI,
            polygonWallet
        ));

        console.log('✅ Contract instances created');
    }

    async testCrossChainSwap() {
        console.log('🔄 Starting Cross-Chain Swap Test: Avalanche Fuji → Polygon Amoy\n');

        try {
            // Step 1: Get optimal route
            console.log('1️⃣ Finding optimal route...');
            const route = await this.optimizer.findOptimalRoute(
                43113, // Avalanche Fuji
                80002, // Polygon Amoy
                NETWORKS.AVALANCHE_FUJI.tokens.USDC,
                NETWORKS.POLYGON_AMOY.tokens.USDC,
                '1000000', // 1 USDC (6 decimals)
                ScoringModel.MAX_OUTPUT
            );

            console.log(`✅ Route found:`);
            console.log(`   Expected output: ${route.expectedOutput} USDC`);
            console.log(`   Estimated time: ${route.estimatedTimeSeconds}s`);
            console.log(`   Net value: $${route.netValueUSD}`);
            console.log(`   Confidence: ${route.confidence}%\n`);

            // Step 2: Check token balances and approvals
            await this.checkTokenBalances();

            // Step 3: Prepare swap parameters
            const swapParams = await this.prepareSwapParams(route);

            // Step 4: Execute the swap
            const swapId = await this.executeSwap(swapParams);

            // Step 5: Monitor the swap progress
            await this.monitorSwapProgress(swapId);

            console.log('🎉 Cross-chain swap test completed successfully!');

        } catch (error) {
            console.error('❌ Cross-chain swap test failed:', error.message);
            throw error;
        }
    }

    async checkTokenBalances() {
        console.log('2️⃣ Checking token balances and approvals...');

        const avalancheWallet = this.wallets.get('AVALANCHE_FUJI');
        const usdcContract = new ethers.Contract(
            NETWORKS.AVALANCHE_FUJI.tokens.USDC,
            ERC20_ABI,
            avalancheWallet
        );

        const balance = await usdcContract.balanceOf(avalancheWallet.address);
        const decimals = await usdcContract.decimals();
        const symbol = await usdcContract.symbol();

        console.log(`   ${symbol} balance: ${ethers.formatUnits(balance, decimals)}`);

        if (balance < ethers.parseUnits('1', decimals)) {
            throw new Error('Insufficient USDC balance for test');
        }

        // Check allowance
        const allowance = await usdcContract.allowance(
            avalancheWallet.address,
            CONTRACT_ADDRESSES.AVALANCHE_ROUTER
        );

        if (allowance < ethers.parseUnits('1', decimals)) {
            console.log('   Approving USDC for router...');
            const approveTx = await usdcContract.approve(
                CONTRACT_ADDRESSES.AVALANCHE_ROUTER,
                ethers.parseUnits('10', decimals) // Approve 10 USDC
            );
            await approveTx.wait();
            console.log('   ✅ USDC approved');
        }

        console.log('   ✅ Token balances and approvals checked\n');
    }

    async prepareSwapParams(route) {
        console.log('3️⃣ Preparing swap parameters...');

        const avalancheWallet = this.wallets.get('AVALANCHE_FUJI');
        const polygonWallet = this.wallets.get('POLYGON_AMOY');

        // Encode route data for cross-chain routing
        const routeData = ethers.AbiCoder.defaultAbiCoder().encode(
            ['bool', 'uint64', 'address', 'uint256'],
            [
                true, // goesToExternal
                NETWORKS.POLYGON_AMOY.chainSelector,
                NETWORKS.AVALANCHE_FUJI.tokens.USDC,
                ethers.parseUnits('1', 6) // 1 USDC
            ]
        );

        const swapParams = {
            tokenIn: NETWORKS.AVALANCHE_FUJI.tokens.USDC,
            tokenOut: NETWORKS.POLYGON_AMOY.tokens.USDC,
            amountIn: ethers.parseUnits('1', 6), // 1 USDC
            minAmountOut: ethers.parseUnits('0.95', 6), // Accept 5% slippage
            recipient: polygonWallet.address,
            deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            routeData: routeData
        };

        console.log('   ✅ Swap parameters prepared');
        console.log(`   Amount in: ${ethers.formatUnits(swapParams.amountIn, 6)} USDC`);
        console.log(`   Min amount out: ${ethers.formatUnits(swapParams.minAmountOut, 6)} USDC`);
        console.log(`   Recipient: ${swapParams.recipient}\n`);

        return swapParams;
    }

    async executeSwap(swapParams) {
        console.log('4️⃣ Executing cross-chain swap...');

        const avalancheRouter = this.contracts.get('AVALANCHE_ROUTER');

        // Calculate required fee for Teleporter
        const teleporterFee = ethers.parseEther('0.01'); // 0.01 AVAX

        console.log(`   Sending transaction with ${ethers.formatEther(teleporterFee)} AVAX fee...`);

        const tx = await avalancheRouter.initiateSwap(swapParams, {
            value: teleporterFee,
            gasLimit: 500000
        });

        console.log(`   Transaction hash: ${tx.hash}`);
        console.log('   Waiting for confirmation...');

        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

        // Extract swap ID from events
        const swapInitiatedEvent = receipt.logs.find(log => {
            try {
                const parsed = avalancheRouter.interface.parseLog(log);
                return parsed.name === 'SwapInitiated';
            } catch {
                return false;
            }
        });

        if (!swapInitiatedEvent) {
            throw new Error('SwapInitiated event not found');
        }

        const parsedEvent = avalancheRouter.interface.parseLog(swapInitiatedEvent);
        const swapId = parsedEvent.args.swapId;

        console.log(`   Swap ID: ${swapId}\n`);
        return swapId;
    }

    async monitorSwapProgress(swapId) {
        console.log('5️⃣ Monitoring swap progress...');

        const fujiForwarder = this.contracts.get('FUJI_FORWARDER');
        const polygonWallet = this.wallets.get('POLYGON_AMOY');

        // Monitor for 10 minutes
        const timeout = Date.now() + 10 * 60 * 1000;
        let completed = false;

        while (Date.now() < timeout && !completed) {
            try {
                // Check swap info on Fuji Forwarder
                const swapInfo = await fujiForwarder.getSwapInfo(swapId);
                
                if (swapInfo.processed) {
                    console.log('   ✅ Swap processed on Fuji Forwarder');
                    
                    // Check final balance on Polygon
                    const polygonProvider = this.providers.get('POLYGON_AMOY');
                    const usdcContract = new ethers.Contract(
                        NETWORKS.POLYGON_AMOY.tokens.USDC,
                        ERC20_ABI,
                        polygonProvider
                    );

                    const finalBalance = await usdcContract.balanceOf(polygonWallet.address);
                    console.log(`   Final USDC balance on Polygon: ${ethers.formatUnits(finalBalance, 6)}`);
                    
                    completed = true;
                    break;
                }

                console.log('   ⏳ Swap still processing...');
                await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

            } catch (error) {
                console.log(`   ⚠️ Error checking swap status: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }

        if (!completed) {
            console.log('   ⚠️ Swap monitoring timed out after 10 minutes');
        }

        console.log('');
    }

    async checkContractStatus() {
        console.log('🔍 Checking contract deployment status...\n');

        for (const [contractName, address] of Object.entries(CONTRACT_ADDRESSES)) {
            console.log(`Checking ${contractName} at ${address}:`);

            try {
                // Determine which network to check
                let provider;
                if (contractName.includes('AVALANCHE') || contractName.includes('FUJI')) {
                    provider = this.providers.get('AVALANCHE_FUJI');
                } else {
                    provider = this.providers.get('POLYGON_AMOY');
                }

                const code = await provider.getCode(address);
                
                if (code === '0x') {
                    console.log(`   ❌ No contract deployed at this address`);
                } else {
                    console.log(`   ✅ Contract deployed (${code.length} bytes)`);
                    
                    // Try to call a view function
                    if (contractName.includes('ROUTER')) {
                        const contract = new ethers.Contract(address, ROUTER_ABI, provider);
                        try {
                            const tokens = await contract.getSupportedTokens();
                            console.log(`   📋 Supported tokens: ${tokens.length}`);
                        } catch (error) {
                            console.log(`   ⚠️ Could not call getSupportedTokens: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error checking contract: ${error.message}`);
            }
            
            console.log('');
        }
    }

    async runDiagnostics() {
        console.log('🔧 Running system diagnostics...\n');

        // Check network connectivity
        console.log('Network Connectivity:');
        for (const [networkName, provider] of this.providers.entries()) {
            try {
                const blockNumber = await provider.getBlockNumber();
                console.log(`   ✅ ${networkName}: Block ${blockNumber}`);
            } catch (error) {
                console.log(`   ❌ ${networkName}: ${error.message}`);
            }
        }
        console.log('');

        // Check contract status
        await this.checkContractStatus();

        // Check token contracts
        console.log('Token Contracts:');
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            console.log(`${networkName}:`);
            const provider = this.providers.get(networkName);
            
            for (const [symbol, address] of Object.entries(config.tokens)) {
                try {
                    const contract = new ethers.Contract(address, ERC20_ABI, provider);
                    const tokenSymbol = await contract.symbol();
                    const decimals = await contract.decimals();
                    console.log(`   ✅ ${symbol} (${tokenSymbol}): ${decimals} decimals`);
                } catch (error) {
                    console.log(`   ❌ ${symbol}: ${error.message}`);
                }
            }
            console.log('');
        }
    }
}

// Main execution function
async function main() {
    console.log('🌉 Cross-Chain Swap Testing Suite\n');
    console.log('='.repeat(50));

    // Replace with your private key (use environment variable in production)
    const privateKey = process.env.PRIVATE_KEY || '0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027';
    
    if (!privateKey || privateKey === '0x56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027') {
        console.log('⚠️  WARNING: Using default private key. Set PRIVATE_KEY environment variable for production use.\n');
    }

    const tester = new CrossChainSwapTester();

    try {
        // Initialize the tester
        await tester.initialize(privateKey);

        // Run diagnostics first
        await tester.runDiagnostics();

        // Ask user what to do
        const args = process.argv.slice(2);
        
        if (args.includes('--swap')) {
            // Execute actual swap test
            await tester.testCrossChainSwap();
        } else if (args.includes('--check')) {
            // Only run diagnostics
            console.log('✅ Diagnostics completed. Use --swap flag to execute test swap.');
        } else {
            console.log('Usage:');
            console.log('  node test-crosschain-swap.js --check    # Run diagnostics only');
            console.log('  node test-crosschain-swap.js --swap     # Execute test swap');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Export for use as module
module.exports = { CrossChainSwapTester, NETWORKS, CONTRACT_ADDRESSES };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 