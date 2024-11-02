const { ethers } = require("ethers");

class ProviderService {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_ENDPOINT);
    }
}

module.exports = ProviderService;