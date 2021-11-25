#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# import utils
. scripts/envVar.sh

# fetchChannelConfig <org> <channel_id> <output_json>
# Writes the current channel config for a given channel to a JSON file
# NOTE: this must be run in a CLI container since it requires configtxlator

COMPOSE_FILES=docker-compose-new-orderer.yaml
FABRIC_CFG_PATH=$PWD/../config/
export CH_NAME='mychannel'

startNewOrderer(){
  # # generate artifacts if they don't exist
  # if [ ! -d "organizations/ordererOrganizations/example.com/orderers/orderer6.example.com" ]; then
  #   createOrgs
  #   createConsortium
  # fi

  docker-compose ${COMPOSE_FILES} up -d

  docker ps -a
  if [ $? -ne 0 ]; then
    fatalln "Unable to start network"
  fi

}
# Create Organziation crypto material using cryptogen or CAs
function generateOrdererCrypto() {
  # Create crypto material using cryptogen

    which cryptogen
    if [ "$?" -ne 0 ]; then
      fatalln "cryptogen tool not found. exiting"
    fi
    infoln "Generating certificates using cryptogen tool"

    infoln "Creating orderer Identities"

    set -x
    cryptogen generate --config=./organizations/cryptogen/crypto-config-orderer-new.yaml --output="${PWD}/organizations"
    res=$?
    { set +x; } 2>/dev/null
    if [ $res -ne 0 ]; then
      fatalln "Failed to generate certificates..."
    fi
}


fetchChannelConfig() {
  timestamp
  ORG=$1
  CHANNEL=$2
  OUTPUT=$3
  setOrderer $ORG
  export FABRIC_CFG_PATH=$PWD/../config/

  infoln "$(timestamp) Fetching the most recent configuration block for the channel"
  set -x
  peer channel fetch config config_block.pb -o localhost:7050 --ordererTLSHostnameOverride  orderer1.example.com --tls --cafile $ORDERER_CA -c ${CHANNEL}
  { set +x; } 2>/dev/null

  infoln "Decoding config block to JSON and isolating config to ${OUTPUT}"
  set -x
  configtxlator proto_decode --input config_block.pb --type common.Block --output ${OUTPUT}.json
  { set +x; } 2>/dev/null
}


# createConfigUpdate <channel_id> <original_config.json> <modified_config.json> <output.pb>
# Takes an original and modified config, and produces the config update tx
# which transitions between the two
# NOTE: this must be run in a CLI container since it requires configtxlator
createConfigUpdateTLS() {
  infoln "$(timestamp) Creating config update"
  CHANNEL=$1
  ORIGINAL=$2
  MODIFIED=$3
  OUTPUT=$4

  TLS_FILE=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer6.example.com/tls/server.crt
  echo ${TLS_FILE}
  echo 'path' ${PWD}

  set -x
  # filter requird data
  jq .data.data[0].payload.data.config config_block.json > "${ORIGINAL}"
  #copy config to modified config
  # cp config.json modified_config.json
  # edit orderer address
  echo "{\"client_tls_cert\":\"$(cat $TLS_FILE | base64)\",\"host\":\"orderer6.example.com\",\"port\":7056,\"server_tls_cert\":\"$(cat $TLS_FILE | base64)\"}" > $PWD/org6consenter.json
  jq ".channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters += [$(cat org6consenter.json)]" config.json > modified_config.json

  configtxlator proto_encode --input "${ORIGINAL}" --type common.Config --output config.pb
  configtxlator proto_encode --input "${MODIFIED}" --type common.Config --output modified_config.pb
  configtxlator compute_update --channel_id $CHANNEL --original config.pb --updated modified_config.pb --output config_update.pb
  configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'${CHANNEL}'", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json
  configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output "${OUTPUT}"

  { set +x; } 2>/dev/null
  infoln " $(timestamp) Completed creating config update "
}

createConfigUpdateEndpoint() {
  infoln "$(timestamp) Creating config update"
  CHANNEL=$1
  ORIGINAL=$2
  MODIFIED=$3
  OUTPUT=$4

  set -x
  # filter requird data
  jq .data.data[0].payload.data.config config_block.json > "${ORIGINAL}"
  #copy config to modified config
  # cp config.json modified_config.json
  # edit orderer address

  jq ".channel_group.groups.Orderer.groups.OrdererOrg.values.Endpoints.value.addresses += [\"orderer6.example.com:7056\"]" config.json > modified_config.json
  configtxlator proto_encode --input "${ORIGINAL}" --type common.Config --output config.pb
  configtxlator proto_encode --input "${MODIFIED}" --type common.Config --output modified_config.pb
  configtxlator compute_update --channel_id $CHANNEL --original config.pb --updated modified_config.pb --output config_update.pb
  configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'${CHANNEL}'", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json
  configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output "${OUTPUT}"

  { set +x; } 2>/dev/null
  infoln " $(timestamp) Completed creating config update "
}

# docker exec orderer-cli sh -c 'jq ".channel_group.values.OrdererAddresses.value.addresses += [\"orderer2.example.com:7050\"]" config.json > modified_config.json'
# docker exec orderer-cli sh -c 'configtxlator proto_encode --input config.json --type common.Config --output config.pb'
# docker exec orderer-cli sh -c 'configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb'
# docker exec orderer-cli sh -c 'configtxlator compute_update --channel_id system-channel --original config.pb --updated modified_config.pb --output config_update.pb'
# docker exec orderer-cli sh -c 'configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json'
# docker exec orderer-cli sh -c 'echo "{\"payload\":{\"header\":{\"channel_header\":{\"channel_id\":\"system-channel\", \"type\":2}},\"data\":{\"config_update\":"$(cat config_update.json)"}}}" | jq . > config_update_in_envelope.json'
# docker exec orderer-cli sh -c 'configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output config_update_in_envelope.pb'
# docker exec orderer-cli sh -c 'peer channel update -f config_update_in_envelope.pb -c system-channel -o orderer.example.com:7050 --tls true --cafile $ORDERER_CA'


