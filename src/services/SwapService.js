const 
    { 
        WETH_TOKEN, 
        POOL_FACTORY_CONTRACT_ADDRESS, 
        SWAP_ROUTER_CONTRACT_ADDRESS, 
        QUOTER_CONTRACT_ADDRESS, 
        SWAP_TYPE, 
        POOL_FEE_TIERS, 
        SEPOLIA_CHAIN_ID
    }                           = require("../utils/constants"),
    { 
        etherToWei, 
        weiToEther, 
        getContract, 
        gweiToEther, 
        etherToGwei, 
        convertAmount
    }                           = require("../utils/helper"),
    FACTORY_ABI                 = require('../utils/abis/factory.json'),
    QUOTER_ABI                  = require('../utils/abis/quoter.json'),
    POOL_ABI                    = require('../utils/abis/pool.json'),
    TOKEN_IN_ABI                = require('../utils/abis/weth.json'),
    SWAP_ROUTER_ABI             = require('../utils/abis/swaprouter.json'),
    { FlashbotsBundleProvider } = require("@flashbots/ethers-provider-bundle")
;

class SwapService {
    constructor(providerService, walletService) {
        this.providerService    = providerService;
        this.walletService      = walletService;
        this.factoryContract    = getContract(POOL_FACTORY_CONTRACT_ADDRESS, FACTORY_ABI, this.providerService.provider);
        this.quoterContract     = getContract(QUOTER_CONTRACT_ADDRESS, QUOTER_ABI, this.walletService.wallet);
    }

    async swap(token, amount, type) {
        const flashBotProvider = await this.createFlashbotProvider();

        amount = convertAmount(token, amount, type);

        try {
            const approvalTransaction = await this.getApprovalTransaction(token, amount, type);

            const approveGasLimit = await this.providerService.provider.estimateGas({
                ...approvalTransaction,
                from: this.walletService.wallet.address
            });

            const { poolContract, fee } = await this.getPoolInfo(
                this.factoryContract, 
                type === SWAP_TYPE.SWAP ? WETH_TOKEN : token, 
                type === SWAP_TYPE.SWAP ? token : WETH_TOKEN, 
            );

            console.log(`-------------------------------`)
            console.log(`Fetching Quote for: ${
                type === SWAP_TYPE.SWAP ? WETH_TOKEN.symbol : token.symbol
            } to ${
                type === SWAP_TYPE.SWAP ? token.symbol : WETH_TOKEN.symbol
            }`);
            console.log(`-------------------------------`)
            console.log(`Swap Amount: ${
                type === SWAP_TYPE.SWAP ? weiToEther(amount) : gweiToEther(amount, token.decimals)
            }`);

            const quotedAmountOut = await this.quoteAndLogSwap(this.quoterContract, fee, amount, token, type);

            const params = await this.prepareSwapParams(poolContract, amount, quotedAmountOut, token, type);

            const swapRouter = getContract(SWAP_ROUTER_CONTRACT_ADDRESS, SWAP_ROUTER_ABI, this.walletService.wallet);

            const swapTransaction = await this.getSwapTransaction(swapRouter, params);

            const swapGasLimit = await this.providerService.provider.estimateGas({
                ...swapTransaction,
                from: this.walletService.wallet.address
            });

            const feeData = await this.providerService.provider.getFeeData();

            const maxFeePerGas = feeData.maxFeePerGas * 2n;

            const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 2n;
    
            console.log('maxPriorityFeePerGas: ', maxPriorityFeePerGas)

            const bundle = [
                {
                    signer: this.walletService.wallet, 
                    transaction: {
                        ...approvalTransaction,
                        chainId: SEPOLIA_CHAIN_ID,
                        gasLimit: approveGasLimit,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                    },
                },
                {
                    signer: this.walletService.wallet,
                    transaction: {
                        ...swapTransaction,
                        chainId: SEPOLIA_CHAIN_ID,
                        gasLimit: swapGasLimit,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                    },
                }
            ];
    
            const blockNumber       = await this.providerService.provider.getBlockNumber();

            const bundleResponse    = await flashBotProvider.sendBundle(bundle, blockNumber + 1);
    
            console.log('bundleResponse: ', bundleResponse)

            const bundleReceipt = await bundleResponse.wait();

            console.log('bundleReceipt: ', bundleReceipt)
            if (bundleReceipt === 1) {
                console.log(`Flashbots Bundle Confirmed! Approval + Swap executed`);
            } else {
                console.log(`Flashbots Bundle Not Included`);
            }
        } catch (error) {
            console.error("An error occurred:", error.message);
        }
    }

