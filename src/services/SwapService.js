const 
    { Token, Percent, CurrencyAmount, ChainId, TradeType }          = require("@uniswap/sdk-core"),
    { WETH_TOKEN, USDC_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, POOL_FACTORY_CONTRACT_ADDRESS, SWAP_ROUTER_CONTRACT_ADDRESS, QUOTER_CONTRACT_ADDRESS, POOL_FIE_TIERS }         = require("../utils/constants"),
    { AlphaRouter, SwapType }                                       = require("@uniswap/smart-order-router"),
    { fromReadableAmount, etherToWei, weiToEther, getContract, gweiToEther }                                          = require("../utils/helper"),
    { ethers } = require("ethers"),
    FACTORY_ABI = require('../utils/abis/factory.json'),
    QUOTER_ABI = require('../utils/abis/quoter.json'),
    POOL_ABI = require('../utils/abis/pool.json'),
    TOKEN_IN_ABI = require('../utils/abis/weth.json'),
    SWAP_ROUTER_ABI = require('../utils/abis/swaprouter.json')
;

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
        this.factoryContract    = getContract(POOL_FACTORY_CONTRACT_ADDRESS, FACTORY_ABI, this.providerService.provider);
        this.quoterContract     = getContract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, this.providerService.provider);
    }

    async swap(amount) {
        const amountIn = etherToWei(amount.toString());

        try {
            await this.approveToken(WETH_TOKEN.address, TOKEN_IN_ABI, amountIn);

            const USDC_TOKEN = await this.walletService.createTargetToken(USDC_CONTRACT_ADDRESS);

            const { poolContract, fee } = await this.getPoolInfo(
                this.factoryContract, 
                WETH_TOKEN, 
                USDC_TOKEN
            );

            console.log(`-------------------------------`)
            console.log(`Fetching Quote for: ${WETH_TOKEN.symbol} to ${USDC_TOKEN.symbol}`);
            console.log(`-------------------------------`)
            console.log(`Swap Amount: ${weiToEther(amountIn)}`);

            const quotedAmountOut = await this.quoteAndLogSwap(this.quoterContract, fee, amountIn);
    
            const params = await this.prepareSwapParams(poolContract, amountIn, quotedAmountOut);
            const swapRouter = new ethers.Contract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, this.walletService.wallet);

            await this.executeSwap(swapRouter, params);
        } catch (error) {
            console.error("An error occurred:", error.message);
        }
    }

    async approveToken(tokenAddress, tokenABI, amount) {
        const wallet = this.walletService.wallet;

        try {
            const tokenContract = getContract(tokenAddress, tokenABI, wallet);

            const approveTransaction = await tokenContract.populateTransaction.approve(
                SWAP_ROUTER_CONTRACT_ADDRESS,
                amount
            );
    
            const transactionResponse = await wallet.sendTransaction(approveTransaction);

            console.log(`-------------------------------`)
            console.log(`Sending Approval Transaction...`)
            console.log(`-------------------------------`)
            console.log(`Transaction Sent: ${transactionResponse.hash}`)
            console.log(`-------------------------------`)

            let receipt = null

            while (receipt === null) {
                try {
                    receipt = await this.providerService.provider.getTransactionReceipt(transactionResponse.hash)

                    if (receipt === null) {
                        continue
                    }
                } catch (e) {
                    console.log(`Receipt error:`, e)
                    break
                }
            }

            console.log(`Approval Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
        } catch (error) {
            console.error("An error occurred during token approval:", error);
            throw new Error("Token approval failed");
        }
    }

    async getPoolInfo(factoryContract, tokenIn, tokenOut) {
        const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, POOL_FIE_TIERS[1]);

        if (!poolAddress) {
            throw new Error("Failed to get pool address");
        }

        const poolContract = getContract(poolAddress, POOL_ABI, this.providerService.provider);
        
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
        console.log(`Estimated Gas Cost: ${gweiToEther(quotedAmountOut[3].toString())} WETH`)
        console.log(`-------------------------------`)
        console.log(`Token Swap will result in: ${gweiToEther(quotedAmountOut[0].toString(), USDC.decimals)} ${USDC.symbol} for ${weiToEther(amountIn)} ${WETH.symbol}`);
        
        return quotedAmountOut[0].toString();
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
    
    async executeSwap(swapRouter, params) {
        const transaction = await swapRouter.populateTransaction.exactInputSingle(params);
        const transactionResponse = await this.walletService.wallet.sendTransaction(transaction);

        console.log(`-------------------------------`)
        console.log(`Sending Swap Transaction...`)
        console.log(`-------------------------------`)
        console.log(`Transaction Sent: ${transactionResponse.hash}`)
        console.log(`-------------------------------`)

        let receipt = null

        while (receipt === null) {
            try {
                receipt = await this.providerService.provider.getTransactionReceipt(transactionResponse.hash)

                if (receipt === null) {
                    continue
                }
            } catch (e) {
                console.log(`Receipt error:`, e)
                break
            }
        }

        console.log(`Swap Transaction Confirmed! https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
        console.log(`-------------------------------`)
    }
}

module.exports = SwapService; 