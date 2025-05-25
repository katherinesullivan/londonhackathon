// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "src/CrossChainSwapRouter.sol";
import "src/LiquidityAggregator.sol";

contract DeployScript is Script {
    // Fuji testnet addresses
    address constant FUJI_CCIP_ROUTER = 0x554472a2720E5E7D5D3C817529aBA05EEd5F82D8;
    address constant FUJI_TELEPORTER = 0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf;
    
    // Fuji DEXs
    address constant TRADER_JOE_ROUTER = 0x60aE616a2155Ee3d9A68541Ba4544862310933d4;
    address constant TRADER_JOE_FACTORY = 0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10;
    
    // Mock addresses for local testing
    address constant LOCAL_CCIP_ROUTER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Anvil's account #1
    address constant LOCAL_TELEPORTER = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Anvil's account #2
    address constant LOCAL_DEX_ROUTER = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // Anvil's account #3
    address constant LOCAL_DEX_FACTORY = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65; // Anvil's account #4
    
    function run() external {
        uint256 deployerPrivateKey;
        address ccipRouter;
        address teleporter;
        address dexRouter;
        address dexFactory;
        uint256 chainId;
        
        string memory network = vm.envOr("NETWORK", string("local"));
        
        // Configure based on network
        if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("local"))) {
            // Local deployment with hardcoded key
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
            ccipRouter = LOCAL_CCIP_ROUTER;
            teleporter = LOCAL_TELEPORTER;
            dexRouter = LOCAL_DEX_ROUTER;
            dexFactory = LOCAL_DEX_FACTORY;
            chainId = 31337; // Anvil chain ID
            console.log("Deploying to local network");
        } else {
            // Testnet/mainnet deployment with .env file
            string memory privateKeyStr = vm.envString("PRIVATE_KEY");
            deployerPrivateKey = vm.parseUint(privateKeyStr);
            
            if (keccak256(abi.encodePacked(network)) == keccak256(abi.encodePacked("fuji"))) {
                ccipRouter = FUJI_CCIP_ROUTER;
                teleporter = FUJI_TELEPORTER;
                dexRouter = TRADER_JOE_ROUTER;
                dexFactory = TRADER_JOE_FACTORY;
                chainId = 43113; // Fuji chain ID
                console.log("Deploying to Fuji testnet");
            } else {
                revert("Unsupported network");
            }
        }
        
        address deployer = vm.addr(deployerPrivateKey);
        console.log("Deploying contracts with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy LiquidityAggregator
        LiquidityAggregator aggregator = new LiquidityAggregator();
        console.log("LiquidityAggregator deployed at:", address(aggregator));
        
        // Deploy CrossChainSwapRouter
        CrossChainSwapRouter router = new CrossChainSwapRouter(
            ccipRouter,
            teleporter,
            deployer // Fee recipient
        );
        console.log("CrossChainSwapRouter deployed at:", address(router));
        
        // Configure LiquidityAggregator
        console.log("Configuring LiquidityAggregator...");
        
        // Add DEX
        aggregator.addDEX(
            chainId,
            "DEX",
            dexFactory,
            dexRouter,
            150000, // Gas overhead
            95 // Reliability score
        );
        
        // Set gas price
        aggregator.updateGasPrice(chainId, 25 gwei);
        
        // Configure CrossChainSwapRouter
        console.log("Configuring CrossChainSwapRouter...");
        
        // Add supported DEX
        router.addDEX(dexRouter);
        
        // Add supported chains (example chain selectors)
        router.addChainlinkChain(16015286601757825753); // Sepolia
        router.addChainlinkChain(12532609583862916517); // Mumbai
        
        vm.stopBroadcast();
        
        console.log("\nDeployment complete!");
        console.log("LiquidityAggregator: ", address(aggregator));
        console.log("CrossChainSwapRouter: ", address(router));
        console.log("\nCopy these addresses to your .env.deployed file manually.");
    }
}