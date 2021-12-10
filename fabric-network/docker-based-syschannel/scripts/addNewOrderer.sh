#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# import utils
. scripts/envVar.sh

COMPOSE_FILES=docker-compose-new-orderer.yaml
export FABRIC_CFG_PATH=$PWD/../config/
export CH_NAME='mychannel'
export PATH=${PWD}/../bin:$PATH

startNewOrderer(){
  docker-compose -f docker/${COMPOSE_FILES} up -d

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
    cryptogen extend --config=./organizations/cryptogen/crypto-config-orderer-new.yaml --input="./organizations"
    res=$?
    { set +x; } 2>/dev/null
    if [ $res -ne 0 ]; then
      fatalln "Failed to generate certificates..."
    fi
}


# fetchChannelConfig <org> <channel_id> <output_json>
# Writes the current channel config for a given channel to a JSON file
# NOTE: this must be run in a CLI container since it requires configtxlator

fetchChannelConfig() {
  timestamp

  ORG=$1
  CHANNEL=$2
  OUTPUT=$3

  setOrderer $ORG
  export FABRIC_CFG_PATH=$PWD/../config/

  echo '--------------------' $ORDERER
  infoln "$(timestamp) Fetching the most recent configuration block for the channel ${CHANNEL}"

  set -x
  peer channel fetch config config_block.pb -o localhost:7050 --ordererTLSHostnameOverride  orderer1.example.com --tls --cafile $ORDERER -c ${CHANNEL}
  { set +x; } 2>/dev/null


  infoln "Decoding config block to JSON and isolating config to ${OUTPUT}"
  set -x
  configtxlator proto_decode --input config_block.pb --type common.Block --output ${OUTPUT}
  { set +x; } 2>/dev/null

  #cleanup temp files
  rm config_block.pb
}


# createConfigUpdate <channel_id> <original_config.json> <modified_config.json> <output.pb>
# Takes an original and modified config, and produces the config update tx
# which transitions between the two
# NOTE: this must be run in a CLI container since it requires configtxlator
createConfigUpdateTLS() {
  infoln "$(timestamp) Creating orderer tls config update"

  CHANNEL=$1
  INPUT_CONFIGFILE=$2
  OUTPUT=$3

  TLS_FILE=./organizations/ordererOrganizations/example.com/orderers/orderer6.example.com/tls/server.crt

  set -x

  #cleanup prior temp files
  rm base_config_block.json org6consenter.json modified_config.json base_config.pb modified_config.pb updated_config.pb updated_config.json config_update_in_envelope.json

  # filter requird data
  jq .data.data[0].payload.data.config ${INPUT_CONFIGFILE} > base_config_block.json

  # edit orderer address
  echo "{\"client_tls_cert\":\"$(cat $TLS_FILE | base64)\",\"host\":\"orderer6.example.com\",\"port\":7056,\"server_tls_cert\":\"$(cat $TLS_FILE | base64)\"}" > org6consenter.json

  jq ".channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters += [$(cat org6consenter.json)]" base_config_block.json > modified_config.json

  configtxlator proto_encode --input base_config_block.json --type common.Config --output base_config.pb
  configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
  configtxlator compute_update --channel_id $CHANNEL --original base_config.pb --updated modified_config.pb --output updated_config.pb
  configtxlator proto_decode --input updated_config.pb --type common.ConfigUpdate --output updated_config.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'${CHANNEL}'", "type":2}},"data":{"config_update":'$(cat updated_config.json)'}}}' | jq . > config_update_in_envelope.json
  configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output "${OUTPUT}"

  { set +x; } 2>/dev/null

  infoln " $(timestamp) Completed creating config update "
}

createConfigUpdateEndpoint() {
  infoln "$(timestamp) Creating orderer endpoint config update"

  CHANNEL=$1
  INPUT_CONFIGFILE=$2
  OUTPUT=$3

  set -x

  #cleanup prior temp files
  rm base_config_block.json modified_config.json base_config.pb modified_config.pb updated_config.pb updated_config.json config_update_in_envelope.json

  # filter requird data
  jq .data.data[0].payload.data.config ${INPUT_CONFIGFILE} > base_config_block.json

  # edit orderer address
  jq ".channel_group.groups.Orderer.groups.OrdererOrg.values.Endpoints.value.addresses += [\"orderer6.example.com:7056\"]" base_config_block.json > modified_config.json

  configtxlator proto_encode --input base_config_block.json --type common.Config --output base_config.pb
  configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
  configtxlator compute_update --channel_id $CHANNEL --original base_config.pb --updated modified_config.pb --output updated_config.pb
  configtxlator proto_decode --input updated_config.pb --type common.ConfigUpdate --output updated_config.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'${CHANNEL}'", "type":2}},"data":{"config_update":'$(cat updated_config.json)'}}}' | jq . > config_update_in_envelope.json
  configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output "${OUTPUT}"

  { set +x; } 2>/dev/null

  #cleanup prior temp files
  rm base_config_block.json modified_config.json base_config.pb modified_config.pb updated_config.pb updated_config.json config_update_in_envelope.json

  infoln " $(timestamp) Completed creating config update "
}

# Submit the config update transaction
submitConfigUpdateTransaction(){

  infoln "Submitting config update transaction"
  ORG=$1
  CHANNEL=$2
  CONFIGTXFILE=$3
  setOrderer $ORG
   set -x

   peer channel update -f $CONFIGTXFILE -c $CHANNEL -o localhost:7050 --tls --cafile $ORDERER
  { set +x; } 2>/dev/null
  infoln " $(timestamp) Submit config update process done"
}

# generate crypto for new orderer
generateOrdererCrypto


# fetch latest config block from sysytem channel
fetchChannelConfig 1 'system-channel' 'config_block_iteration1.json'

# create config update for system channel
createConfigUpdateTLS 'system-channel' 'config_block_iteration1.json' 'neworderer_tls_config_update_in_envelope.pb'

# submit update in system channel
submitConfigUpdateTransaction 1 'system-channel' 'neworderer_tls_config_update_in_envelope.pb'
# fetch latest config and move the config block to channel artifacts



# fetch latest config block from sysytem channel
fetchChannelConfig 1 'system-channel' 'config_block_iteration2.json'

# update endpoint info in  sysytem channel
createConfigUpdateEndpoint 'system-channel' 'config_block_iteration2.json' 'neworderer_endpoint_config_update_in_envelope.pb'

# submit update in system channel
submitConfigUpdateTransaction 1 'system-channel' 'neworderer_endpoint_config_update_in_envelope.pb'



# start new orderer container
startNewOrderer



# Application channel updates
	fetchChannelConfig 1 'mychannel' 'mychannel_config_block_iteration1.json'
	createConfigUpdateTLS 'mychannel' 'mychannel_config_block_iteration1.json' 'mychannel_neworderer_tls_config_update_in_envelope.pb'
	submitConfigUpdateTransaction 1 'mychannel' 'mychannel_neworderer_tls_config_update_in_envelope.pb'


	fetchChannelConfig 1 'mychannel' 'mychannel_config_block_iteration2.json'
	createConfigUpdateEndpoint 'mychannel' 'mychannel_config_block_iteration2.json' 'mychannel_neworderer_endpoint_config_update_in_envelope.pb'
	submitConfigUpdateTransaction 1 'mychannel' 'mychannel_neworderer_endpoint_config_update_in_envelope.pb'


#verify latest block
fetchChannelConfig 1 'mychannel ' 'latest.json'

#verify system block
fetchChannelConfig 1 'system-channel ' 'latestsys.json'