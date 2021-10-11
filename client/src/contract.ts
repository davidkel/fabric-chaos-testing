import { logger } from './utils/logger';

import { Contract, Gateway, Network, ProposalOptions } from 'fabric-gateway';

export class CCHelper {
  contract: Contract;
  network: Network;
  channel = '';
  chaincode = '';

  constructor(gateway: Gateway, channel: string, chaincode: string) {
      this.network = gateway.getNetwork(channel);
      logger.info(
          'Created a network instance based on channel %s for user ',
          channel
      );
      this.contract = this.network.getContract(chaincode);
  }

  getContract(): Contract {
      return this.contract;
  }

  getNetwork(): Network {
      return this.network;
  }

  async submitTransaction(func: string, args: string[]): Promise<void> {
      try {
          logger.info('To invoke chaincode %s ', this.contract.getChaincodeId());
          const opts: ProposalOptions = {
              arguments: args,
          };
          const proposal = this.contract.newProposal(func, opts);
          logger.info('Created proposal for transaction CreatecreateChaosAsset');
          const txnID = proposal.getTransactionId();

          logger.info('About to endorse transaction ');
          const txn = await proposal.endorse();
          logger.info('Endorsement successful for transactionID: %s', txnID);

          logger.info(`Received endorsed, broadcast to orderer for txnid ${txnID}`);
          const subtx = await txn.submit();
          logger.info(`Transaction submitted for txnID: ${txnID}`);

          const stat = await subtx.getStatus();
          logger.info(`Transaction status for txnID: ${txnID} status:%s`, stat);


      } catch (e) {
          logger.error('Error invoking chaincode', e);
      }
  }

  async evaluateTransaction(func: string, args: string[]): Promise<void> {
      const result = await this.contract.evaluateTransaction(func, ...args);
      logger.info(Buffer.from(result).toString());
      logger.info('Received asset %s', Buffer.from(result).toString());
  }
}
