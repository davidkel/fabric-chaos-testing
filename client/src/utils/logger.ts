export type Stage = 'Endorsing' | 'Submitting' | 'Submitted' | 'Committed' | 'Failed' | 'Evaluating' | 'Evaluated' | 'EventReceived' ;

interface ClientLogMessage {
    component: string;
    timestamp: string;
    txnId: string;
    stage: Stage;
    message: string;
}

export type logLevels = 'logOnlyOnFailure' | 'AllPoints' | 'Failure&Success';
export class Logger {
  private logEntries: ClientLogMessage[] = [];

  txnId:string;

  constructor(txnId:string, private readonly logLevel:logLevels = 'logOnlyOnFailure'){
      this.txnId = txnId
  }

  logPoint(stage:Stage, message = ''):void{
      const timestamp = new Date().toISOString();

      const logMessage: ClientLogMessage = {
          component: 'CLIENT',
          timestamp,
          txnId:this.txnId,
          stage,
          message
      };

      if (this.logLevel === 'logOnlyOnFailure'){
          this.logEntries.push(logMessage)
          if (stage === 'Failed') {
              for (const logEntry of this.logEntries) {
                  console.log(JSON.stringify(logEntry));
              }
          }
          else if (stage === 'EventReceived' || stage === 'Evaluated'){
              this.logEntries = [];
          }

      } else if (this.logLevel === 'AllPoints'){
          console.log(JSON.stringify(logMessage));

      }
      else if (this.logLevel === 'Failure&Success'){
          this.logEntries.push(logMessage)
          if (stage === 'Failed') {
              for (const logEntry of this.logEntries) {
                  console.log(JSON.stringify(logEntry));
              }
          }
          else if (stage === 'EventReceived' || stage === 'Evaluated'  ){
              console.log(JSON.stringify(logMessage));
              this.logEntries = [];

          }
      }

  }


}
