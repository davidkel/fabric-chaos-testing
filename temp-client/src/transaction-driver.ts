
import * as grpc from '@grpc/grpc-js';
import { ServiceClient } from '@grpc/grpc-js/build/src/make-client';
import * as crypto from 'crypto';
import { connect, Gateway, Identity, ProposalOptions, Signer, signers, Status } from 'fabric-gateway';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Logger } from './logger';


const mspId = 'Org1MSP'

// TODO: need to fix how we find the identity if we run this in docker
const basePath = path.resolve(__dirname, '..' , '..', 'fabric-network', 'docker-based-syschannel');
const cryptoPath = path.resolve(basePath, 'organizations', 'peerOrganizations', 'org1.example.com');
const certPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts', 'User1@org1.example.com-cert.pem');
//TODO: Need to fix the keystore
const keyPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore', 'priv_sk');
const tlsCertPath = path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');

// can't be this if run in docker unless we run it in the host network
const peerEndpoint = 'localhost:8051'

export interface TransactionDescriptor {
    type: 'submit' | 'eval',
    name: 'readChaosAsset' | 'longRunningQuery' | 'longRunningEvaluate' | 'addUpdateAssets' | 'updateChaosAsset'
    params: string[]
}

//TODO: Can I detect if all submits are just failing and nothing is succeeding. Same for evaluations
//TODO: Can I detect if I have hung because no transactions are finishing ?

export class TransactionDriver {

    private unfinishedTxns = 0;
    private grpcConnection: ServiceClient | null;
    private gateway: Gateway | null;

    constructor(private readonly txnsToRun: TransactionDescriptor[], private readonly mode: string | undefined) {
        this.grpcConnection = null;
        this.gateway = null;

    }

    async initialise(): Promise<void> {
        this.grpcConnection = await this.newGrpcConnection();

        this.gateway = connect({
            client: this.grpcConnection,
            identity: await this.newIdentity(),
            signer: await this.newSigner(),
        });
    }

    async runATransaction() {
        const txnIndex = Math.round(Math.random() * (this.txnsToRun.length - 1));
        const txnDescriptor = this.txnsToRun[txnIndex];
        if (txnDescriptor.type === 'submit' && (!this.mode || this.mode.includes('submit'))) {
            await this.runSubmit(txnDescriptor.name, txnDescriptor.params);
        } else if (!this.mode || this.mode.includes('eval')) {
            await this.runEval(txnDescriptor.name, txnDescriptor.params);
        }
    }

    getUnfinishedTransactions() {
        return this.unfinishedTxns;
    }

    async runEval(txnName: string, params: string[]) {
        const network = this.gateway!.getNetwork('mychannel');
        const contract = network!.getContract('basic');
        this.unfinishedTxns++;

        const opts: ProposalOptions = {
            arguments: params
        };
        const proposal = contract.newProposal(txnName, opts);
        const txnId = proposal.getTransactionId();
        const logger = new Logger(txnId);

        logger.logPoint('Evaluating');
        try {
            await proposal.evaluate();
            logger.logPoint('Evaluated');
        } catch(error) {
            logger.logPoint('Failed', (error as Error).message);
        } finally {
            this.unfinishedTxns--;
        }
    }

    async runSubmit(txnName: string, params: string[]) {
        const network = this.gateway!.getNetwork('mychannel');
        const contract = network.getContract('basic');
        const opts: ProposalOptions = {
            arguments: params
        };
        const proposal = contract.newProposal(txnName, opts);
        const txnId = proposal.getTransactionId();
        const logger = new Logger(txnId);

        this.unfinishedTxns++;

        try {
            logger.logPoint('Endorsing')
            const txn = await proposal.endorse();
            logger.logPoint('Submitting');
            const subtx = await txn.submit();
            logger.logPoint('Submitted');


/*
            const timer = new Promise(async (resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error(`timeout waiting for status`));
                }, 5000);

                const stat = await subtx.getStatus();
                clearTimeout(timer);
                resolve(stat);
            });

            const stat = (await timer) as Status;

*/
            const timerPromise = new Promise(async (resolve, reject) => {
                setTimeout(() => {
                    reject(new Error(`timeout waiting for status`));
                }, 5000);
            });

            const stat = <Status>await Promise.race([subtx.getStatus, timerPromise]);

            // const stat: Status = await subtx.getStatus();

            if (stat!.code !== 11 && stat!.code !== 12 && stat!.code !== 0) {
                // 0 = OK
                // 10 = endorsement_policy_failure
                // 11 = mvcc_read_conflict
                // 12 = phantom read error
                //
                // 0,11,12 are ok. 10 would indicate a possible gateway problem
                // all the others shouldn't happen but we will want to know if they do

                throw new Error(`unexpected validation code ${stat!.code}`);
            }
            logger.logPoint('Committed', `status code: ${stat!.code}`);

        } catch(error) {
            //TODO: Should output complete txn stack only on error
            logger.logPoint('Failed', (error as Error).message);
            //console.log('submit error', error);
            //TODO: May have to recover the grpc and gateway how to detect this ?
        } finally {
            this.unfinishedTxns--;
        }
    }

    async newGrpcConnection(): Promise<ServiceClient> {
        const tlsRootCert = await fs.readFile(tlsCertPath);
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

        const GrpcClient = grpc.makeGenericClientConstructor({}, '');
        return new GrpcClient(peerEndpoint, tlsCredentials, {
            'grpc.ssl_target_name_override': 'peer0.org1.example.com'
        });
    }

    async newIdentity(): Promise<Identity> {
        const credentials = await fs.readFile(certPath);
        return { mspId, credentials };
    }

    async newSigner(): Promise<Signer> {
        const privateKeyPem = await fs.readFile(keyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }
}