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

}


# Submit the config update transaction

fetchConfigBlock(){

    infoln "Fetch latest block from channel ${2}"
    ORG=$1
    CHANNEL=$2
    setOrderer $ORG
    peer channel fetch config channel-artifacts/latest_config.block -o localhost:7050 --ordererTLSHostnameOverride  orderer1.example.com  -c ${CHANNEL} --tls --cafile $ORDERER_CA
    docker cp cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/latest_config.block ./channel-artifacts/latest_config.block
}


# fetch latest channel config
fetchChannelConfig 1 'system-channel' 'sys-config.json' 'sys-modified_config.json'

#fetchConfigBlock 1 'system-channel'
