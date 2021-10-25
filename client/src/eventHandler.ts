import { Network } from 'fabric-gateway';
import { Logger } from './utils/logger';
import * as config from './utils/config'
import { sleep } from './utils/helper';

export class EventHandler {

    private txnMap = new Map<string, (value: unknown) => void>();
    // startBlock = BigInt(0);
    constructor(private readonly network: Network, private readonly chaincodeName: string) {
    }

    async startListening(): Promise<void> {
        const listen = true;
        while(listen){
            console.log('started Listening........')
            const events =  await this.network.getChaincodeEvents(this.chaincodeName
                // { startBlock: this.startBlock }
            );
            try {
                for await (const event of events) {
                    const listener = this.txnMap.get(event.transactionId);
                    // this.startBlock = event.blockNumber;
                    console.log('block num',event.blockNumber ,event.transactionId)
                    if (!listener) {
                        const logger = new Logger(event.transactionId,config.logLevel);
                        logger.logPoint('Failed','Event fired, but no listener registered');
                    } else {
                        listener(event);
                        this.txnMap.delete(event.transactionId);
                    }
                }

            }catch(e){
                console.log('Error thrown ---------',e)
                console.log('closing events')
                events.close();

            }finally{
                console.log('done');
            }
            await sleep(5000,3000);
        }



    }


    registerForEvent(txnId: string): Promise<unknown> {

        const eventPromise = new Promise((resolve) => {
            this.txnMap.set(txnId, resolve);
        });

        return eventPromise;
    }

    unregisterEvent(txnId: string): void {
        this.txnMap.delete(txnId);
    }
}