const { Token } = require("@uniswap/sdk-core");

const
    SWAP_TYPE                                                   = {
        SWAP                       : 'swap',
        REVERSE_SWAP               : 'reverseSwap'
    },
    WETH_SYMBOL                                                 = 'WETH',
    WETH_CONTRACT_ADDRESS                                       = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
    USDC_CONTRACT_ADDRESS                                       = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    SEPOLIA_CHAIN_ID                                            = 11155111,
    WRAP_UNWRAP_ABI                                             = ['function deposit() payable', 'function withdraw(uint wad) public'],
    WETH_TOKEN                                                  = new Token(SEPOLIA_CHAIN_ID, WETH_CONTRACT_ADDRESS, 18, WETH_SYMBOL, 'Wrapped Ether'),
    POOL_FACTORY_CONTRACT_ADDRESS                               = '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
    QUOTER_CONTRACT_ADDRESS                                     = '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
    SWAP_ROUTER_CONTRACT_ADDRESS                                = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
    POOL_FEE_TIERS                                              = [500, 3000, 10000]

;

module.exports = {
    WETH_SYMBOL,
    WETH_CONTRACT_ADDRESS,
    SEPOLIA_CHAIN_ID,
    USDC_CONTRACT_ADDRESS,
    WRAP_UNWRAP_ABI,
    WETH_TOKEN,
    POOL_FACTORY_CONTRACT_ADDRESS,
    QUOTER_CONTRACT_ADDRESS,
    SWAP_ROUTER_CONTRACT_ADDRESS,
    POOL_FEE_TIERS,
    SWAP_TYPE,
}