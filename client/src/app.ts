import {logger} from './utils/logger';
import * as config from './utils/config';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import { connect, Identity, Signer, signers ,Contract} from 'fabric-gateway';
import { promises as fs } from 'fs';

async function main():Promise<void>{

    logger.info("App Started Running !");
        // The gRPC client connection should be shared by all Gateway connections to this endpoint
        const client = await newGrpcConnection();

        const gateway = connect({
            client,
            identity: await newIdentity(),
            signer: await newSigner(),
        });

        try {

            // Build a network instance based on the channel where the smart contract is deployed
            const network = gateway.getNetwork(config.channelName);
            logger.info('Created a network instance based on channel %s',config.channelName)

            // Get the contract from the network.
            const contract = network.getContract(config.chaincodeName);
            logger.info('Created a contract instance for chaincode %s',config.chaincodeName)

            // Invoke chaincode function.
            await invokeChaincode(contract);
            logger.info('Chaincode invoke successful')


        }finally{
            gateway.close();
            client.close();
        }

}

main().catch(error => console.error('******** FAILED to run the application:', error));

async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(config.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    const GrpcClient = grpc.makeGenericClientConstructor({}, '');
    return new GrpcClient(config.peerEndPoint, tlsCredentials, {
        'grpc.ssl_target_name_override': config.gatewayPeer,
    });
}

async function newIdentity(): Promise<Identity> {
    const credentials = await fs.readFile(config.certPath);
    return { mspId:config.mspID, credentials };
}

async function newSigner(): Promise<Signer> {
    const privateKeyPem = await fs.readFile(config.keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function invokeChaincode(contract:Contract):Promise<void>{
    await contract.submitTransaction('createChaosAsset','myasset','val'    );
    logger.info('Submitted transaction ')
    const result = await contract.evaluateTransaction('readChaosAsset','myasset')
    logger.info("Received asset %s",Buffer.from(result).toString());
}