const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, error = null) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (error) {
            logMessage += `\n${error.stack || error}`;
        }
        
        return logMessage;
    }

    writeToFile(level, message) {
        const today = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${today}.log`);
        
        fs.appendFileSync(logFile, message + '\n');
    }

    log(level, message, error = null) {
        const formattedMessage = this.formatMessage(level, message, error);
        

        switch (level) {
            case 'info':
                console.log(`\x1b[36m${formattedMessage}\x1b[0m`);
                break;
            case 'warn':
                console.log(`\x1b[33m${formattedMessage}\x1b[0m`);
                break;
            case 'error':
                console.log(`\x1b[31m${formattedMessage}\x1b[0m`);
                break;
            case 'success':
                console.log(`\x1b[32m${formattedMessage}\x1b[0m`);
                break;
            case 'debug':
                if (config.logger && config.logger.debug) {
                    console.log(`\x1b[35m${formattedMessage}\x1b[0m`);
                }
                break;
            default:
                console.log(formattedMessage);
        }
        

        if (config.logger && config.logger.fileLogging) {
            this.writeToFile(level, formattedMessage);
        }
    }

    info(message) {
        this.log('info', message);
    }

    warn(message) {
        this.log('warn', message);
    }

    error(message, error = null) {
        this.log('error', message, error);
    }

    debug(message) {
        this.log('debug', message);
    }

    success(message) {
        this.log('success', message);
    }
}

module.exports = new Logger();