import { Gateway } from 'fabric-gateway';

import { logger } from './utils/logger';
import * as config from './utils/config';
import { CCHelper } from './contract';

import { GatewayHelper } from './gateway';

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

let gateway: Gateway;
// let client: grpc.Client;

async function main(): Promise<void> {
    logger.info(' Running Main!');
    logger.info('Configure gateway for ORG %s', config.ORG);
    logger.info('Batch interval set to: %d', config.batchInterval);
    // const org = (config.ORGS as orgs)[config.ORG]

    gateway = await GatewayHelper.getInstance((config.ORGS as orgs)[config.ORG]);

    logger.info('Gateway set for ORG MSP: %s ', gateway?.getIdentity()?.mspId);
    setInterval(execute, config.batchInterval,config.TRANSACTION_COUNT);
}

async function execute(transactionCount:number): Promise<void> {
    try {
        logger.info('Execute function called %s');
        const chaincodeInstance = CCHelper.getInstance(
            gateway,
            config.channelName,
            config.chaincodeName
        );
        for (let i = 0; i <= transactionCount; i++) {
            const chaincodeData = config.CHAINCODE_DATA as chaincodeData;
            console.log('chaincode_dta',chaincodeData)
            chaincodeInstance.submitTransaction(
                chaincodeData.function,
                chaincodeData.args
            );
            // chaincodeInstance.evaluateTransaction(chaincodeData.function,chaincodeData.args)
        }

    } catch (e) {
        logger.error('Error ', e);
    }
}

main().catch((error) =>
    logger.error('******** FAILED to run the application:', error)
);
