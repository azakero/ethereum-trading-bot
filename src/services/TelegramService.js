const 
    { TelegramClient }              = require('telegram'),
    { StringSession }               = require('telegram/sessions'),
    { NewMessage }                  = require('telegram/events'),
    { isAddress }                   = require('ethers'),
    fs                              = require('fs'),
    input                           = require('input')
;

class TelegramService {
    client;

    channel;

    apiId;

    apiHash;

    sessionFilePath;

    constructor(channel, swapService) {
        this.channel            = channel;
        this.apiId              = Number(process.env.TELEGRAM_API_ID);
        this.apiHash            = process.env.TELEGRAM_API_HASH;
        this.sessionFilePath    = './session.txt';
        this.swapService        = swapService;
        this.walletService      = swapService.walletService;
        this.providerService    = swapService.providerService;
    }

    async startClient() {
        this.client = this.#initClient(this.#getSessionString());

        await this.client.start({
            phoneNumber: async () => await input.text('Please enter your number: '),
            password: async () => await input.text('Please enter your password: '),
            phoneCode: async () => await input.text('Please enter the code you received: '),
            onError: (err) => console.log(err),
        });

        this.#saveSession();
        this.#startListener();
    }

    #getSessionString() {
        let sessionString = '';
        
        if (fs.existsSync(this.sessionFilePath)) {
            sessionString = fs.readFileSync(this.sessionFilePath, 'utf-8');
        }

        return new StringSession(sessionString);
    }

    #saveSession() {
        const savedSession = this.client.session.save();

        fs.writeFileSync(this.sessionFilePath, savedSession, 'utf-8');

        console.log('-------------------------------');
        console.log('Session saved.');
    }

    #initClient(stringSession) {
        return new TelegramClient(stringSession, this.apiId, this.apiHash, {
            connectionRetries: 5,
        });
    }

    #extractEthereumAddress(message) {
        const addressRegex = /(0x[a-fA-F0-9]{40})/;

        let match = message.match(addressRegex);

        if (!match) {
            const urlRegex  = /https?:\/\/[^\s]+/g;
            const urls      = message.match(urlRegex) || [];

            for (const url of urls) {
                const urlMatch = url.match(addressRegex);

                if (urlMatch) {
                    match = urlMatch;

                    break;
                }
            }
        }

        const ethereumAddress = match ? match[0] : null;

        if (ethereumAddress && isAddress(ethereumAddress)) {
            return ethereumAddress;
        }  else if (ethereumAddress) {
            throw new Error(`Invalid Ethereum address: ${ethereumAddress}`);
        } else {
            throw new Error('No Ethereum Address Found');
        }
    }

    async #startListener() {
        const channel = await this.client.getEntity(this.channel);

        if (channel?.id) {
            console.log('-------------------------------');
            console.log('Listening for new messages...');

            this.client.addEventHandler(async event => {
                const message = event.message;

                if (message && message.peerId.channelId.value === channel.id.value) {
                    const foundCall = message.message;

                    console.log('-------------------------------');
                    console.log('Message received. Extracting target token contract address...');

                    const contractAddress = this.#extractEthereumAddress(foundCall);

                    console.log('-------------------------------');
                    console.log('Successfully extracted contract address. Creating target token...')

                    try {
                        const targetToken = await this.walletService.createTargetToken(contractAddress);

                        if (!targetToken) {
                            throw new Error('Failed to create target token');
                        }

                        console.log('-------------------------------');
                        console.log(`Token with name ${targetToken.name} and symbol ${targetToken.symbol} has been created. Initiating swap operation...`)

                        await this.swapService.swap(targetToken, 0.1, 'swap');
                    } catch (error) {
                        throw error;
                    }
                }
            }, new NewMessage({}));
        }
    }
}

module.exports = TelegramService;