    async approveTokenTransaction(tokenAddress, tokenABI, amount) {
        const wallet = this.walletService.wallet;

        try {
            const tokenContract = getContract(tokenAddress, tokenABI, wallet);

            const transaction = await tokenContract.approve.populateTransaction(
                SWAP_ROUTER_CONTRACT_ADDRESS,
                amount
            );

            console.log(`-------------------------------`)
            console.log(`Approval Transaction Created`);
            console.log(`-------------------------------`)

            return transaction;
        } catch (error) {
            console.error("An error occurred during token approval:", error);
            throw new Error("Token approval failed");
        }
    }

    async getPoolInfo(factoryContract, tokenIn, tokenOut) {
        const poolAddress = await factoryContract.getPool(tokenIn.address, tokenOut.address, POOL_FEE_TIERS[1]);

        if (!poolAddress) {
            throw new Error("Failed to get pool address");
        }

        const poolContract = getContract(poolAddress, POOL_ABI, this.providerService.provider);
        
        const [ fee ] = await Promise.all([
            poolContract.fee(),
        ]);

        return { poolContract, fee };
    }

    async quoteAndLogSwap(quoterContract, fee, amountIn, token, type) {
        const quotedAmountOut = await quoterContract.quoteExactInputSingle.staticCall({
            tokenIn             : type === SWAP_TYPE.SWAP ? WETH_TOKEN.address : token.address,
            tokenOut            : type === SWAP_TYPE.SWAP ? token.address : WETH_TOKEN.address,
            sqrtPriceLimitX96   : 0n,  
            amountIn            : BigInt(amountIn),
            fee                 : BigInt(fee),
        });

        console.log(`-------------------------------`)
        console.log(`Estimated Gas Cost: ${gweiToEther(quotedAmountOut[3].toString())} ETH`)
        console.log(`-------------------------------`)

        const finalTokenValue = type === SWAP_TYPE.SWAP ? gweiToEther(quotedAmountOut[0].toString(), token.decimals) + ` ${token.symbol}` : weiToEther(quotedAmountOut[0].toString()) + ` ${WETH_TOKEN.symbol}`;
        const fromTokenValue = type === SWAP_TYPE.SWAP ? weiToEther(amountIn) + ` ${WETH_TOKEN.symbol}` : gweiToEther(amountIn, token.decimals) + ` ${token.symbol}`;

        console.log(`Token Swap will result in: ${finalTokenValue} for ${fromTokenValue}`);

        return quotedAmountOut[0].toString();
    }

    async prepareSwapParams(poolContract, amountIn, amountOutMinimum, token, type) {
        return {
            tokenIn                 : type === SWAP_TYPE.SWAP ? WETH_TOKEN.address : token.address,
            tokenOut                : type === SWAP_TYPE.SWAP ? token.address : WETH_TOKEN.address,
            fee                     : await poolContract.fee(),
            recipient               : this.walletService.wallet.address,
            sqrtPriceLimitX96       : 0,
            amountOutMinimum,
            amountIn,
        };
    }
    
    async getSwapTransaction(swapRouter, params) {
        const transaction = await swapRouter.exactInputSingle.populateTransaction(params);
        
        console.log(`-------------------------------`)
        console.log(`Swap Transaction Created`);
        console.log(`-------------------------------`)

        return transaction;
    }

    async createFlashbotProvider() {
        return await FlashbotsBundleProvider.create(
            this.providerService.provider, 
            this.walletService.wallet,     
            process.env.FLASHBOT_ENDPOINT,
            'sepolia'  
        );
    }

    async getApprovalTransaction(token, amount, type) {
        let transaction;

        // always approve with base token
        if (type === SWAP_TYPE.SWAP) {
            transaction = await this.approveTokenTransaction(WETH_TOKEN.address, TOKEN_IN_ABI, amount);
        } else {
            transaction = await this.approveTokenTransaction(token.address, TOKEN_IN_ABI, amount);
        }

        return transaction;
    }
}

module.exports = SwapService; 