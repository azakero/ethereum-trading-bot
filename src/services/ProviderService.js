const { JsonRpcProvider } = require("ethers");

class ProviderService {
    constructor() {
        this.provider = new JsonRpcProvider(process.env.RPC_ENDPOINT);
    }
}

module.exports = ProviderService;