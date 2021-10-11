import { Gateway } from 'fabric-gateway';

import { logger } from './utils/logger';
import * as config from './utils/config';
import { CCHelper } from './contract';

import { GatewayHelper,OrgProfile } from './gateway';
import { TransactionData } from './transactionData';


interface Orgs {
  [key: string]: OrgProfile;
}


interface ChaincodeData {
  function: string;
  args: string[];
}
class App {

    gateway!: Gateway;
    rate = config.batchInterval

    resetBatchInterval(min:number,max:number){
        this.rate = Math.floor(Math.random() * (max - min + 1) + min)*1000;
    }

    async main(): Promise<void> {
        logger.info(' Running Main!');
        logger.info('Configure gateway for ORG %s', config.ORG);
        this.gateway = await new GatewayHelper((config.ORGS as Orgs)[config.ORG]).configureGateway();
        logger.info('Gateway set for ORG MSP: %s ', this.gateway?.getIdentity()?.mspId);
        logger.info('Batch interval set to: %d', config.batchInterval);
        const ccHelper = new CCHelper(this.gateway,config.channelName,config.chaincodeName);
        const startExecution = (ccHelper:CCHelper) => {
            this.execute(ccHelper);
            this.resetBatchInterval(50,30);
            logger.info('Batch interval set to: %d', this.rate);
            setInterval(startExecution, this.rate, ccHelper);
        }
        startExecution(ccHelper)
    }


    private async execute(ccHelper:CCHelper): Promise<void> {
        try {
            logger.info('Execute function called');
            const chaincodeData = config.CHAINCODE_DATA as ChaincodeData;
            const data = new TransactionData(20,[`${Math.random()}`,'val'],'submit',chaincodeData.function)
            switch(data.transactionType){
            case 'submit':
                for (let i = 0; i <= data.count; i++) {
                    ccHelper.submitTransaction(
                        data.function,
                        data.args
                    );
                }
                break;
            case 'evaluate':
                for (let i = 0; i <= data.count; i++) {
                    ccHelper.evaluateTransaction(
                        data.function,
                        data.args
                    );
                }

            }



        } catch (e) {
            logger.error('Error ', e);
        }
    }
}



new App().main().catch((error) =>
    logger.error('******** FAILED to run the application:', error)
);






