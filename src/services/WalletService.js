const { ethers } = require("ethers");
const { fromReadableAmount, weiToEther, etherToWei, etherToGwei, gweiToEther } = require("../utils/conversion");
const abi = require('../utils/abis/abi.json');
const { WETH_CONTRACT_ADDRESS } = require("../utils/constants");

class WalletService {
    constructor(providerService) {
        this.providerService   = providerService;
        this.wallet            = new ethers.Wallet(process.env.PRIVATE_KEY, this.providerService.provider);
    }

    async initiateWallet() {
        const details = await this.getWETHBalance();
        
        console.log('details: ', details)
    }

    async getETHBalance() {
        const balanceInWei = await this.providerService.provider.getBalance(this.wallet.address);

        return weiToEther(balanceInWei);
    }

    async getWETHBalance() {
        const 
            wethContract = await new ethers.Contract(WETH_CONTRACT_ADDRESS, abi, this.providerService.provider),
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

    async getTokenContract(ca) {
        return new ethers.Contract(ca, abi, this.providerService.provider)
    }

    async getTokenDetails(ca) {
        const tokenContract = await this.getTokenContract(ca);

        return {
            symbol      : await tokenContract.symbol(),
            decimals    : await tokenContract.decimals(),
            name        : await tokenContract.name(),
            balance     : await tokenContract.balanceOf(this.wallet.address)
        }
    }
}

module.exports = WalletService;
