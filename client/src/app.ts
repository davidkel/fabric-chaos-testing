import { logger } from './utils/logger';
import * as config from './utils/config';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import {
    connect,
    Identity,
    Signer,
    signers,
    Contract,
    ProposalOptions,
    Gateway,
} from 'fabric-gateway';
import { promises as fs } from 'fs';

interface ORG_PROFILE {
  [key: string]: {
    KEY_PATH: string;
    CERT_PATH: string;
    TLS_CERT_PATH: string;
    MSP_ID: string;
  };
}
interface CHAINCODE_DATA {
  FUNCTION: string;
  ARGS: any[]
}

let gateway: Gateway;
let client: grpc.Client;


async function main(): Promise<void> {

    logger.info(' Running Main!');
    logger.info('Configure gateway for ORG %s', config.ORG);
    logger.info('Batch interval set to: %d',config.batchInterval)
    setInterval(execute, config.batchInterval, config.ORG);
}

async function execute(user: string): Promise<void> {
    try {
        // require('dotenv').config({path:__dirname+'/../.env'})
        logger.info('Execute function called for user %s', user);
        if (
            gateway?.getIdentity?.()?.mspId !==
    (config.ORGS as ORG_PROFILE)[user].MSP_ID
        ) {
            logger.info('configuring gateway for user %s', user);
            const connection = await configureGateway(user);
            gateway = connection.gateway;
            client = connection.client;
        }

        logger.info('Gateway set for ORG MSP: %s ', gateway.getIdentity().mspId);

        // Build a network instance based on the channel where the smart contract is deployed
        const network = gateway.getNetwork(config.channelName);
        logger.info(
            'Created a network instance based on channel %s for user ',
            config.channelName,
            user
        );

        // Get the contract from the network.
        const contract = network.getContract(config.chaincodeName);
        logger.info(
            'Created a contract instance for chaincode %s for user %s',
            config.chaincodeName,
            user
        );
        const func =(config.CHAINCODE_DATA as CHAINCODE_DATA).FUNCTION
        const args = (config.CHAINCODE_DATA as CHAINCODE_DATA).FUNCTION === 'createChaosAsset'?  [`asset${Math.random()}`,'value']:(config.CHAINCODE_DATA as CHAINCODE_DATA).ARGS
        logger.info(
            'To invoke chaincode function  %s with args %s',
            func,args
        );
        for (let i = 0; i <= config.TRANSACTION_COUNT; i++) {

            invokeChaincode(contract, user,func,args);
        }

    } catch (e) {
        logger.error('Error ', e);
    }
}

main().catch((error) =>
    logger.error('******** FAILED to run the application:', error)
);
async function configureGateway(user: string): Promise<{
  gateway: Gateway;
  client: grpc.Client;
}> {
    const client = await newGrpcConnection(user);
    const gateway = connect({
        client,
        identity: await newIdentity(user),
        signer: await newSigner(user),
    });
    return { gateway, client };
}

async function newGrpcConnection(user: string): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(
        (config.ORGS as ORG_PROFILE)[user].TLS_CERT_PATH
    );
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    const GrpcClient = grpc.makeGenericClientConstructor({}, '');
    return new GrpcClient(config.peerEndPoint, tlsCredentials, {
        'grpc.ssl_target_name_override': config.gatewayPeer,
    });
}

async function newIdentity(user: string): Promise<Identity> {
    const credentials = await fs.readFile(
        (config.ORGS as ORG_PROFILE)[config.ORG].CERT_PATH
    );
    return {
        mspId: (config.ORGS as ORG_PROFILE)[user].MSP_ID,
        credentials,
    };
}

async function newSigner(user: string): Promise<Signer> {
    const privateKeyPem = await fs.readFile(
        (config.ORGS as ORG_PROFILE)[user].KEY_PATH
    );
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function invokeChaincode(
    contract: Contract,
    user: string,
    func: string,
    args:any[]
): Promise<void> {
    try{
        logger.info(
            'To invoke chaincode %s for user %s',
            contract.getChaincodeId(),
            user
        );

        const opts: ProposalOptions = {
            arguments: args,
        };
        const proposal = contract.newProposal(func, opts);
        logger.info('Created proposal for transaction CreatecreateChaosAsset')

        logger.info('About to endorse transaction ', );
        const txn = await proposal.endorse();
        const txnID = txn.getTransactionId();
        logger.info(
            'Endorsement successful for transactionID: %s',
            txnID
        );
        logger.info(`Received endorsed, broadcast to orderer for txnid ${txnID}`);
        const subtx = await txn.submit();
        logger.info(`Transaction submitted for txnID: ${txnID}`);

        const stat = await subtx.getStatus();
        logger.info(`Transaction status for txnID: ${txnID} status:%s`, stat);
        const result = await contract.evaluateTransaction('readChaosAsset',args[0])
        logger.info(Buffer.from(result).toString())
        logger.info('Received asset %s',Buffer.from(result).toString());

    }catch(e){
        logger.error('Error invoking chaincode',e)
    }

}


