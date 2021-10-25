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

export interface OrgProfile {
    keyPath: string;
    certPath: string;
    tlsCertPath: string;
    mspID: string;
  }
export type  ClietConnection = 'Ready'|'NotStarted'|'NotConnected';

export class GatewayHelper{

    gateway!: Gateway;
    client!: grpc.Client;
    org: OrgProfile;
    // connected =false;

    constructor(org: OrgProfile) {
        this.org = org
    }

    async configureGateway():Promise<Gateway>{
        this.client = await this.newGrpcConnection(this.org.tlsCertPath);
        this.gateway = connect({
            client:this.client,
            identity: await this.newIdentity(this.org.certPath,this.org.mspID),
            signer: await this.newSigner(this.org.keyPath),
        });
        // this.connected = true;
        return this.gateway;
    }

    private  async  newGrpcConnection(tlsCertPath: string): Promise<grpc.Client> {
        const tlsRootCert = await fs.readFile(
            tlsCertPath
        );
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        const GrpcClient = grpc.makeGenericClientConstructor({}, '');
        return new GrpcClient(config.peerEndPoint, tlsCredentials, {
            'grpc.ssl_target_name_override': config.gatewayPeer,
            // 'grpc.keepalive_permit_without_calls': 1,
            // 'grpc.keealive_time_ms': 20000,
        });
    }

    private  async  newIdentity(certPath: string,mspId:string): Promise<Identity> {
        const credentials = await fs.readFile(
            certPath
        );
        return {
            mspId,
            credentials,
        };
    }

    private  async  newSigner(keyPath: string): Promise<Signer> {
        const privateKeyPem = await fs.readFile(
            keyPath
        );
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }

    async waitForReady(): Promise<ClietConnection> {
        return new Promise((resolve) => {
            if(!this.client){
                resolve('NotStarted');
            }
            const timeout = new Date().getTime() + config.grpcTimeout;
            this.client.waitForReady(timeout,(err)=>{
                if(err){
                    // this.connected = false;
                    resolve('NotConnected');
                }
                else {
                    // this.connected = true;
                    resolve('Ready');
                }

            })
        })


    }
}

