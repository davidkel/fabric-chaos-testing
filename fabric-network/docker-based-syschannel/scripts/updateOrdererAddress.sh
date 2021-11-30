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
FABRIC_CFG_PATH=$PWD/../config/
COMPOSE_FILE_ORDERER_UPDATE='ordererUpdate.yaml'


generateOrdererCrypto() {
  # Create crypto material using cryptogen

    which cryptogen
    if [ "$?" -ne 0 ]; then
      fatalln "cryptogen tool not found. exiting"
    fi
    infoln "Generating certificates using cryptogen tool"

    infoln "Creating orderer Identities"

    set -x
    cryptogen extend --config=./organizations/cryptogen/crypto-config-update-orderer.yaml --input="${PWD}/organizations"
    res=$?
    { set +x; } 2>/dev/null
    if [ $res -ne 0 ]; then
      fatalln "Failed to generate certificates..."
    fi
}

verifyChannelConfig() {
  timestamp
  ORG=$1
  CHANNEL=$2
  OUTPUT=$3


  if [ $CHANNEL == 'system-channel' ]
  then
   echo "setting orderer env variables"
   setOrderer $ORG
  else
   echo "setting peer env variables"
   setGlobals $ORG
  fi

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
fetchChannelConfig() {
  timestamp
  ORG=$1
  CHANNEL=$2
  OUTPUT=$3
  MODIFIED=$4




  TLS_FILE=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.crt

  if [ $CHANNEL == 'system-channel' ]
  then
   echo "setting orderer env variables"
   setOrderer $ORG
  else
   echo "setting peer env variables"
   setGlobals $ORG
  fi

  export FABRIC_CFG_PATH=$PWD/../config/
  infoln "$(timestamp) Fetching the most recent configuration block for the channel"
  set -x
  peer channel fetch config config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer1.example.com -c $CHANNEL --tls --cafile $ORDERER_CA
  { set +x; } 2>/dev/null

  infoln "Decoding config block to JSON and isolating config to ${OUTPUT}"
  set -x
  configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json

  # filter requird data
  jq .data.data[0].payload.data.config config_block.json > "${OUTPUT}"


  # edit orderer address and tls cert
  tmp=$(mktemp)
  jq '.channel_group.groups.Orderer.groups.OrdererOrg.values.Endpoints.value.addresses[1] = "orderer2.example.com:7057"'  ${OUTPUT} > ${MODIFIED}
  echo "{\"client_tls_cert\":\"$(cat $TLS_FILE | base64)\",\"host\":\"orderer2.example.com\",\"port\":7057,\"server_tls_cert\":\"$(cat $TLS_FILE | base64)\"}" > $PWD/ordererconsenter.json




  ordererconsenter=`cat $PWD/ordererconsenter.json`
  tmp=$(mktemp)
  jq '.channel_group.groups.Orderer.values.ConsensusType.value.metadata.consenters[1] = '$ordererconsenter'' ${MODIFIED} > "$tmp" && mv "$tmp" ${MODIFIED}

  { set +x; } 2>/dev/null
}

# createConfigUpdate <channel_id> <original_config.json> <modified_config.json> <output.pb>
# Takes an original and modified config, and produces the config update tx
# which transitions between the two
# NOTE: this must be run in a CLI container since it requires configtxlator
createConfigUpdate() {
  infoln "$(timestamp) Creating config update"
  CHANNEL=$1
  ORIGINAL=$2
  MODIFIED=$3
  OUTPUT=$4

  set -x
  configtxlator proto_encode --input "${ORIGINAL}" --type common.Config --output config.pb
  configtxlator proto_encode --input "${MODIFIED}" --type common.Config --output modified_config.pb
  configtxlator compute_update --channel_id $CHANNEL --original config.pb --updated modified_config.pb --output config_update.pb
  configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json
  echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL'", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json
  configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output "${OUTPUT}"

  { set +x; } 2>/dev/null
  infoln " $(timestamp) Completed creating config update "
}


# signConfigtxAsPeerOrg <org> <configtx.pb>
# Set the peerOrg admin of an org and sign the config update
signConfigtxAsPeerOrg() {
    infoln "Signing config update transaction"

  ORG=$1
  CONFIGTXFILE=$2
  setOrderer $ORG
  set -x

  peer channel signconfigtx -f "${CONFIGTXFILE}"
  { set +x; } 2>/dev/null
  infoln " $(timestamp) Completed signing the config update process"

}
# Submit the config update transaction
submitConfigUpdateTransaction(){
  infoln "$(timestamp) Submitting config update transaction"
  ORG=$1
  CHANNEL=$2
  CONFIGTXFILE=$3
  if [ $CHANNEL == 'system-channel' ]
  then
   echo "setting orderer env variables"
   setOrderer $ORG
  else
   echo "setting peer  env variables"
   setGlobals $ORG
  fi

   set -x
   peer channel update -f $CONFIGTXFILE -c $CHANNEL -o localhost:7050 --tls --cafile $ORDERER_CA
  { set +x; } 2>/dev/null
  infoln " $(timestamp) Submit config update process done"
}
startOrderer(){
  infoln " $(timestamp) Recreating orderer container at new port"
  docker-compose -f docker/${COMPOSE_FILE_ORDERER_UPDATE} up -d
  docker ps
}
stopOrderer(){
  infoln " $(timestamp) stopping orderer container at old port"
  docker stop orderer2.example.com
  docker ps
}
fetchConfigBlock(){

    infoln "Fetch latest block from channel ${2}"
    ORG=$1
    CHANNEL=$2
    setOrderer $ORG
    peer channel fetch config channel-artifacts/latest_config.block -o localhost:7050 --ordererTLSHostnameOverride  orderer1.example.com  -c ${CHANNEL} --tls --cafile $ORDERER_CA
    docker cp cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/latest_config.block ./channel-artifacts/latest_config.block
}


# # stop orderer at old port
# stopOrderer

# #remove old cypto
# rm -r organizations/ordererOrganizations/example.com/orderers/orderer2.example.com



# Update crypto for orderer
generateOrdererCrypto

# Update system channel

# fetch latest channel config
fetchChannelConfig 1 'system-channel' 'sys-config.json' 'sys-modified_config.json'

# create update config
createConfigUpdate 'system-channel' 'sys-config.json' 'sys-modified_config.json' 'sys-config_update_in_envelope.pb'

# sign by org1 admin
signConfigtxAsPeerOrg 1 'sys-config_update_in_envelope.pb'

# submit update by org1
submitConfigUpdateTransaction 1 'system-channel' 'sys-config_update_in_envelope.pb'

# check for updation
verifyChannelConfig 1 'system-channel' 'sys-confignew.json'



# # Update application channel

# fetch latest channel config
fetchChannelConfig 1 'mychannel' 'config.json' 'modified_config.json'

# create update config
createConfigUpdate 'mychannel' 'config.json' 'modified_config.json' 'config_update_in_envelope.pb'

# sign by org1 admin
signConfigtxAsPeerOrg 1 'config_update_in_envelope.pb'



# submit update by org1
submitConfigUpdateTransaction 1 'mychannel' 'config_update_in_envelope.pb'

# check for updation
verifyChannelConfig 1 'mychannel' 'confignew.json'



fetchConfigBlock 1 'system-channel'


#start orderer at new port
startOrderer