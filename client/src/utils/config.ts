import * as env from 'env-var';

export const logLevel = env
    .get('LOG_LEVEL')
    .default('info')
    .asEnum([ 'error', 'warn', 'info', 'debug']);

export const ORGS = env
    .get('ORGS')
    .required()
    .asJson()

export const ORG = env
    .get('ORG')
    .required()
    .default('Org1MSP')
    .asString()


export const MAX_UNFINISHED_TRANSACTION_COUNT = env
    .get('MAX_TRANSACTION_COUNT')
    .required()
    .default(5)
    .asIntPositive()

export const CHAINCODE_DATA = env
    .get('CHAINCODE_DATA')
    .required()
    .asJson()

export const peerEndPoint =env
    .get('PEER_ENDPOINT')
    .required()
    .default('')
    .asString()

export const channelName = env
    .get('CHANNEL_NAME')
    .required()
    .default('mychannel')
    .asString();

export const chaincodeName = env
    .get('CHAINCODE_NAME')
    .required()
    .default('basic')
    .asString();



export const gatewayPeer = env
    .get('GATEWAY_PEER')
    .asString();


export const maxLimit = env.get('MAXLIMIT').default(500).asIntPositive();
export const minLimit = env.get('MINLIMIT').default(50).asIntPositive();
export const timeout = env.get('TIMEOUT').default(2000).asIntPositive();
