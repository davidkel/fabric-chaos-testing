import { Gateway } from 'fabric-gateway';

import { logger } from './utils/logger';
import * as config from './utils/config';
import { CCHelper } from './contract';

import { GatewayHelper } from './gateway';
import { TransactionData } from './transaction';

interface orgs {
  [key: string]: orgProfile;
}
interface orgProfile {
  keyPath: string;
  certPath: string;
  tlsCertPath: string;
  mspID: string;
}

interface chaincodeData {
  function: string;
  args: string[];
}
class App {
    static gateway: Gateway;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor(){
    }

    static async main(): Promise<void> {
        logger.info(' Running Main!');
        logger.info('Configure gateway for ORG %s', config.ORG);
        App.gateway = await GatewayHelper.getInstance((config.ORGS as orgs)[config.ORG]);

        logger.info('Gateway set for ORG MSP: %s ', App.gateway?.getIdentity()?.mspId);
        logger.info('Batch interval set to: %d', config.batchInterval);
        setInterval(this.execute, config.batchInterval);
    }

    static async  execute(): Promise<void> {
        try {
            logger.info('Execute function called');
            const chaincodeData = config.CHAINCODE_DATA as chaincodeData;
            const data = new TransactionData(20,chaincodeData.args,'submit',chaincodeData.function)

            const chaincodeInstance = CCHelper.getInstance(
                App.gateway,
                config.channelName,
                config.chaincodeName
            );

            switch(data.transactionType){
            case 'submit':
                for (let i = 0; i <= data.count; i++) {
                    chaincodeInstance.submitTransaction(
                        data.function,
                        data.args
                    );
                }
                break;
            case 'evaluate':
                for (let i = 0; i <= data.count; i++) {
                    chaincodeInstance.evaluateTransaction(
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



App.main().catch((error) =>
    logger.error('******** FAILED to run the application:', error)
);