# signConfigtxAsPeerOrg <org> <configtx.pb>
# Set the peerOrg admin of an org and sign the config update
signConfigtxAsPeerOrg() {
    infoln "Signing config update transaction"

  ORG=$1
  CONFIGTXFILE=$2
  setOrderer $ORG
  set -x
    echo 'CORE_PEER_LOCALMSPID' $CORE_PEER_LOCALMSPID
    echo 'CORE_PEER_TLS_ROOTCERT_FILE' $CORE_PEER_TLS_ROOTCERT_FILE
    echo 'CORE_PEER_MSPCONFIGPATH' $CORE_PEER_MSPCONFIGPATH
    echo 'CORE_PEER_TLS_CERT_FILE' $CORE_PEER_TLS_CERT_FILE
    echo 'CORE_PEER_TLS_KEY_FILE' $CORE_PEER_TLS_KEY_FILE
    echo 'CORE_PEER_ADDRESS' $CORE_PEER_ADDRESS
  peer channel signconfigtx -f "${CONFIGTXFILE}"
  { set +x; } 2>/dev/null
  infoln " $(timestamp) Completed signing the config update process"

}
# Submit the config update transaction
submitConfigUpdateTransaction(){

    infoln "Submitting config update transaction"
    ORG=$1
    CHANNEL=$2
    CONFIGTXFILE=$3
    setOrderer $ORG
   set -x
    echo 'CORE_PEER_LOCALMSPID' $CORE_PEER_LOCALMSPID
    echo 'CORE_PEER_TLS_ROOTCERT_FILE' $CORE_PEER_TLS_ROOTCERT_FILE
    echo 'CORE_PEER_MSPCONFIGPATH' $CORE_PEER_MSPCONFIGPATH
    echo 'CORE_PEER_TLS_CERT_FILE' $CORE_PEER_TLS_CERT_FILE
    echo 'CORE_PEER_TLS_KEY_FILE' $CORE_PEER_TLS_KEY_FILE
    echo 'CORE_PEER_ADDRESS' $CORE_PEER_ADDRESS
   peer channel update -f $CONFIGTXFILE -c $CHANNEL -o localhost:7050 --tls --cafile $ORDERER_CA
  { set +x; } 2>/dev/null
  infoln " $(timestamp) Submit config update process done"
}

verifyChannelConfig() {
  timestamp
  ORG=$1
  CHANNEL=$2
  OUTPUT=$3


  setGlobals $ORG
  export FABRIC_CFG_PATH=$PWD/../config/
  infoln "Fetching the most recent configuration block for the channel"
  set -x
  peer channel fetch config config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer1.example.com -c $CHANNEL --tls --cafile $ORDERER_CA
  { set +x; } 2>/dev/null

  infoln "Decoding config block to JSON and isolating config to ${OUTPUT}"
  set -x
  configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json

  # filter requird data
  jq .data.data[0].payload.data.config config_block.json > "${OUTPUT}"


  { set +x; } 2>/dev/null
}
echo '-----------------------------------------------------------------------------------------------------'
generateOrdererCrypto
echo '-----------------------------------------------------------------------------------------------------'
# fetch  channel config
fetchChannelConfig 1 'system-channel ' 'config_block'
echo '-----------------------------------------------------------------------------------------------------'
createConfigUpdateTLS 'system-channel' 'config.json' 'modified_config.json' 'config_update_in_envelope.pb'
echo '-----------------------------------------------------------------------------------------------------'
signConfigtxAsPeerOrg 1 'config_update_in_envelope.pb'
echo '-----------------------------------------------------------------------------------------------------'

submitConfigUpdateTransaction 1 'system-channel' 'config_update_in_envelope.pb'
echo '-----------------------------------------------------------------------------------------------------'



# Bring up new orderer
# startNewOrderer


# fetch latest channel config
# fetchChannelConfig 1 'system-channel ' 'config_block'
# createConfigUpdateEndpoint 'system-channel' 'config.json' 'modified_config.json' 'config_update_in_envelope.pb'
# signConfigtxAsPeerOrg 1 'config_update_in_envelope.pb'

# submitConfigUpdateTransaction 1 'system-channel' 'config_update_in_envelope.pb'

# fetchChannelConfig 1 'mychannel ' 'config_block'
# createConfigUpdateTLS 'mychannel' 'config.json' 'modified_config.json' 'config_update_in_envelope.pb'
# signConfigtxAsPeerOrg 1 'config_update_in_envelope.pb'
# submitConfigUpdateTransaction 1 'mychannel' 'config_update_in_envelope.pb'


# fetchChannelConfig 1 'mychannel ' 'config_block'
# createConfigUpdateEndpoint 'mychannel' 'config.json' 'modified_config.json' 'config_update_in_envelope.pb'
#  signConfigtxAsPeerOrg 1 'config_update_in_envelope.pb'
# submitConfigUpdateTransaction 1 'mychannel' 'config_update_in_envelope.pb'


