import * as env from 'env-var';

export const logLevel = env
    .get('LOG_LEVEL')
    .default('logOnlyOnFailure')
    .asEnum(['logOnlyOnFailure', 'AllPoints','Failure&Success']);

export const ORGS = env.get('ORGS').required().asJson();

export const ORG = env.get('ORG').required().default('Org1MSP').asString();

export const MAX_UNFINISHED_TRANSACTION_COUNT = env
    .get('MAX_TRANSACTION_COUNT')
    .required()
    .default(30)
    .asIntPositive();

export const peerEndPoint = env
    .get('PEER_ENDPOINT')
    .required()
    .default('')
    .asString();

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

export const gatewayPeer = env.get('GATEWAY_PEER').asString();

export const maxLimit = env.get('MAXLIMIT').default(1000).asIntPositive();
export const minLimit = env.get('MINLIMIT').default(500).asIntPositive();
export const eventTimeout = env.get('EVENT_TIMEOUT').default(5000).asIntPositive();
export const statusTimeout = env.get('STATUS_TIMEOUT').default(5000).asIntPositive();
export const grpcTimeout = env.get('GRPC_TIMEOUT').default(20000).asIntPositive();

export const transactionType = env.get('TRANSACTION_TYPE').default('random').asEnum(['random','submit','eval']);
