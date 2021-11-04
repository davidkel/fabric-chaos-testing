
import {
    ChaincodeEvent,
    Contract,
    Gateway,
    GatewayError,
    Network,
    ProposalOptions,
    Status,
} from 'fabric-gateway';

import { TransactionDescriptor } from './transactionData';
import {   timeout } from './utils/helper';
import { Logger } from './utils/logger';
import { EventHandler } from './eventHandler';
import * as config from './utils/config';

export interface TransactionStats {
    successfulSubmits: number;
    unsuccessfulSubmits: number;
    successfulEval: number;
    unsuccessfulEval: number;
}

class GatewayTransactionStats implements TransactionStats {
    successfulSubmits = 0;

    unsuccessfulSubmits = 0;

    successfulEval = 0;

    unsuccessfulEval = 0;
}

export class CCHelper {
  contract: Contract;

  network: Network;

  unfinishedTransactions = 0;

  gatewayTransactionStats = new GatewayTransactionStats();

  eventHandler:EventHandler

  constructor(gateway: Gateway, private readonly channel: string, private readonly chaincode: string) {
      this.network = gateway.getNetwork(channel);
      this.contract = this.network.getContract(chaincode);
      this.eventHandler = new EventHandler(this.network, this.chaincode)
  }

  async startEventListening():Promise<void>{
      await this.eventHandler.startListening();
  }

  isListening():boolean{
      return this.eventHandler.listeningtoEvents;
  }

  getUnfinishedTransactions(): number {
      return this.unfinishedTransactions;
  }

  getTransactionStats(): TransactionStats {
      const transactionStats = new GatewayTransactionStats();
      Object.assign(transactionStats, this.gatewayTransactionStats);
      return transactionStats;
  }

  getContract(): Contract {
      return this.contract;
  }

  getNetwork(): Network {
      return this.network;
  }

  async runTransaction(transactionData:TransactionDescriptor):Promise<void>{
      if (transactionData.type === 'submit'){
          await this.submitTransaction(transactionData.name, transactionData.params)
      } else {
          await this.evaluateTransaction(transactionData.name, transactionData.params)
      }

  }

  private async submitTransaction(func: string, args: string[]): Promise<void> {

      const opts: ProposalOptions = {
          arguments: args,
      };
      const proposal = this.contract.newProposal(func, opts)
      const txnID = proposal.getTransactionId();
      this.unfinishedTransactions++;
      const eventPromise = this.eventHandler.registerForEvent(txnID);
      const logger = new Logger(txnID, config.logLevel)
      try {

          logger.logPoint('Endorsing', `${func}(${JSON.stringify(opts)})`);
          const txn = await proposal.endorse();
          if (!this.isListening()){
              await this.startEventListening();
          }

          logger.logPoint('Submitting')
          const subtx = await txn.submit();
          logger.logPoint('Submitted');
          const status = await subtx.getStatus() as Status;
          if (status.code !== 11 && status.code !== 12 && status.code !== 0) {
              //       // 0 = OK
              //       // 10 = endorsement_policy_failure
              //       // 11 = mvcc_read_conflict
              //       // 12 = phantom read error
              //       //
              //       // 0,11,12 are ok. 10 would indicate a possible gateway problem
              //       // all the others shouldn't happen but we will want to know if they do
              throw new Error(`unexpected validation code ${status.code}`);
          }

          logger.logPoint('Committed', `status code: ${status.code}`);
          const event = await Promise.race([eventPromise, timeout(config.eventTimeout, 'Timed out waiting for event', 'EventReceived')]) as ChaincodeEvent;
          logger.logPoint('EventReceived', `EventName:${event.eventName},Payload:${Buffer.from(event.payload).toString()}`);
          this.gatewayTransactionStats.successfulSubmits++;
      } catch (error: unknown){
          const gatewayError = error as GatewayError;
          const details = (gatewayError.details !== undefined) ? ` Details: ${JSON.stringify(gatewayError.details)}` : '';
          logger.logPoint('Failed', gatewayError.message + details);
          this.gatewayTransactionStats.unsuccessfulSubmits++;
      } finally {
          this.unfinishedTransactions--
          this.eventHandler.unregisterEvent(txnID)
      }

  }

  private async evaluateTransaction(func: string, args: string[]): Promise<void> {

      const opts: ProposalOptions = {
          arguments: args
      };
      const proposal = this.contract.newProposal(func, opts);
      const txnId = proposal.getTransactionId();
      const logger = new Logger(txnId, config.logLevel);
      logger.logPoint('Evaluating', `${func}(${JSON.stringify(opts)})`);
      try {
          this.unfinishedTransactions++;
          await proposal.evaluate();
          logger.logPoint('Evaluated', `${func}(${JSON.stringify(opts)})`);
          this.gatewayTransactionStats.successfulEval++;
      } catch (error: unknown) {
          const gatewayError = error as GatewayError;
          const details = (gatewayError.details !== undefined) ? ` Details: ${JSON.stringify(gatewayError.details)}` : '';
          logger.logPoint('Failed', gatewayError.message + details)
          this.gatewayTransactionStats.unsuccessfulEval++;
      } finally {
          this.unfinishedTransactions--;
      }
  }
}
