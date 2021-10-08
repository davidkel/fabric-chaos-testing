import { Context } from 'fabric-contract-api';

interface ChaincodeLogMessage {
    component: string;
    timestamp: string;
    txnId: string;
    entryExit: string;
}

export class Logger {
    static logPoint(ctx: Context, isExit = false) {
        const timestamp = new Date().toISOString();
        const txnId = ctx.stub.getTxID();
        const entryExit = isExit ? ' EXIT  ': ' ENTRY ';
        const logMessage: ChaincodeLogMessage = {
            component: 'Chaincode',
            timestamp,
            txnId,
            entryExit
        };

        console.log(JSON.stringify(logMessage));
    }
}