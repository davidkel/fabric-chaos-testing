// Cover chaincode, chaos engine, client
// note sure about peer/orderer

export interface LogEntry {
    component?: string;
    timestamp: string;
    txnId?: string;
    entryExit?: string;
    scenarioStatus?: string;
    message: string;
}