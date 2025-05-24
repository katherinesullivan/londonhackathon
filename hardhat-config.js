require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

// Ensure environment variables are defined
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo";
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-mainnet.g.alchemy.com/v2/demo";
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      },
      viaIR: true
    }
  },
  
  networks: {
    // Local network for testing
    hardhat: {
      chainId: 31337,
      forking: {
        url: AVALANCHE_RPC_URL,
        blockNumber: 37500000, // Pin to a specific block for consistent tests
        enabled: false // Set to true to enable forking
      },
      mining: {
        auto: true,
        interval: 0
      }
    },
    
    // Avalanche networks
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : [],
      gasPrice: 25000000000, // 25 gwei
      gas: 8000000
    },
    
    avalanche: {
      url: AVALANCHE_RPC_URL,
      chainId: 43114,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : [],
      gasPrice: 25000000000,
      gas: 8000000
    },
    
    // External networks for CCIP
    ethereum: {
      url: ETHEREUM_RPC_URL,
      chainId: 1,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : []
    },
    
    sepolia: {
      url: "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : []
    },
    
    polygon: {
      url: POLYGON_RPC_URL,
      chainId: 137,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : [],
      gasPrice: 100000000000 // 100 gwei
    },
    
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : [],
      gasPrice: 35000000000
    },
    
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : []
    },
    
    optimism: {
      url: "https://mainnet.optimism.io",
      chainId: 10,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" 
        ? [PRIVATE_KEY] 
        : []
    }
  },
  
  // Contract verification
  etherscan: {
    apiKey: {
      avalanche: SNOWTRACE_API_KEY,
      avalancheFujiTestnet: SNOWTRACE_API_KEY,
      mainnet: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
      polygonMumbai: POLYGONSCAN_API_KEY
    },
    customChains: [
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://snowtrace.io"
        }
      },
      {
        network: "avalancheFujiTestnet",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io"
        }
      }
    ]
  },
  
  // Gas reporter configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 25,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    outputFile: process.env.GAS_REPORT_FILE,
    noColors: false,
    showTimeSpent: true,
    showMethodSig: true
  },
  
  // Paths
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
    deployments: "./deployments"
  },
  
  // Mocha test configuration
  mocha: {
    timeout: 120000, // 2 minutes timeout for cross-chain tests
    reporter: "spec"
  },
  
  // Compiler configuration
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true
  },
  
  // Type chain
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  
  // External contracts (for verification)
  external: {
    contracts: [
      {
        artifacts: "node_modules/@chainlink/contracts/abi/v0.8",
        deploy: "node_modules/@chainlink/contracts/deploy"
      },
      {
        artifacts: "node_modules/@openzeppelin/contracts/build/contracts",
        deploy: "node_modules/@openzeppelin/contracts/deploy"
      }
    ]
  },
  
  // Named accounts for deployment
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0, // mainnet
      43114: 0, // avalanche
      43113: 0, // fuji
    },
    feeRecipient: {
      default: 1,
      1: "0x...", // Set mainnet fee recipient
      43114: "0x...", // Set avalanche fee recipient
    }
  },
  
  // Defender (optional - for upgrades)
  defender: {
    apiKey: process.env.DEFENDER_API_KEY,
    apiSecret: process.env.DEFENDER_API_SECRET
  }
};

// Tasks
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs, hre) => {
    const balance = await hre.ethers.provider.getBalance(taskArgs.account);
    console.log(hre.ethers.utils.formatEther(balance), "ETH");
  });

task("verify-all", "Verify all deployed contracts", async (taskArgs, hre) => {
  const deployments = await hre.deployments.all();
  for (const [name, deployment] of Object.entries(deployments)) {
    console.log(`Verifying ${name} at ${deployment.address}`);
    try {
      await hre.run("verify:verify", {
        address: deployment.address,
        constructorArguments: deployment.args
      });
    } catch (error) {
      console.error(`Failed to verify ${name}:`, error.message);
    }
  }
});