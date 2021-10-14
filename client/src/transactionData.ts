
export interface TransactionDescriptor {
  type: 'submit' | 'eval';
  name:
    | 'readChaosAsset'
    | 'longRunningQuery'
    | 'longRunningEvaluate'
    | 'addUpdateAssets'
    | 'updateChaosAsset';
  params: string[];
}

export class TransactionData {
  txnsToRun: TransactionDescriptor[] = [
      { type: 'submit', name: 'addUpdateAssets', params: ['1', '2000'] },
      { type: 'eval', name: 'longRunningEvaluate', params: ['1', '2000'] },
      { type: 'eval', name: 'longRunningQuery', params: ['1000'] },
      { type: 'submit', name: 'updateChaosAsset', params: ['cd1', '99'] },
      { type: 'eval', name: 'readChaosAsset', params: ['cd1'] },
  ];


  getTransactionDetails(): TransactionDescriptor {
      const txnIndex = Math.round(Math.random() * (this.txnsToRun.length - 1));
      return this.txnsToRun[txnIndex];
  }

}
