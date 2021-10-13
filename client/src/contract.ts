import { ClientAction, Logger } from './utils/logger';

import {
    Contract,
    Gateway,
    Network,
    Proposal,
    ProposalOptions,
    SubmittedTransaction,
    Transaction,
} from 'fabric-gateway';

export class CCHelper {
  contract: Contract;
  network: Network;
  channel = '';
  chaincode = '';

  constructor(gateway: Gateway, channel: string, chaincode: string) {
      this.network = gateway.getNetwork(channel);

      this.contract = this.network.getContract(chaincode);
  }

  async executeWithLog(callback:()=>Proposal|Promise<Transaction>|Promise<SubmittedTransaction>,msg:ClientAction,txnID?:string):Promise<Proposal|Transaction|SubmittedTransaction|void>{
      try{
          const result = callback();
          if(result instanceof Promise){
              const resolved = await result;
              return resolved;
          }else{
              return result;
          }

      }catch(e:any){
          Logger.logPoint(false,msg,e?.message,txnID)
      }

  }

  getContract(): Contract {
      return this.contract;
  }

  getNetwork(): Network {
      return this.network;
  }


  async submitTransaction(func: string, args: string[]): Promise<void> {
      const opts: ProposalOptions = {
          arguments: args,
      };
      const proposal:Proposal = await this.executeWithLog(()=> this.contract.newProposal(func, opts),'ErrorCreatingProposal') as Proposal;
      if(proposal){
          const txnID = proposal.getTransactionId();
          const txn = await this.executeWithLog(()=>proposal.endorse(),'ErrorWhileEndorsement',txnID) as Transaction;
          if(txn){
              await this.executeWithLog(()=>txn.submit(),'ErrorSubmittingToOrderer',txnID);
          }

      }


  }

  async evaluateTransaction(func: string, args: string[]): Promise<void> {
      try {
          await this.contract.evaluateTransaction(func, ...args);
      } catch (e: any) {
          Logger.logPoint(false, 'ErrorEvaluatingTransaction', `${e?.message}`);
      }
  }

}


