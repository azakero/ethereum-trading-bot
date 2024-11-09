const
    dotenv              = require('dotenv'),
    SwapService         = require('./SwapService'),
    WalletService       = require('./WalletService'),
    ProviderService     = require('./ProviderService'),
    TelegramService     = require('./TelegramService')
;

dotenv.config();

const 
    providerService     = new ProviderService(),
    walletService       = new WalletService(providerService),
    swapService         = new SwapService(providerService, walletService),
    telegramService     = new TelegramService('zakattackboomboom', swapService)
;

module.exports = {
    providerService,
    walletService,
    swapService,
    telegramService,
};
