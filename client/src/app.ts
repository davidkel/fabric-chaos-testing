import { Gateway } from 'fabric-gateway';

import * as config from './utils/config';
import { CCHelper } from './contract';

import { GatewayHelper,OrgProfile } from './gateway';
import { TransactionData } from './transactionData';


interface Orgs {
  [key: string]: OrgProfile;
}


interface ChaincodeData {
  function: string;
  args: string[];
}
class App {

    gateway!: Gateway;
    rate = config.batchInterval

    resetBatchInterval(min:number,max:number){
        this.rate = Math.floor(Math.random() * (max - min + 1) + min)*1000;
    }

    async main(): Promise<void> {

        this.gateway = await new GatewayHelper((config.ORGS as Orgs)[config.ORG]).configureGateway();

        const ccHelper = new CCHelper(this.gateway,config.channelName,config.chaincodeName);
        const startExecution = (ccHelper:CCHelper) => {
            this.execute(ccHelper);
            this.resetBatchInterval(50,30);
            setInterval(startExecution, this.rate, ccHelper);
        }
        startExecution(ccHelper)
    }


    private async execute(ccHelper:CCHelper): Promise<void> {

        const chaincodeData = config.CHAINCODE_DATA as ChaincodeData;
        const data = new TransactionData(1,[],'submit',chaincodeData.function)
        switch(data.transactionType){
        case 'submit':
            this.loop(()=>{
                ccHelper.submitTransaction(
                    data.function,
                    data.args)},data.count
            );
            break;
        case 'evaluate':
            this.loop(()=>{
                ccHelper.evaluateTransaction(
                    data.function,
                    data.args)},data.count
            );
            break;

        }
    }
    loop(callback:()=>void,count:number):void{
        for (let i = 0; i <= count; i++) {
            callback();
        }

    }

}



new App().main().catch((error) =>
    console.log('******** FAILED to run the application:', error)
);






