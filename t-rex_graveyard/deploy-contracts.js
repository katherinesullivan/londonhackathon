const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Network configurations
const NETWORKS = {
    AVALANCHE_FUJI: {
        chainId: 43113,
        name: 'Avalanche Fuji C-Chain',
        rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
        nativeCurrency: 'AVAX',
        teleporter: '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf', // Avalanche Teleporter
        ccipRouter: '0xF694E193200268f9a4868e4Aa017A0118C9a8177', // CCIP Router on Fuji
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
        ccipRouter: '0x9C32fCB86BF0f4a1A8921a9Fe46de3198bb884B2', // CCIP Router on Amoy
        chainSelector: '16281711391670634445',
        tokens: {
            USDC: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
            WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'
        }
    },
    ARBITRUM_SEPOLIA: {
        chainId: 421614,
        name: 'Arbitrum Sepolia',
        rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
        nativeCurrency: 'ETH',
        ccipRouter: '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165', // CCIP Router on Arbitrum Sepolia
        chainSelector: '3478487238524512106',
        tokens: {
            USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
            WETH: '0xE591bf0A0CF924A0674d7792db046B23CEbF5f34'
        }
    }
};

// Contract compilation artifacts (you'll need to compile with Foundry first)
const CONTRACT_ARTIFACTS = {
    AVALANCHE_ROUTER: {
        name: 'CrossChainRouterAvalanche',
        path: './out/crosschain-router-avalanche.sol/CrossChainRouterAvalanche.json'
    },
    FUJI_FORWARDER: {
        name: 'FujiForwarder',
        path: './out/fuji_forwarder.sol/FujiForwarder.json'
    },
    EXTERNAL_ROUTER: {
        name: 'CrossChainRouterExternal',
        path: './out/crosschain_router_external.sol/CrossChainRouterExternal.json'
    }
};

class ContractDeployer {
    constructor() {
        this.providers = new Map();
        this.wallets = new Map();
        this.deployedContracts = new Map();
    }

