const { telegramService } = require('./services/SharedService');

class App {
    async init() {
        try {
            await telegramService.startClient();
        } catch (error) {
            console.log('Error: ', error)
        }
    }
}

const mainApp = new App();

mainApp.init();

    