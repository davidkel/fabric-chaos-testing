import * as config from './utils/config';
import {
    Contract,
    Gateway,
    Network,
    ProposalOptions,
} from 'fabric-gateway';
import { TransactionDescriptor } from './transactionData';
import { promiseTimeout } from './utils/helper';

export class CCHelper {
  contract: Contract;
  network: Network;
  channel = '';
  chaincode = '';
  unfinishedTransactions = 0;

  constructor(gateway: Gateway, channel: string, chaincode: string) {
      this.network = gateway.getNetwork(channel);
      this.contract = this.network.getContract(chaincode);
  }

  getUnfinishedTransactions(): number {
      return this.unfinishedTransactions;
  }
  getContract(): Contract {
      return this.contract;
  }

  getNetwork(): Network {
      return this.network;
  }
  async runTransaction(transactionData:TransactionDescriptor):Promise<void>{
      console.log('transction called',transactionData.type)
      if(transactionData.type === 'submit'){
          await this.submitTransaction(transactionData.name,transactionData.params)
      }else{
          await this.evaluateTransaction(transactionData.name,transactionData.params)
      }

  }

  private async submitTransaction(func: string, args: string[]): Promise<void> {
      try{
          const opts: ProposalOptions = {
              arguments: args,
          };
          const proposal = this.contract.newProposal(func, opts)
          console.log('proposal',proposal);
          const txnID = proposal.getTransactionId();
          this.unfinishedTransactions++;
          console.log('txn',txnID);
          const txn = await proposal.endorse();
          console.log('txn',txn)
          const subtx = await txn.submit()

          const status = await promiseTimeout(config.timeout,()=>subtx.getStatus());

          if (status.code !== 11 && status.code !== 12 && status.code !== 0) {
              // 0 = OK
              // 10 = endorsement_policy_failure
              // 11 = mvcc_read_conflict
              // 12 = phantom read error
              //
              // 0,11,12 are ok. 10 would indicate a possible gateway problem
              // all the others shouldn't happen but we will want to know if they do
              throw new Error(`unexpected validation code ${status.code}`);
          }


      }catch(e){
          //log

      }finally{
          this.unfinishedTransactions--
      }



  }

  private async evaluateTransaction(func: string, args: string[]): Promise<void> {
      try {
          const opts: ProposalOptions = {
              arguments: args
          };
          const proposal = this.contract.newProposal(func, opts);

          try {
              await proposal.evaluate();
          } catch(error) {
              //log
          } finally {
              this.unfinishedTransactions--;
          }
      } catch (e) {
          //   Logger.logPoint(false, 'ErrorEvaluatingTransaction', `${(e as Error).message}`);
      }
  }

}


