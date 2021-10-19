const logAllOnlyOnFailure = true;
const onlyLogSuccessMsg = false;


export type Stage = 'Endorsing' | 'Submitting' | 'Submitted' | 'Committed' | 'Failed' | 'Evaluating' | 'Evaluated';

interface ClientLogMessage {
    component: string;
    timestamp: string;
    txnId: string;
    stage: Stage;
    message: string;
}

export class Logger {
    private logEntries: ClientLogMessage[] = [];

    constructor(private readonly txnId: string) {

    }

    logPoint(stage: Stage, message = '') {
        const timestamp = new Date().toISOString();
        const logMessage: ClientLogMessage = {
            component: 'CLIENT',
            timestamp,
            txnId: this.txnId,
            stage,
            message
        }

        if (logAllOnlyOnFailure) {
            this.logEntries.push(logMessage);
            if (stage === 'Failed') {
                for (const logEntry of this.logEntries) {
                    console.log(JSON.stringify(logEntry));
                }
            }
            if (stage === 'Failed' || stage === 'Committed' || stage === 'Evaluated') {
                // clean up memory rather than waiting for GC
                this.logEntries = [];
            }
        }

        if (onlyLogSuccessMsg && (stage === 'Committed' || stage === 'Evaluated')) {
            console.log(JSON.stringify(logMessage));

        }

        if (!logAllOnlyOnFailure && !onlyLogSuccessMsg) {
            console.log(JSON.stringify(logMessage));
        }
    }
}