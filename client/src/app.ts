import { Gateway } from '@hyperledger/fabric-gateway';

import * as config from './utils/config';
import { CCHelper, TransactionStats } from './contract';

import { GatewayHelper, OrgProfile } from './gateway';
import { TransactionData } from './transactionData';
import { sleep } from './utils/helper';
import chalk = require('chalk');

interface Orgs {
    [key: string]: OrgProfile;
}

type ExitStatus = 0 | 1 | 2;

class App {
    keepRunning = true;

    gateway!: Gateway;

    ccHelper!: CCHelper;

    previousStats: TransactionStats | undefined;

    async main(): Promise<void> {
        this.displayConfig();
        const gwHelper = new GatewayHelper((config.orgs as Orgs)[config.org]);
        await this.configure(gwHelper);

        const transactionData: TransactionData = new TransactionData();

        const statsTimer = this.enableStatsOutput();
        while (this.keepRunning) {
            const clientConnectionState = await gwHelper.waitForReady();
            if (clientConnectionState === 'NotConnected') {

                await sleep(config.grpcSleepMax, config.grpcSleepMin);

            } else if (clientConnectionState === 'Ready') {

                if (this.ccHelper.getUnfinishedTransactions() < config.maxUnfinishedTransactionCount) {
                    this.ccHelper.runTransaction(
                        transactionData.getTransactionDetails(config.transactionType)
                    );
                } else {
                    await sleep(config.maxLimit, config.minLimit);
                }
            }

            if (!this.keepRunning) {
                if (statsTimer) {
                    clearInterval(statsTimer);
                }
                const rc = this.determineExitRc();
                console.log('Exiting process...', rc);
                process.exit(rc);
            }
        }
    }

    private determineExitRc(): ExitStatus {
        const finalTxnStats = this.ccHelper.getTransactionStats();
        if (finalTxnStats.unsuccessfulEval === 0 && finalTxnStats.unsuccessfulSubmits === 0) {
            return 0;
        }

        // TODO: Need to be able to determine a 2 value
        return 1;
    }

    private displayConfig() {
        console.log('App running with Configuration:\n', config);
    }

    private enableStatsOutput(): NodeJS.Timer | null {
        if (!this.keepRunning || config.txStatsTimer === 0) {
            return null;
        }

        const intervalId = setInterval(() => this.outputStatInformation(), config.txStatsTimer);
        return intervalId;
    }

    private outputStatInformation(): void {
        interface StatsMessage {
            component: string;
            timestamp: string;
            stage: string;
            message: string;
        }

        const txStats = this.ccHelper.getTransactionStats();
        const statMessage: StatsMessage = {
            component: 'CLIENT',
            timestamp: new Date().toISOString(),
            stage: 'STATS',
            message: ''
        }
        if (!this.checkStatsHaveChanged(txStats)) {
            statMessage.message = 'WARNING: Client may have stalled, no new transactions are being evaluated or endorsed';
            const output = config.colourLogs ? chalk.yellow(JSON.stringify(statMessage)) : JSON.stringify(statMessage);
            console.error(output);
            return;
        }

        if (config.txStatsMode === 'All') {
            statMessage.message = `Submit: good=${txStats.successfulSubmits}, bad=${txStats.unsuccessfulSubmits}. Evals: good=${txStats.successfulEval}, bad=${txStats.unsuccessfulEval}`
            const output = config.colourLogs ? chalk.cyan(JSON.stringify(statMessage)) : JSON.stringify(statMessage);
            console.error(output);
        }
    }

    private checkStatsHaveChanged(currentStats: TransactionStats): boolean {
        try {
            if (!this.previousStats) {
                return true;
            }

            if (currentStats.successfulEval != this.previousStats.successfulEval ||
                currentStats.successfulSubmits != this.previousStats.successfulSubmits ||
                currentStats.unsuccessfulEval != this.previousStats.unsuccessfulEval ||
                currentStats.unsuccessfulSubmits != this.previousStats.unsuccessfulSubmits) {

                return true;
            }

            return false;
        } finally {
            this.previousStats = currentStats;
        }
    }


    private async configure(gwHelper: GatewayHelper) {
        this.gateway = await gwHelper.configureGateway();
        this.ccHelper = new CCHelper(
            this.gateway,
            config.channelName,
            config.chaincodeName
        );
    }
}

const app = new App();
app
    .main()
    .catch((error) =>
        console.log('******** FAILED to run the application:', error)
    );

process.on('SIGINT', () => {
    console.log('request to terminate received, stopping......');
    app.keepRunning = false;
});
