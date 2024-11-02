const
    dotenv              = require('dotenv'),
    SwapService         = require('./src/services/SwapService'),
    WalletService       = require('./src/services/WalletService'),
    ProviderService     = require('./src/services/ProviderService'),
    TelegramService     = require('./src/services/TelegramService')
;

dotenv.config();

class App {
    constructor() {
        this.providerService = new ProviderService();
        this.walletService = new WalletService(this.providerService);
        this.swapService = new SwapService(this.providerService, this.walletService);
        // this.telegramService    = new TelegramService('zakattackboomboom', this.swapService);
    }

    async init() {
        // await this.telegramService.startClient();

        await this.walletService.initiateWallet();
        // await this.swapService.swap(0.0001)
    }
}

const app = new App();

app
    .init()
    .then()
    .catch(err => console.log(err));
