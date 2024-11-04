const
    dotenv              = require('dotenv'),
    SwapService         = require('./src/services/SwapService'),
    WalletService       = require('./src/services/WalletService'),
    ProviderService     = require('./src/services/ProviderService'),
    TelegramService     = require('./src/services/TelegramService')
;
const { USDC_CONTRACT_ADDRESS } = require('./src/utils/constants');

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

        console.log('---------------------------------')
        console.log('Starting swap operation....')
        const USDC_TOKEN = await this.walletService.createTargetToken(USDC_CONTRACT_ADDRESS);

        await this.swapService.swap(USDC_TOKEN, this.walletService.tokenDetails.balance, 'reverseSwap')
        // await this.swapService.swap(USDC_TOKEN, 0.1, 'swap')
    }
}

const app = new App();

app
    .init()
    .then()
    .catch(err => console.log(err));
