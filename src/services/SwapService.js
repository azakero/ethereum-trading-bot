const 
    { Token, Percent, CurrencyAmount, ChainId, TradeType }          = require("@uniswap/sdk-core"),
    { WETH_TOKEN, USDC_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, POOL_FACTORY_CONTRACT_ADDRESS, SWAP_ROUTER_CONTRACT_ADDRESS, QUOTER_CONTRACT_ADDRESS }         = require("../utils/constants"),
    { AlphaRouter, SwapType }                                       = require("@uniswap/smart-order-router"),
    { fromReadableAmount, etherToWei, weiToEther }                                          = require("../utils/conversion"),
    FACTORY_ABI = require('../utils/abis/factory.json'),
    QUOTER_ABI = require('../utils/abis/quoter.json'),
    POOL_ABI = require('../utils/abis/pool.json'),
    TOKEN_IN_ABI = require('../utils/abis/weth.json'),
    SWAP_ROUTER_ABI = require('../utils/abis/swaprouter.json')
;
const { ethers } = require("ethers");

const WETH = {
    chainId: 11155111,
    address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    isToken: true,
    isNative: true,
    wrapped: true
  }
  
const USDC = {
    chainId: 11155111,
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD//C',
    isToken: true,
    isNative: true,
    wrapped: false
}

class SwapService {
    constructor(providerService, walletService) {
        this.providerService    = providerService;
        this.walletService      = walletService;
    }

    async swap(amount) {
        const provider              = this.providerService.provider;
        const factoryContract       = new ethers.Contract(POOL_FACTORY_CONTRACT_ADDRESS, FACTORY_ABI, provider);
        const quoterContract        = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, provider);

        const inputAmount = amount;
        const amountIn = etherToWei(amount.toString());
    
        try {
            await this.approveToken(WETH.address, TOKEN_IN_ABI, amountIn);

            const { poolContract, token0, token1, fee } = await this.getPoolInfo(factoryContract, WETH, USDC);

            console.log(`-------------------------------`)
            console.log(`Fetching Quote for: ${WETH.symbol} to ${USDC.symbol}`);
            console.log(`-------------------------------`)
            console.log(`Swap Amount: ${weiToEther(amountIn)}`);
    
            const quotedAmountOut = await this.quoteAndLogSwap(quoterContract, fee, amountIn);
    
            const params = await this.prepareSwapParams(poolContract, amountIn, quotedAmountOut[0].toString());
            const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, this.walletService.wallet);

            await this.executeSwap(swapRouter, params);
        } catch (error) {
            console.error("An error occurred:", error.message);
        }
    }

    async approveToken(tokenAddress, tokenABI, amount) {
        const wallet = this.walletService.wallet;

        try {
            const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    
            const approveTransaction = await tokenContract.populateTransaction.approve(
                SWAP_ROUTER_CONTRACT_ADDRESS,
                etherToWei(amount.toString())
            );
    
            const transactionResponse = await wallet.sendTransaction(approveTransaction);

            console.log(`-------------------------------`)
            console.log(`Sending Approval Transaction...`)
            console.log(`-------------------------------`)
            console.log(`Transaction Sent: ${transactionResponse.hash}`)
            console.log(`-------------------------------`)

            const receipt = await transactionResponse.wait();

            console.log(`Approval Transaction Confirmed! https://sepolia.etherscan.io/txn/${receipt.hash}`);

        } catch (error) {
            console.error("An error occurred during token approval:", error);
            throw new Error("Token approval failed");
        }
    }

    async getPoolInfo(factoryContract, tokenIn, tokenOut) {
        const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, 3000);

        if (!poolAddress) {
            throw new Error("Failed to get pool address");
        }

        const poolContract = new ethers.Contract(poolAddress, POOL_ABI, this.providerService.provider);
        
        const [token0, token1, fee] = await Promise.all([
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
        ]);

        return { poolContract, token0, token1, fee };
    }

    async quoteAndLogSwap(quoterContract, fee, amountIn) {
        const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle({
            tokenIn: WETH.address,
            tokenOut: USDC.address,
            fee: fee,
            recipient: this.walletService.wallet.address,
            deadline: Math.floor(new Date().getTime() / 1000 + 60 * 10),
            amountIn: amountIn,
            sqrtPriceLimitX96: 0,
        });

        console.log(`-------------------------------`)
        console.log(`Token Swap will result in: ${ethers.utils.formatUnits(quotedAmountOut[0].toString(), USDC.decimals)} ${USDC.symbol} for ${ethers.utils.formatEther(amountIn)} ${WETH.symbol}`);
        
        const amountOut = ethers.utils.formatUnits(quotedAmountOut[0], USDC.decimals)
        
        return amountOut;
    }

    async prepareSwapParams(poolContract, amountIn, amountOut) {
        return {
            tokenIn: WETH.address,
            tokenOut: USDC.address,
            fee: await poolContract.fee(),
            recipient: this.walletService.wallet.address,
            amountIn: amountIn,
            amountOutMinimum: amountOut,
            sqrtPriceLimitX96: 0,
        };
    }
    
    async executeSwap(swapRouter, params, ) {
        const transaction = await swapRouter.populateTransaction.exactInputSingle(params);
        const receipt = await this.walletService.wallet.sendTransaction(transaction);

        console.log(`-------------------------------`)
        console.log(`Receipt: https://sepolia.etherscan.io/tx/${receipt.hash}`);
        console.log(`-------------------------------`)
    }

    async createTargetToken(ca) {
        const tokenDetails = await this.walletService.getTokenDetails(ca);

        return new Token(
            SEPOLIA_CHAIN_ID,
            ca,
            tokenDetails.decimals,
            tokenDetails.symbol,
            tokenDetails.name
        );
    }
}

module.exports = SwapService; 