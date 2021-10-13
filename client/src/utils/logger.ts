
interface ClientLogMessage {
  component: string;
  timestamp: string;
  failed: boolean;
  clientAction: ClientAction;
  message: string;
  txnId?: string;
}
export type ClientAction =
  | 'ProposalSubmitted'
  | 'ProposalResponseReceived'
  | 'SubmittedToOrderer'
  | 'ErrorSubmittingToOrderer'
  | 'TransactionCommitted'
  | 'TimeoutNoCommitEventReceived'
  | 'TimeoutWaitingForProposal'
  | 'ErrorSubmittingProposal'
  | 'ErrorEvaluatingTransaction'
  | 'ErrorCreatingProposal'
  | 'ErrorWhileEndorsement'



export class Logger {

    static logPoint(failed:boolean,clientAction:ClientAction,message:string,txnId?:string):void{
        const timestamp = new Date().toISOString();
        const logMessage: ClientLogMessage = {
            component: 'CLIENT',
            timestamp,
            failed,
            clientAction,
            message,
            txnId,
        }
        console.log(JSON.stringify(logMessage));
    }
}
