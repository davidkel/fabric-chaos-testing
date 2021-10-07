import {
    connect,
    Identity,
    Signer,
    signers,
    Gateway,
} from 'fabric-gateway';
import * as grpc from '@grpc/grpc-js';
import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as config from './utils/config';

interface orgProfile {
    keyPath: string;
    certPath: string;
    tlsCertPath: string;
    mspID: string;
  }

export class GatewayHelper{

    private static gateway: Gateway;
    private static client: grpc.Client;
    private static org: orgProfile
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private constructor() {

    }
    static async getInstance(org:orgProfile):Promise<Gateway>{
        if(!this.gateway ){
            await this.configureGateway(org)
        }
        return this.gateway;
    }

    private static async configureGateway(org:orgProfile){
        this.org = org
        this.client = await this.newGrpcConnection(this.org.tlsCertPath);
        this.gateway = connect({
            client:this.client,
            identity: await this.newIdentity(this.org.certPath,this.org.mspID),
            signer: await this.newSigner(this.org.keyPath),
        });
    }


    private static async  newGrpcConnection(tlsCertPath: string): Promise<grpc.Client> {
        const tlsRootCert = await fs.readFile(
            tlsCertPath
        );
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        const GrpcClient = grpc.makeGenericClientConstructor({}, '');
        return new GrpcClient(config.peerEndPoint, tlsCredentials, {
            'grpc.ssl_target_name_override': config.gatewayPeer,
        });
    }

    private static async  newIdentity(certPath: string,mspId:string): Promise<Identity> {
        const credentials = await fs.readFile(
            certPath
        );
        return {
            mspId,
            credentials,
        };
    }

    private static async  newSigner(keyPath: string): Promise<Signer> {
        const privateKeyPem = await fs.readFile(
            keyPath
        );
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }
}

