require('hardhat-gas-reporter')
require('hardhat-spdx-license-identifier')
require('hardhat-deploy')
require('hardhat-abi-exporter')
require('@nomiclabs/hardhat-ethers')
require('dotenv/config')
require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-waffle')
require('solidity-coverage')
require('@matterlabs/hardhat-zksync-solc')
require('./tasks')


const { PRIVATE_KEY, INFURA_KEY} = process.env;
let accounts = [];
accounts.push(PRIVATE_KEY);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: 'hardhat',
  gasReporter: {
    enabled: false,
  },
  abiExporter: {
    path: './abi',
    only: [":IMOS*", ":IMapo*", ":Omni*", ":IFee*"],
    clear: false,
    flat: true
  },
  networks: {
    hardhat: {
      forking: {
        enabled: false,
        url: `https://rpc.maplabs.io/`
      },
      allowUnlimitedContractSize: true,
      live: true,
      saveDeployments: false,
      tags: ['local'],
      timeout: 2000000,
      chainId:212,
      blockNumber: 8553005
    },
    Mapo: {
      url: `https://rpc.maplabs.io/`,
      chainId: 22776,
      accounts: accounts,
    },

    Matic: {
      url: `https://rpc.ankr.com/polygon`,
      chainId: 137,
      accounts: accounts,
    },

    Bsc: {
      url: `https://rpc.ankr.com/bsc`,
      chainId: 56,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Eth: {
      url: `https://mainnet.infura.io/v3/` + INFURA_KEY,
      chainId: 1,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Klaytn: {
      url: `https://klaytn.blockpi.network/v1/rpc/public`,
      chainId: 8217,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Tron: {
      url: `https://api.trongrid.io/jsonrpc`,
      chainId: 728126428,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Conflux: {
      url: `https://evm.confluxrpc.com`,
      chainId: 1030,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Merlin: {
      url: `https://rpc.merlinchain.io/`,
      chainId: 4200,
      gasPrice: 50000000,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Blast: {
      url: `https://rpc.blast.io`,
      chainId : 81457,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Base: {
      url: `https://mainnet.base.org`,
      chainId: 8453,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    Ainn: {
      url: `https://mainnet-rpc.anvm.io`,
      chainId : 2649,
      gasPrice: 50000000,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    zkSync: {
      url: `https://mainnet.era.zksync.io`,
      chainId: 324,
      zksync: true,
      ethNetwork: "Eth",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Arbitrum: {
      url: `https://1rpc.io/arb`,
      chainId : 42161,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    B2: {
      url: `https://rpc.bsquared.network`,
      chainId : 223,
      gasPrice: 10000,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },

    Makalu: {
      url: `https://testnet-rpc.maplabs.io/`,
      chainId: 212,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    Sepolia: {
      url: `https://1rpc.io/sepolia`,
      chainId: 11155111,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    ArbitrumSepolia: {
      chainId: 421614,
      url: `https://arbitrum-sepolia.blockpi.network/v1/rpc/public`,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    BscTest: {
      url: `https://data-seed-prebsc-2-s1.binance.org:8545/`,
      chainId: 97,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    TronTest: {
      url: `https://nile.trongrid.io/jsonrpc`,
      chainId: 3448148188,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    OpSepolia: {
      url: `https://sepolia.optimism.io`,
      chainId : 11155420,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    zkSyncTest: {
      url: `https://sepolia.era.zksync.dev`,
      chainId: 300,
      zksync: true,
      ethNetwork: "Sepolia",
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
    DodoTest: {
      url: `https://dodochain-testnet.alt.technology`,
      chainId : 53457,
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
  },
  zksolc: {
    version: "1.4.1",
    compilerSource: "binary",
    settings: {},
  },
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  mocha: {
    timeout: 2000000
  },
  etherscan: {
    apiKey: {
      Bttc: process.env.API_KEY_BTTC,
      Eth:  process.env.API_KEY_ETH,
      Bsc:  process.env.API_KEY_BSC,
      polygon: process.env.API_KEY_MATIC,
      Blast: process.env.API_KEY_BLAST,
      Base: process.env.API_KEY_BASE,
      zkSync: process.env.API_KEY_ZKSYNC,
      Optimism: process.env.API_KEY_OP,
      Arbitrum: process.env.API_KEY_ARBITRUM,
      Linea: process.env.API_KEY_LINEA,
      Scroll: process.env.API_KEY_SCROLL,
      Mantle: process.env.API_KEY_MANTLE,
      Sepolia: process.env.API_KEY_ETH,
      BscTest: process.env.API_KEY_BSC,
      ArbitrumSepolia: process.env.API_KEY_ARBITRUM,
    },
    customChains: [
      {
        network: "Bttc",
        chainId: 199,
        urls: {
          apiURL: "https://api.bttcscan.com/api",
          browserURL: "https://bttcscan.com/",
        },
      },
      {
        network: "Eth",
        chainId: 1,
        urls: {
          apiURL: "https://api.etherscan.io/api",
          browserURL: "https://etherscan.io/",
        },
      },
      {
        network: "Sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io/",
        },
      },
      {
        network: "Bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com/",
        },
      },
      {
        network: "BscTest",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com/",
        },
      },
      {
        network: "Matic",
        chainId: 237,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com/",
        },
      },
      {
        network: "Blast",
        chainId: 81457,
        urls: {
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io/",
        },
      },
      {
        network: "Base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
      {
        network: "zkSync",
        chainId: 324,
        urls: {
          apiURL: "https://api-era.zksync.network/api",
          browserURL: "https://era.zksync.network/",
        },
      },
      {
        network: "Optimism",
        chainId: 10,
        urls: {
          apiURL: "https://api-optimistic.etherscan.io/api",
          browserURL: "https://optimistic.etherscan.io/",
        },
      },
      {
        network: "Arbitrum",
        chainId: 42161,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://arbiscan.io/",
        },
      },
      {
        network: "ArbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "Linea",
        chainId: 59144,
        urls: {
          apiURL: "https://api.lineascan.build/api",
          browserURL: "https://lineascan.build",
        },
      },
      {
        network: "Scroll",
        chainId: 534352,
        urls: {
          apiURL: "https://api.scrollscan.com/api",
          browserURL: "https://scrollscan.com/",
        },
      },
      {
        network: "Mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://api.mantlescan.xyz/api",
          browserURL: "https://mantlescan.xyz/",
        },
      }
    ],
  },
}