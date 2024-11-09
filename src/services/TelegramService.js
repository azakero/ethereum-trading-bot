const 
    { TelegramClient }      = require('telegram'),
    { StringSession }       = require('telegram/sessions'),
    { NewMessage }          = require('telegram/events'),
    fs                      = require('fs'),
    input                   = require('input')
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

        console.log('Session saved.');
    }

    #initClient(stringSession) {
        return new TelegramClient(stringSession, this.apiId, this.apiHash, {
            connectionRetries: 5,
        });
    }

    #extractAddress(message) {
        const solanaAddressRegex    = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
        const solanaAddresses       = message.match(solanaAddressRegex) || [];

        if (solanaAddresses?.length === 0) {
            const urlRegex = /https?:\/\/[^\s]+/g;
            const urls = message.match(urlRegex) || [];

            if (urls?.length === 0) {
                return null;
            }

            const addressInUrl = urls[0].match(solanaAddressRegex) || [];

            if (addressInUrl?.length === 0) {
                return null;
            }

            return addressInUrl[0];
        }
        
        return solanaAddresses[0];
    }

    async #startListener() {
        const channel = await this.client.getEntity(this.channel);

        if (channel?.id) {
            console.log('Listening for new messages...');

            this.client.addEventHandler(async event => {
                const message = event.message;

                if (message && message.peerId.channelId.value === channel.id.value) {
                    const foundCall = message.message;

                    console.log('NEW MESSAGE')

                    console.log(foundCall)
                    // console.log(await this.walletService.getETHBalance())

                    // throw new Error('NEW MESSAGE ERROR')

                    // const contractAddress = this.#extractAddress(foundCall);

                    // console.log('contractAddress: ', contractAddress)

                    // if (!contractAddress) {
                    //     return;
                    // }

                    // try {
                    //     await this.swapService.buy(contractAddress);
                    // } catch (error) {
                    //     throw new Error(error);
                    // }
                }
            }, new NewMessage({}));
        }
    }
}

module.exports = TelegramService;