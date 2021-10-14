export type Stage = 'Endorsing' | 'Submitting' | 'Submitted' | 'Committed' | 'Failed' | 'Evaluating' | 'Evaluated';

interface ClientLogMessage {
    component: string;
    timestamp: string;
    txnId: string;
    stage: Stage;
    message: string;
}



export type logLevels = 'logOnlyOnFailure'| 'AllPoints';
export class Logger {
  private logEntries: ClientLogMessage[] = [];
  txnId:string;
  constructor(txnId:string,private readonly logLevel:logLevels = 'logOnlyOnFailure'){
      this.txnId = txnId
  }

  logPoint(stage:Stage,message=''):void{
      const timestamp = new Date().toISOString();
      const logMessage: ClientLogMessage = {
          component: 'CLIENT',
          timestamp,
          txnId:this.txnId,
          stage,
          message
      };
      this.logEntries.push(logMessage)
      if(this.logLevel === 'logOnlyOnFailure'){
          if (stage === 'Failed') {
              for (const logEntry of this.logEntries) {
                  console.log(JSON.stringify(logEntry));
              }
          }
          else if (stage === 'Committed' || stage === 'Evaluated' ){
              this.logEntries = [];
          }

      }else if(this.logLevel ==='AllPoints'){
          console.log(JSON.stringify(logMessage));

      }

  }


}
