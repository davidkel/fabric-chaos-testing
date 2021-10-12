import { Logger } from './utils/logger';

import {
    Contract,
    Gateway,
    Network,
    Proposal,
    ProposalOptions,
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


      const proposal = this.createProposal(func, opts);


      if(proposal){
          const txnID = proposal.getTransactionId();
          const txn = await this.endorse(txnID, proposal);

          if(txn){
              await this.submit(txn);
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

  createProposal(func: string, opts: ProposalOptions): Proposal|void {
      try {
          return this.contract.newProposal(func, opts);
      } catch (e: any) {
          Logger.logPoint(false, 'ErrorCreatingProposal', e.message);
      }
  }
  async endorse(txnID: string, proposal: Proposal): Promise<Transaction|void> {
      try {
          const txn = await proposal.endorse();
          return txn;
      } catch (e: any) {
          Logger.logPoint(false, 'ErrorWhileEndorsement', e.message, txnID);
      }
  }

  async submit(txn: Transaction): Promise<void> {
      try {
          await txn.submit();
      } catch (e: any) {
          Logger.logPoint(false, 'ErrorSubmittingToOrderer', e.message);
      }
  }
}
