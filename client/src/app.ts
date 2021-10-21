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

  async main(): Promise<void> {
      this.gateway = await new GatewayHelper(
          (config.ORGS as Orgs)[config.ORG]
      ).configureGateway();
      const ccHelper = new CCHelper(
          this.gateway,
          config.channelName,
          config.chaincodeName
      );
      ccHelper.startEventListening();
      const transactionData: TransactionData = new TransactionData();
      while (this.keepRunning) {
          if (
              ccHelper.getUnfinishedTransactions() <
        config.MAX_UNFINISHED_TRANSACTION_COUNT
          ) {
              ccHelper.runTransaction(transactionData.getTransactionDetails(config.transactionType));
          } else {
              await sleep(config.maxLimit, config.minLimit);
          }
      }
      if(!this.keepRunning){
          console.log('Exiting process...');
          process.exit(1);
      }
  }
}
const app = new App();
app
    .main()
    .catch((error) =>
        console.log('******** FAILED to run the application:', error)
    )

process.on('SIGINT', () => {
    console.log('request to terminate received, stopping......');
    app.keepRunning = false;
});

