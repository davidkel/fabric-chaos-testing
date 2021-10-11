import * as config from './utils/config';
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
}



}