    async initialize(privateKey) {
        console.log('🚀 Initializing Contract Deployer...\n');

        if (!privateKey) {
            throw new Error('Private key is required for deployment');
        }

        // Setup providers and wallets
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            try {
                const provider = new ethers.JsonRpcProvider(config.rpc);
                const wallet = new ethers.Wallet(privateKey, provider);
                
                this.providers.set(networkName, provider);
                this.wallets.set(networkName, wallet);
                
                console.log(`✅ Connected to ${config.name}`);
                console.log(`   Deployer Address: ${wallet.address}`);
                
                // Check balance
                const balance = await provider.getBalance(wallet.address);
                console.log(`   Balance: ${ethers.formatEther(balance)} ${config.nativeCurrency}`);
                
                if (balance < ethers.parseEther('0.1')) {
                    console.log(`   ⚠️  Low balance! You may need more ${config.nativeCurrency} for deployment`);
                }
                console.log('');
                
            } catch (error) {
                console.log(`❌ Failed to connect to ${config.name}: ${error.message}\n`);
            }
        }
    }

    loadContractArtifact(artifactPath) {
        try {
            const fullPath = path.resolve(artifactPath);
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Artifact file not found: ${fullPath}`);
            }
            
            const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            return {
                abi: artifact.abi,
                bytecode: artifact.bytecode.object
            };
        } catch (error) {
            console.log(`⚠️  Could not load artifact from ${artifactPath}: ${error.message}`);
            return null;
        }
    }

    async deployContract(contractName, networkName, constructorArgs = []) {
        console.log(`\n📋 Deploying ${contractName} to ${networkName}...`);

        const wallet = this.wallets.get(networkName);
        if (!wallet) {
            throw new Error(`Wallet not available for ${networkName}`);
        }

        const artifact = this.loadContractArtifact(CONTRACT_ARTIFACTS[contractName].path);
        if (!artifact) {
            console.log(`   ❌ Skipping deployment - artifact not found`);
            return null;
        }

        try {
            // Create contract factory
            const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
            
            // Estimate gas
            const estimatedGas = await factory.getDeployTransaction(...constructorArgs).then(tx => 
                wallet.estimateGas(tx)
            );
            
            console.log(`   Estimated gas: ${estimatedGas.toString()}`);
            
            // Deploy contract
            console.log(`   Deploying with args: [${constructorArgs.join(', ')}]`);
            const contract = await factory.deploy(...constructorArgs, {
                gasLimit: estimatedGas * 120n / 100n // Add 20% buffer
            });
            
            console.log(`   Transaction hash: ${contract.deploymentTransaction().hash}`);
            console.log(`   Waiting for confirmation...`);
            
            // Wait for deployment
            await contract.waitForDeployment();
            const address = await contract.getAddress();
            
            console.log(`   ✅ ${contractName} deployed to: ${address}`);
            
            // Store deployment info
            this.deployedContracts.set(`${contractName}_${networkName}`, {
                address,
                contract,
                network: networkName,
                deploymentHash: contract.deploymentTransaction().hash
            });
            
            return { address, contract };
            
        } catch (error) {
            console.log(`   ❌ Deployment failed: ${error.message}`);
            return null;
        }
    }

    async deployFujiForwarder() {
        console.log('\n🌉 Deploying Fuji Forwarder (Hub Contract)...');
        
        const network = NETWORKS.AVALANCHE_FUJI;
        const wallet = this.wallets.get('AVALANCHE_FUJI');
        
        const constructorArgs = [
            network.teleporter,  // teleporter address
            wallet.address       // fee recipient (deployer for now)
        ];
        
        return await this.deployContract('FUJI_FORWARDER', 'AVALANCHE_FUJI', constructorArgs);
    }

    async deployAvalancheRouter(fujiForwarderAddress) {
        console.log('\n🏔️  Deploying Avalanche Router...');
        
        const network = NETWORKS.AVALANCHE_FUJI;
        const wallet = this.wallets.get('AVALANCHE_FUJI');
        
        if (!fujiForwarderAddress) {
            console.log('   ❌ Fuji Forwarder address required');
            return null;
        }
        
        const constructorArgs = [
            network.teleporter,      // teleporter address
            fujiForwarderAddress,    // fuji forwarder address
            wallet.address           // fee recipient
        ];
        
        return await this.deployContract('AVALANCHE_ROUTER', 'AVALANCHE_FUJI', constructorArgs);
    }

    async deployPolygonRouter(fujiForwarderAddress) {
        console.log('\n🔷 Deploying Polygon Router...');
        
        const network = NETWORKS.POLYGON_AMOY;
        const wallet = this.wallets.get('POLYGON_AMOY');
        
        if (!fujiForwarderAddress) {
            console.log('   ❌ Fuji Forwarder address required');
            return null;
        }
        
        const constructorArgs = [
            network.ccipRouter,      // CCIP router address
            network.chainSelector,   // chain selector
            wallet.address,          // fee recipient
            fujiForwarderAddress     // fuji forwarder address
        ];
        
        return await this.deployContract('EXTERNAL_ROUTER', 'POLYGON_AMOY', constructorArgs);
    }

    async deployArbitrumRouter(fujiForwarderAddress) {
        console.log('\n🔵 Deploying Arbitrum Router...');
        
        const network = NETWORKS.ARBITRUM_SEPOLIA;
        const wallet = this.wallets.get('ARBITRUM_SEPOLIA');
        
        if (!fujiForwarderAddress) {
            console.log('   ❌ Fuji Forwarder address required');
            return null;
        }
        
        const constructorArgs = [
            network.ccipRouter,      // CCIP router address
            network.chainSelector,   // chain selector
            wallet.address,          // fee recipient
            fujiForwarderAddress     // fuji forwarder address
        ];
        
        return await this.deployContract('EXTERNAL_ROUTER', 'ARBITRUM_SEPOLIA', constructorArgs);
    }

    async configureContracts() {
        console.log('\n⚙️  Configuring deployed contracts...');
        
        // Get deployed contracts
        const fujiForwarder = this.deployedContracts.get('FUJI_FORWARDER_AVALANCHE_FUJI');
        
        if (!fujiForwarder) {
            console.log('   ❌ Fuji Forwarder not deployed, skipping configuration');
            return;
        }

        try {
            // Configure supported chains on Fuji Forwarder
            console.log('   Adding supported CCIP chains to Fuji Forwarder...');
            
            const forwarderContract = fujiForwarder.contract;
            
            // Add Polygon Amoy
            const polygonTx = await forwarderContract.addSupportedCCIPChain(
                NETWORKS.POLYGON_AMOY.chainSelector
            );
            await polygonTx.wait();
            console.log('   ✅ Added Polygon Amoy support');
            
            // Add Arbitrum Sepolia
            const arbitrumTx = await forwarderContract.addSupportedCCIPChain(
                NETWORKS.ARBITRUM_SEPOLIA.chainSelector
            );
            await arbitrumTx.wait();
            console.log('   ✅ Added Arbitrum Sepolia support');
            
            // Add Avalanche L1 support (example blockchain ID)
            const avalancheL1Id = '0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5';
            const avalancheTx = await forwarderContract.addSupportedAvalancheChain(avalancheL1Id);
            await avalancheTx.wait();
            console.log('   ✅ Added Avalanche L1 support');
            
        } catch (error) {
            console.log(`   ⚠️  Configuration error: ${error.message}`);
        }
    }

    async deployAll() {
        console.log('🚀 Starting Full Deployment Process...\n');
        console.log('='.repeat(60));

        const deploymentResults = {};

        try {
            // Step 1: Deploy Fuji Forwarder (hub contract)
            const fujiForwarder = await this.deployFujiForwarder();
            if (fujiForwarder) {
                deploymentResults.fujiForwarder = fujiForwarder.address;
            }

            // Step 2: Deploy Avalanche Router
            const avalancheRouter = await this.deployAvalancheRouter(fujiForwarder?.address);
            if (avalancheRouter) {
                deploymentResults.avalancheRouter = avalancheRouter.address;
            }

            // Step 3: Deploy Polygon Router
            const polygonRouter = await this.deployPolygonRouter(fujiForwarder?.address);
            if (polygonRouter) {
                deploymentResults.polygonRouter = polygonRouter.address;
            }

            // Step 4: Deploy Arbitrum Router
            const arbitrumRouter = await this.deployArbitrumRouter(fujiForwarder?.address);
            if (arbitrumRouter) {
                deploymentResults.arbitrumRouter = arbitrumRouter.address;
            }

            // Step 5: Configure contracts
            await this.configureContracts();

            // Step 6: Generate deployment report
            await this.generateDeploymentReport(deploymentResults);

            console.log('\n🎉 Deployment process completed!');
            return deploymentResults;

        } catch (error) {
            console.error('\n❌ Deployment failed:', error.message);
            throw error;
        }
    }

    async generateDeploymentReport(results) {
        console.log('\n📄 Deployment Report');
        console.log('='.repeat(40));

        const report = {
            timestamp: new Date().toISOString(),
            deployer: this.wallets.get('AVALANCHE_FUJI')?.address,
            contracts: results,
            networks: {}
        };

        // Add network information
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            report.networks[networkName] = {
                chainId: config.chainId,
                name: config.name,
                rpc: config.rpc
            };
        }

        // Display results
        console.log('\nDeployed Contracts:');
        for (const [contractName, address] of Object.entries(results)) {
            console.log(`  ${contractName}: ${address}`);
        }

        // Save to file
        const reportPath = './deployment-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📁 Report saved to: ${reportPath}`);

        // Update contract addresses in test files
        await this.updateTestFiles(results);
    }

    async updateTestFiles(deploymentResults) {
        console.log('\n🔄 Updating test files with deployed addresses...');

        const updates = {
            AVALANCHE_ROUTER: deploymentResults.avalancheRouter,
            FUJI_FORWARDER: deploymentResults.fujiForwarder,
            POLYGON_ROUTER: deploymentResults.polygonRouter,
            ARBITRUM_ROUTER: deploymentResults.arbitrumRouter
        };

        // Update test-crosschain-swap.js
        try {
            const testFilePath = './test-crosschain-swap.js';
            if (fs.existsSync(testFilePath)) {
                let content = fs.readFileSync(testFilePath, 'utf8');
                
                for (const [contractName, address] of Object.entries(updates)) {
                    if (address) {
                        const regex = new RegExp(`${contractName}: '0x[a-fA-F0-9]{40}'`, 'g');
                        content = content.replace(regex, `${contractName}: '${address}'`);
                    }
                }
                
                fs.writeFileSync(testFilePath, content);
                console.log('   ✅ Updated test-crosschain-swap.js');
            }
        } catch (error) {
            console.log(`   ⚠️  Could not update test file: ${error.message}`);
        }

        // Update verify-contracts.js
        try {
            const verifyFilePath = './verify-contracts.js';
            if (fs.existsSync(verifyFilePath)) {
                let content = fs.readFileSync(verifyFilePath, 'utf8');
                
                for (const [contractName, address] of Object.entries(updates)) {
                    if (address) {
                        const regex = new RegExp(`${contractName}: '0x[a-fA-F0-9]{40}'`, 'g');
                        content = content.replace(regex, `${contractName}: '${address}'`);
                    }
                }
                
                fs.writeFileSync(verifyFilePath, content);
                console.log('   ✅ Updated verify-contracts.js');
            }
        } catch (error) {
            console.log(`   ⚠️  Could not update verify file: ${error.message}`);
        }
    }

    async checkPrerequisites() {
        console.log('🔍 Checking deployment prerequisites...\n');

        let allGood = true;

        // Check if contract artifacts exist
        console.log('Contract Artifacts:');
        for (const [contractName, artifact] of Object.entries(CONTRACT_ARTIFACTS)) {
            const exists = fs.existsSync(artifact.path);
            console.log(`  ${exists ? '✅' : '❌'} ${contractName}: ${artifact.path}`);
            if (!exists) allGood = false;
        }

        // Check wallet balances
        console.log('\nWallet Balances:');
        for (const [networkName, wallet] of this.wallets.entries()) {
            try {
                const balance = await wallet.provider.getBalance(wallet.address);
                const config = NETWORKS[networkName];
                const balanceFormatted = ethers.formatEther(balance);
                const sufficient = balance > ethers.parseEther('0.1');
                
                console.log(`  ${sufficient ? '✅' : '⚠️ '} ${config.name}: ${balanceFormatted} ${config.nativeCurrency}`);
                if (!sufficient) {
                    console.log(`      Need at least 0.1 ${config.nativeCurrency} for deployment`);
                }
            } catch (error) {
                console.log(`  ❌ ${networkName}: ${error.message}`);
                allGood = false;
            }
        }

        if (!allGood) {
            console.log('\n⚠️  Prerequisites not met. Please:');
            console.log('   1. Compile contracts with: forge build');
            console.log('   2. Fund deployer wallets with native tokens');
            console.log('   3. Ensure network connectivity');
        } else {
            console.log('\n✅ All prerequisites met!');
        }

        return allGood;
    }
}

// Main execution
async function main() {
    console.log('🚀 Cross-Chain Contract Deployment Tool\n');
    console.log('='.repeat(50));

    // Get private key from environment or command line
    const privateKey = process.env.PRIVATE_KEY || process.argv[2];
    
    if (!privateKey) {
        console.error('❌ Private key required!');
        console.log('Usage:');
        console.log('  PRIVATE_KEY=0x... node deploy-contracts.js');
        console.log('  node deploy-contracts.js 0x...');
        process.exit(1);
    }

    const deployer = new ContractDeployer();

    try {
        await deployer.initialize(privateKey);

        const args = process.argv.slice(2);

        if (args.includes('--check')) {
            await deployer.checkPrerequisites();
        } else if (args.includes('--deploy')) {
            const prereqsOk = await deployer.checkPrerequisites();
            if (prereqsOk) {
                await deployer.deployAll();
            } else {
                console.log('\n❌ Prerequisites not met. Use --check to see details.');
            }
        } else {
            console.log('Usage:');
            console.log('  node deploy-contracts.js --check   # Check prerequisites');
            console.log('  node deploy-contracts.js --deploy  # Deploy all contracts');
        }

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = { ContractDeployer, NETWORKS };

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 