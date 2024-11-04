const 
    { WETH_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID }     = require("../utils/constants"),
    { weiToEther, getContract, gweiToEther }                     = require("../utils/helper"),
    { ethers }                                      = require("ethers"),
    { Token }                                       = require("@uniswap/sdk-core"),
    abi                                             = require('../utils/abis/abi.json')
;

class WalletService {
    constructor(providerService) {
        this.providerService   = providerService;
        this.wallet            = new ethers.Wallet(process.env.PRIVATE_KEY, this.providerService.provider);
        this.tokenDetails      = null;
    }

    async getETHBalance() {
        const balanceInWei = await this.providerService.provider.getBalance(this.wallet.address);

        return weiToEther(balanceInWei);
    }

    async getWETHBalance() {
        const 
            wethContract = await getContract(WETH_CONTRACT_ADDRESS, abi, this.providerService.provider),
            balanceInWei = await wethContract.balanceOf(this.wallet.address)
        ;

        return weiToEther(balanceInWei);
    }

    async getTokenBalance(ca) {
        const 
            tokenDetails    = await this.getTokenDetails(ca),
            balance         = (tokenDetails.balance.toNumber()) / (10 ** tokenDetails.decimals)  
        ;

        return balance;
    }

    async getTokenDetails(ca) {
        const 
            tokenContract   = await getContract(ca, abi, this.providerService.provider),
            symbol          = await tokenContract.symbol(),
            decimals        = await tokenContract.decimals(),
            name            = await tokenContract.name(),
            balance         = await tokenContract.balanceOf(this.wallet.address)
        ;

        return {
            symbol,
            decimals,
            name,
            balance : gweiToEther(balance.toString(), decimals)
        }
    }

    async createTargetToken(ca) {
        this.tokenDetails = await this.getTokenDetails(ca);

        return new Token(
            SEPOLIA_CHAIN_ID,
            ca,
            this.tokenDetails.decimals,
            this.tokenDetails.symbol,
            this.tokenDetails.name
        );
    }
}

module.exports = WalletService;
