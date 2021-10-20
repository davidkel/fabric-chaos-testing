import { Network } from 'fabric-gateway';
import { Logger } from './utils/logger';
import * as config from './utils/config';

// To use
// create the EventSink and get it listening straight away
// perform the endorse
// before issuing a submit
// const eventReceivedPromise = registerForEvent(txnId);
// issue submit (if this fails call unregisterEvent(txnId)) otherwise
// Promise.race(eventReceivedPromise, timeout);


export class EventSink {

    private txnMap = new Map<string, (value: unknown) => void>();

    constructor(private readonly network: Network, private readonly chaincodeId: string) {

    }

    async startListening(): Promise<void> {
        const events =  await this.network.getChaincodeEvents(this.chaincodeId);

        try {
            for await (const event of events) {
                const listener = this.txnMap.get(event.transactionId);
                if (!listener) {
                    const logger = new Logger(event.transactionId, config.logLevel);
                    logger.logPoint('Failed', 'Event fired, but no listener registered');
                } else {
                    listener(event);
                    this.txnMap.delete(event.transactionId);
                }
            }

        } finally {
            events.close();
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