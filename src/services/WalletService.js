const 
    { WETH_CONTRACT_ADDRESS }               = require("../utils/constants"),
    { weiToEther, getContract }             = require("../utils/helper"),
    { ethers }                              = require("ethers"),
    abi                                     = require('../utils/abis/abi.json')
;

class WalletService {
    constructor(providerService) {
        this.providerService   = providerService;
        this.wallet            = new ethers.Wallet(process.env.PRIVATE_KEY, this.providerService.provider);
    }

    async initiateWallet() {
        const balance = await this.getTokenBalance('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
        
        console.log('balance: ', balance)
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
        const tokenContract = await getContract(ca, abi, this.providerService.provider);

        return {
            symbol      : await tokenContract.symbol(),
            decimals    : await tokenContract.decimals(),
            name        : await tokenContract.name(),
            balance     : await tokenContract.balanceOf(this.wallet.address)
        }
    }
}

module.exports = WalletService;
