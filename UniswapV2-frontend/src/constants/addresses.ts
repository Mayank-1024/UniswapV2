import { Token } from '../utils/tokens';

// Tenderly Mainnet Fork addresses
export const FACTORY_ADDRESS = '0x7695808A24A45E78651667950e00cBef95E8B661';
export const ROUTER_ADDRESS = '0x370123a86Cb5d90dc70e6D060129a6CDaF2d3c6a';
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

// Tenderly Mainnet RPC URL
export const RPC_URL = 'https://virtual.mainnet.rpc.tenderly.co/f8509f2c-60c4-4512-8798-a092498ecd6e';

// Test tokens to display in the UI 
export const TEST_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: 'ETH',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628'
  },

  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: WETH_ADDRESS,
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png'
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/877/standard/chainlink-new-logo.png?1696502009'
  },
  {
    symbol: 'SUSHI',
    name: 'SushiToken',
    address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png'
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png'
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png'
  }, 

]; 