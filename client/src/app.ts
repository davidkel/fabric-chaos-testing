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
      const gwHelper = new GatewayHelper((config.ORGS as Orgs)[config.ORG]);
      await this.configure(gwHelper);


      const transactionData: TransactionData = new TransactionData();

      while (this.keepRunning) {

          const ClietConnectionState = await gwHelper.waitForReady();

          if(ClietConnectionState === 'NotConnected'){
              await sleep(config.grpcSleepMax,config.grpcSleepMin);
          }
          else if(ClietConnectionState === 'Ready'){
              if (this.ccHelper.getUnfinishedTransactions() < config.MAX_UNFINISHED_TRANSACTION_COUNT) {
                  if(this.ccHelper.isListening() === false){
                      this.ccHelper.startEventListening();
                  }
                  this.ccHelper.runTransaction(transactionData.getTransactionDetails(config.transactionType));

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
  async configure(gwHelper:GatewayHelper){
      this.gateway = await gwHelper.configureGateway();
      this.ccHelper = new CCHelper(
          this.gateway,
          config.channelName,
          config.chaincodeName
      );

      this.ccHelper.startEventListening();
  }
}

const app = new App();
app
    .main()
    .catch((error) =>console.log('******** FAILED to run the application:', error));

process.on('SIGINT', () => {
    console.log('request to terminate received, stopping......');
    app.keepRunning = false;
});
