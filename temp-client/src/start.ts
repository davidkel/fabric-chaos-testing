import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import {TransactionDescriptor, TransactionDriver} from './transaction-driver';


let keepRunning = true;
process.on('SIGINT', () => {
    if (!keepRunning) {
        console.log('really stopping');
        process.exit(1);
    }
    console.log('request to terminate received, stopping......');
    keepRunning = false;
});

// want to avoid chaincode bad responses
// don't care about MVCC_READ_CONFLICT or PHANTOM_READs as block is still committed and cycle completes successfully
// TODO: option to exclude evalute
const TxnsToRun: TransactionDescriptor[] = [
    {type: 'submit',
     name: 'addUpdateAssets',
     params: ['1', '2000']},
    {type: 'eval',
     name: 'longRunningEvaluate',
     params: ['1', '2000']},
     {type: 'eval',
     name: 'longRunningQuery',
     params: ['1000']},
     {type: 'submit',
     name: 'updateChaosAsset',
     params: ['cd1', '99']},
     {type: 'eval',
     name: 'readChaosAsset',
     params: ['cd1']}
];

// TODO: Make configurable
const MAX_UNFINISED_COUNT = 5;
const MIN_TXN_RUN_DELAY = 50;
const MAX_TXN_RUN_DELAY = 500;

async function sleep(): Promise<void> {
    const delay = Math.round(Math.random() * MAX_TXN_RUN_DELAY - MIN_TXN_RUN_DELAY) + MIN_TXN_RUN_DELAY;
    return new Promise(resolve => setTimeout(resolve, delay));
}

(async () => {
    console.log(`Running client with max backlog of ${MAX_UNFINISED_COUNT} unfinished transactions`);

    const txnDriver = new TransactionDriver(TxnsToRun, process.argv[2]);

    try {
        await txnDriver.initialise();

        while (keepRunning) {
            txnDriver.runATransaction();
            let unfinished = txnDriver.getUnfinishedTransactions();

            while (unfinished >= MAX_UNFINISED_COUNT) {
                process.stdout.write(`waiting for ${unfinished} unfinished txns to complete\r`);
                await sleep();
                unfinished = txnDriver.getUnfinishedTransactions();
                // if (unfinished <= MAX_UNFINISED_COUNT) {
                //     process.stdout.write('\n\n');
                // }
            }
        }

    } catch(error) {
        //TODO: This should never happen
        console.log(error);
        console.log('Terminating due to error');
    }

})();