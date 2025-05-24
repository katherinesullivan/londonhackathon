// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LiquidityAggregator.sol";
import "../src/CrossChainSwapRouter.sol";

contract DeployScript is Script {
    // Fuji testnet addresses
    address constant FUJI_CCIP_ROUTER = 0x554472a2720E5E7D5D3C817529aBA05EEd5F82D8;
    address constant FUJI_TELEPORTER = 0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf;
    
    // Fuji DEXs
    address constant TRADER_JOE_ROUTER = 0x60aE616a2155Ee3d9A68541Ba4544862310933d4;
    address constant TRADER_JOE_FACTORY = 0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy LiquidityAggregator
        LiquidityAggregator aggregator = new LiquidityAggregator();
        console.log("LiquidityAggregator deployed at:", address(aggregator));
        
        // Deploy CrossChainSwapRouter
        CrossChainSwapRouter router = new CrossChainSwapRouter(
            FUJI_CCIP_ROUTER,
            FUJI_TELEPORTER,
            deployer // Fee recipient
        );
        console.log("CrossChainSwapRouter deployed at:", address(router));
        
        // Configure LiquidityAggregator
        console.log("Configuring LiquidityAggregator...");
        
        // Add TraderJoe DEX
        aggregator.addDEX(
            43113, // Fuji chain ID
            "TraderJoe",
            TRADER_JOE_FACTORY,
            TRADER_JOE_ROUTER,
            150000, // Gas overhead
            95 // Reliability score
        );
        
        // Set gas price for Fuji
        aggregator.updateGasPrice(43113, 25 gwei);
        
        // Configure CrossChainSwapRouter
        console.log("Configuring CrossChainSwapRouter...");
        
        // Add supported DEX
        router.addDEX(TRADER_JOE_ROUTER);
        
        // Add supported chains (example chain selectors)
        router.addChainlinkChain(16015286601757825753); // Sepolia
        router.addChainlinkChain(12532609583862916517); // Mumbai
        
        vm.stopBroadcast();
        
        console.log("\nDeployment complete!");
        console.log("LiquidityAggregator:", address(aggregator));
        console.log("CrossChainSwapRouter:", address(router));
        
        // Write deployment addresses to file
        string memory deploymentInfo = string(abi.encodePacked(
            "LIQUIDITY_AGGREGATOR=", vm.toString(address(aggregator)), "\n",
            "CROSS_CHAIN_ROUTER=", vm.toString(address(router)), "\n"
        ));
        
        vm.writeFile(".env.deployed", deploymentInfo);
        console.log("\nDeployment addresses saved to .env.deployed");
    }
}