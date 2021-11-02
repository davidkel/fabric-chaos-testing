import chalk from 'chalk';
import * as config  from './config';


export type Stage = 'Endorsing' | 'Submitting' | 'Submitted' | 'Committed' | 'Failed' | 'Evaluating' | 'Evaluated' | 'EventReceived' ;

interface ClientLogMessage {
    component: string;
    timestamp: string;
    txnId: string;
    stage: Stage;
    message: string;
}

export type logLevels = 'Failure' | 'All' | 'Failure&Success';
export class Logger {
  private logEntries: ClientLogMessage[] = [];

  txnId:string;

  constructor(txnId:string, private readonly logLevel:logLevels = 'Failure'){
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
      if (this.logLevel === 'Failure'){
          this.logEntries.push(logMessage)
          if (stage === 'Failed') {
              for (const logEntry of this.logEntries) {
                  if (logEntry.stage === 'Failed'){
                      (config.colourLogs === true) ? console.log(chalk.red(JSON.stringify(logEntry))) : console.log(JSON.stringify(logEntry))
                  }
              }
          }
          else if (stage === 'EventReceived' || stage === 'Evaluated'){
              this.logEntries = [];
          }

      } else if (this.logLevel === 'All'){
          if ( config.colourLogs === true){
              if (stage === 'Failed') {
                  console.log(chalk.red(JSON.stringify(logMessage)));
              }
              else if (stage === 'EventReceived' || stage === 'Evaluated'){
                  console.log(chalk.green(JSON.stringify(logMessage)));
              }
              else {
                  console.log(JSON.stringify(logMessage));
              }

          }
          else {
              console.log(JSON.stringify(logMessage));
          }

      }
      else if (this.logLevel === 'Failure&Success'){
          this.logEntries.push(logMessage)
          if (stage === 'Failed') {
              for (const logEntry of this.logEntries) {
                  if (logEntry.stage === 'Failed'  ){
                      (config.colourLogs === true) ? console.log(chalk.red(JSON.stringify(logEntry))) :  console.log(JSON.stringify(logEntry));
                  }
              }
          }
          else if (stage === 'EventReceived' || stage === 'Evaluated'  ){
              (config.colourLogs === true) ? console.log(chalk.green(JSON.stringify(logMessage))) : console.log(JSON.stringify(logMessage));
              this.logEntries = [];
          }
      }

  }


}
