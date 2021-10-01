import * as env from 'env-var';

export const logLevel = env
  .get('LOG_LEVEL')
  .default('info')
  .asEnum([ 'error', 'warn', 'info', 'debug']);

export const keyPath = env
  .get('KEY_PATH')
  .default('')
  .asString()

  export const certPath = env
  .get('CERT_PATH')
  .default('')
  .asString()

  export const tlsCertPath = env
  .get('TLS_CERT_PATH')
  .default('')
  .asString()

  export const peerEndPoint =env
  .get('PEER_ENDPOINT')
  .default('')
  .asString()

  export const channelName = env
  .get('CHANNEL_NAME')
  .default('mychannel')
  .asString();

export const chaincodeName = env
  .get('CHAINCODE_NAME')
  .default('basic')
  .asString();



export const mspID = env
  .get('MSP_ID')
  .default('Org1MSP')
  .asString();


  export const gatewayPeer = env
  .get('GATEWAY_PEER')
  .asString();




