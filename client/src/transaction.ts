import * as config from './utils/config';
import { logger } from './utils/logger';
export class TransactionData {


count = config.TRANSACTION_COUNT;
args:string[]=[];
transactionType = 'submit';
function='';

constructor(count:number,args:string[],type:string,func:string,){


    this.count=count;
    this.args=args;
    this.transactionType=type;
    this.function=func;
    logger.info('Trnasction Details:\n count: %s, function: %s, transactionType :%s,args: %s ',this.count,this.function,this.transactionType,this.args)
}



}