import { logger } from './utils/logger';

import { Contract, Gateway, Network, ProposalOptions } from 'fabric-gateway';

export class CCHelper {
  private static contractInstance: CCHelper;
  private static contract: Contract;
  private static network: Network;
  channel = '';
  chaincode = '';

  private constructor(gateway: Gateway, channel: string, chaincode: string) {
      CCHelper.network = gateway.getNetwork(channel);
      logger.info(
          'Created a network instance based on channel %s for user ',
          channel
      );
      CCHelper.contract = CCHelper.network.getContract(chaincode);
      return CCHelper.contractInstance;
  }

  static getInstance(
      gateway: Gateway,
      channel: string,
      chaincode: string
  ): CCHelper {
      return (
          CCHelper.contractInstance ||
      (CCHelper.contractInstance = new CCHelper(gateway, channel, chaincode))
      );
  }

  getContractInstance(): Contract {
      return CCHelper.contract;
  }



  getNetwork(): Network {
      return CCHelper.network;
  }

  async submitTransaction(func: string, args: string[]): Promise<void> {
      try {
          logger.info(
              'To invoke chaincode %s ',
              CCHelper.contract.getChaincodeId()
          );
          const opts: ProposalOptions = {
              arguments: args,
          };
          const proposal = CCHelper.contract.newProposal(func, opts);
          logger.info('Created proposal for transaction CreatecreateChaosAsset');

          logger.info('About to endorse transaction ');
          const txn = await proposal.endorse();
          const txnID = txn.getTransactionId();
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
      const result = await CCHelper.contract.evaluateTransaction(func, ...args);
      logger.info(Buffer.from(result).toString());
      logger.info('Received asset %s', Buffer.from(result).toString());
  }
}
