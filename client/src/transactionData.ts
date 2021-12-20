import {getRandomNumber} from './utils/helper';
export interface TransactionDescriptor {
  type: 'submit' | 'eval';
  name:
    | 'readChaosAsset'
    | 'longRunningQuery'
    | 'longRunningEvaluate'
    | 'addUpdateAssets'
    | 'createUpdateChaosAsset';
  params: string[];
}

export class TransactionData {
  txnsToRun: TransactionDescriptor[] = [
      { type: 'submit', name: 'addUpdateAssets', params: ['1', '2000'] },
      { type: 'eval', name: 'longRunningEvaluate', params: ['1', '2000'] },
      { type: 'eval', name: 'longRunningQuery', params: ['1000'] },
      { type: 'submit', name: 'createUpdateChaosAsset', params: ['cd1', '99'] },
      { type: 'eval', name: 'readChaosAsset', params: ['cd1'] },
  ];


  getTransactionDetails(type:string): TransactionDescriptor {

      if (type === 'random'){
          return this.txnsToRun[getRandomNumber(this.txnsToRun.length )];
      }
      else {
          const transData = this.txnsToRun.filter(data=>data.type === type)
          return transData[getRandomNumber(transData.length)]
      }

  }

}
