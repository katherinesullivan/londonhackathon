const { ethers } = require('ethers');

// Contract ABIs for verification
const AVALANCHE_ROUTER_ABI = [
    "function initiateSwap((address,address,uint256,uint256,address,uint256,bytes)) external payable returns (bytes32)",
    "function isTokenSupported(address) external view returns (bool)",
    "function calculateFee(uint256) external pure returns (uint256)",
    "function getSupportedTokens() external view returns (address[])",
    "function owner() external view returns (address)",
    "function feeRecipient() external view returns (address)",
    "function PROTOCOL_FEE_BPS() external view returns (uint256)",
    "function teleporter() external view returns (address)",
    "function fujiForwarder() external view returns (address)"
];

const FUJI_FORWARDER_ABI = [
    "function getSwapInfo(bytes32) external view returns ((address,address,address,uint256,address,uint256,bytes,bool,bool))",
    "function isChainSupported(uint64) external view returns (bool)",
    "function isTokenSupported(address) external view returns (bool)",
    "function owner() external view returns (address)",
    "function feeRecipient() external view returns (address)",
    "function PROTOCOL_FEE_BPS() external view returns (uint256)",
    "function teleporter() external view returns (address)",
    "function supportedCCIPChains(uint64) external view returns (bool)",
    "function supportedAvalancheChains(bytes32) external view returns (bool)"
];

const EXTERNAL_ROUTER_ABI = [
    "function initiateSwap((address,address,uint256,uint256,address,uint256,bytes)) external payable returns (bytes32)",
    "function isTokenSupported(address) external view returns (bool)",
    "function calculateFee(uint256) external pure returns (uint256)",
    "function getSupportedTokens() external view returns (address[])",
    "function owner() external view returns (address)",
    "function feeRecipient() external view returns (address)",
    "function PROTOCOL_FEE_BPS() external view returns (uint256)",
    "function chainSelector() external view returns (uint64)",
    "function fujiForwarderAddress() external view returns (address)"
];

const ERC20_ABI = [
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function totalSupply() external view returns (uint256)",
    "function balanceOf(address) external view returns (uint256)"
];

// Network configurations
const NETWORKS = {
    AVALANCHE_FUJI: {
        chainId: 43113,
        name: 'Avalanche Fuji C-Chain',
        rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
        nativeCurrency: 'AVAX',
        tokens: {
            USDC: '0x5425890298aed601595a70AB815c96711a31Bc65',
            WAVAX: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c'
        }
    },
    POLYGON_AMOY: {
        chainId: 80002,
        name: 'Polygon Amoy',
        rpc: 'https://rpc-amoy.polygon.technology',
        nativeCurrency: 'MATIC',
        tokens: {
            USDC: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
            WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
        }
    }
};

// Contract addresses (update these with actual deployed addresses)
const CONTRACT_ADDRESSES = {
    AVALANCHE_ROUTER: '0xDCDf17e61996e017EDD87C7bC0C880eB4f8a4eb0', // Replace with actual
    FUJI_FORWARDER: '0x2345678901234567890123456789012345678901',   // Replace with actual
    POLYGON_ROUTER: '0xcA4145C21e73A5c94391C29D26e8D1A19434151c',    // Replace with actual
};

class ContractVerifier {
    constructor() {
        this.providers = new Map();
        this.contracts = new Map();
    }

