import { Gateway } from 'fabric-gateway';

import * as config from './utils/config';
import { CCHelper } from './contract';

import { GatewayHelper, OrgProfile } from './gateway';
import { TransactionData } from './transactionData';
import { sleep } from './utils/helper';

interface Orgs {
  [key: string]: OrgProfile;
}

class App {
  keepRunning = true;

  gateway!: Gateway;

  ccHelper!: CCHelper;

  async main(): Promise<void> {
      this.displayConfig();
      const gwHelper = new GatewayHelper((config.ORGS as Orgs)[config.ORG]);
      await this.configure(gwHelper);

      const transactionData: TransactionData = new TransactionData();
      while (this.keepRunning) {
          const clientConnectionState = await gwHelper.waitForReady();
          if (clientConnectionState === 'NotConnected') {

              await sleep(config.grpcSleepMax, config.grpcSleepMin);

          } else if (clientConnectionState === 'Ready') {

              if ( this.ccHelper.getUnfinishedTransactions() < config.MAX_UNFINISHED_TRANSACTION_COUNT) {
                  this.ccHelper.runTransaction(
                      transactionData.getTransactionDetails(config.transactionType)
                  );
              } else {
                  await sleep(config.maxLimit, config.minLimit);
              }
          }

          if (!this.keepRunning) {
              console.log('Exiting process...');
              process.exit(1);
          }
      }
  }

  displayConfig(){
      console.log('App running with Configuration:\n', config);
  }

  async configure(gwHelper: GatewayHelper) {
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