    async initialize() {
        console.log('🔍 Initializing Contract Verifier...\n');

        // Setup providers
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            try {
                const provider = new ethers.JsonRpcProvider(config.rpc);
                await provider.getNetwork(); // Test connection
                this.providers.set(networkName, provider);
                console.log(`✅ Connected to ${config.name}`);
            } catch (error) {
                console.log(`❌ Failed to connect to ${config.name}: ${error.message}`);
            }
        }
        console.log('');
    }

    async verifyContractDeployment(contractName, address, networkName, abi) {
        console.log(`\n📋 Verifying ${contractName} on ${networkName}:`);
        console.log(`   Address: ${address}`);

        const provider = this.providers.get(networkName);
        if (!provider) {
            console.log('   ❌ Provider not available');
            return false;
        }

        try {
            // Check if contract exists
            const code = await provider.getCode(address);
            if (code === '0x') {
                console.log('   ❌ No contract deployed at this address');
                return false;
            }

            console.log(`   ✅ Contract deployed (${Math.floor(code.length / 2)} bytes)`);

            // Create contract instance
            const contract = new ethers.Contract(address, abi, provider);

            // Test basic functionality
            await this.testContractFunctions(contract, contractName);

            return true;

        } catch (error) {
            console.log(`   ❌ Error verifying contract: ${error.message}`);
            return false;
        }
    }

    async testContractFunctions(contract, contractName) {
        console.log('   🧪 Testing contract functions:');

        try {
            // Test owner function (common to all contracts)
            if (contract.owner) {
                const owner = await contract.owner();
                console.log(`      Owner: ${owner}`);
            }

            // Test fee recipient
            if (contract.feeRecipient) {
                const feeRecipient = await contract.feeRecipient();
                console.log(`      Fee Recipient: ${feeRecipient}`);
            }

            // Test protocol fee
            if (contract.PROTOCOL_FEE_BPS) {
                const fee = await contract.PROTOCOL_FEE_BPS();
                console.log(`      Protocol Fee: ${fee} BPS (${fee / 100}%)`);
            }

            // Contract-specific tests
            if (contractName.includes('ROUTER')) {
                await this.testRouterFunctions(contract);
            } else if (contractName.includes('FORWARDER')) {
                await this.testForwarderFunctions(contract);
            }

        } catch (error) {
            console.log(`      ⚠️ Error testing functions: ${error.message}`);
        }
    }

    async testRouterFunctions(contract) {
        try {
            // Test supported tokens
            if (contract.getSupportedTokens) {
                const tokens = await contract.getSupportedTokens();
                console.log(`      Supported tokens: ${tokens.length}`);
                tokens.forEach((token, index) => {
                    console.log(`        ${index + 1}. ${token}`);
                });
            }

            // Test fee calculation
            if (contract.calculateFee) {
                const fee = await contract.calculateFee(ethers.parseUnits('1', 6)); // 1 USDC
                console.log(`      Fee for 1 USDC: ${ethers.formatUnits(fee, 6)} USDC`);
            }

            // Test teleporter address (for Avalanche router)
            if (contract.teleporter) {
                const teleporter = await contract.teleporter();
                console.log(`      Teleporter: ${teleporter}`);
            }

            // Test chain selector (for external routers)
            if (contract.chainSelector) {
                const chainSelector = await contract.chainSelector();
                console.log(`      Chain Selector: ${chainSelector}`);
            }

        } catch (error) {
            console.log(`      ⚠️ Router function test error: ${error.message}`);
        }
    }

    async testForwarderFunctions(contract) {
        try {
            // Test supported CCIP chains
            if (contract.supportedCCIPChains) {
                const polygonSupported = await contract.supportedCCIPChains('16281711391670634445');
                console.log(`      Polygon Amoy supported: ${polygonSupported}`);
            }

            // Test teleporter
            if (contract.teleporter) {
                const teleporter = await contract.teleporter();
                console.log(`      Teleporter: ${teleporter}`);
            }

        } catch (error) {
            console.log(`      ⚠️ Forwarder function test error: ${error.message}`);
        }
    }

    async verifyTokenContracts() {
        console.log('\n🪙 Verifying Token Contracts:\n');

        for (const [networkName, config] of Object.entries(NETWORKS)) {
            console.log(`${config.name}:`);
            const provider = this.providers.get(networkName);

            if (!provider) {
                console.log('   ❌ Provider not available\n');
                continue;
            }

            for (const [symbol, address] of Object.entries(config.tokens)) {
                try {
                    const contract = new ethers.Contract(address, ERC20_ABI, provider);
                    const tokenSymbol = await contract.symbol();
                    const decimals = await contract.decimals();
                    const totalSupply = await contract.totalSupply();

                    console.log(`   ✅ ${symbol} (${tokenSymbol}):`);
                    console.log(`      Address: ${address}`);
                    console.log(`      Decimals: ${decimals}`);
                    console.log(`      Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);

                } catch (error) {
                    console.log(`   ❌ ${symbol}: ${error.message}`);
                }
            }
            console.log('');
        }
    }

    async checkNetworkStatus() {
        console.log('🌐 Network Status:\n');

        for (const [networkName, config] of Object.entries(NETWORKS)) {
            const provider = this.providers.get(networkName);
            
            if (!provider) {
                console.log(`❌ ${config.name}: Not connected`);
                continue;
            }

            try {
                const network = await provider.getNetwork();
                const blockNumber = await provider.getBlockNumber();
                const gasPrice = await provider.getFeeData();

                console.log(`✅ ${config.name}:`);
                console.log(`   Chain ID: ${network.chainId}`);
                console.log(`   Block Number: ${blockNumber}`);
                console.log(`   Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei')} gwei`);

            } catch (error) {
                console.log(`❌ ${config.name}: ${error.message}`);
            }
        }
        console.log('');
    }

    async runFullVerification() {
        console.log('🔍 Running Full Contract Verification\n');
        console.log('='.repeat(60));

        // Check network status
        await this.checkNetworkStatus();

        // Verify token contracts
        await this.verifyTokenContracts();

        // Verify deployed contracts
        console.log('📋 Verifying Deployed Contracts:\n');

        const verificationResults = [];

        // Avalanche Router
        const avalancheResult = await this.verifyContractDeployment(
            'AVALANCHE_ROUTER',
            CONTRACT_ADDRESSES.AVALANCHE_ROUTER,
            'AVALANCHE_FUJI',
            AVALANCHE_ROUTER_ABI
        );
        verificationResults.push({ name: 'Avalanche Router', success: avalancheResult });

        // Fuji Forwarder
        const forwarderResult = await this.verifyContractDeployment(
            'FUJI_FORWARDER',
            CONTRACT_ADDRESSES.FUJI_FORWARDER,
            'AVALANCHE_FUJI',
            FUJI_FORWARDER_ABI
        );
        verificationResults.push({ name: 'Fuji Forwarder', success: forwarderResult });

        // Polygon Router
        const polygonResult = await this.verifyContractDeployment(
            'POLYGON_ROUTER',
            CONTRACT_ADDRESSES.POLYGON_ROUTER,
            'POLYGON_AMOY',
            EXTERNAL_ROUTER_ABI
        );
        verificationResults.push({ name: 'Polygon Router', success: polygonResult });

        // Summary
        console.log('\n📊 Verification Summary:');
        console.log('='.repeat(40));
        
        let successCount = 0;
        verificationResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            if (result.success) successCount++;
        });

        console.log(`\n${successCount}/${verificationResults.length} contracts verified successfully`);

        if (successCount === verificationResults.length) {
            console.log('\n🎉 All contracts are deployed and functional!');
        } else {
            console.log('\n⚠️  Some contracts need attention. Please check deployment addresses.');
        }
    }

    async generateDeploymentReport() {
        console.log('\n📄 Deployment Report:\n');
        console.log('Contract Addresses:');
        console.log('==================');
        
        for (const [contractName, address] of Object.entries(CONTRACT_ADDRESSES)) {
            console.log(`${contractName}: ${address}`);
        }

        console.log('\nNetwork Information:');
        console.log('===================');
        
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            console.log(`${config.name} (${config.chainId}):`);
            console.log(`  RPC: ${config.rpc}`);
            console.log(`  Native Currency: ${config.nativeCurrency}`);
            console.log(`  Tokens:`);
            for (const [symbol, address] of Object.entries(config.tokens)) {
                console.log(`    ${symbol}: ${address}`);
            }
            console.log('');
        }
    }
}

// Main execution
async function main() {
    console.log('🔍 Cross-Chain Contract Verification Tool\n');
    console.log('='.repeat(50));

    const verifier = new ContractVerifier();

    try {
        await verifier.initialize();

        const args = process.argv.slice(2);

        if (args.includes('--full')) {
            await verifier.runFullVerification();
        } else if (args.includes('--tokens')) {
            await verifier.verifyTokenContracts();
        } else if (args.includes('--networks')) {
            await verifier.checkNetworkStatus();
        } else if (args.includes('--report')) {
            await verifier.generateDeploymentReport();
        } else {
            console.log('Usage:');
            console.log('  node verify-contracts.js --full      # Run full verification');
            console.log('  node verify-contracts.js --tokens    # Verify token contracts only');
            console.log('  node verify-contracts.js --networks  # Check network status');
            console.log('  node verify-contracts.js --report    # Generate deployment report');
        }

    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = { ContractVerifier, NETWORKS, CONTRACT_ADDRESSES };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 