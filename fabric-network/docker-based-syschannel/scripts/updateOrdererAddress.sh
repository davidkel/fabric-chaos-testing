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


fetchChannelConfig() {

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

  #copy config to modified config
  cp config.json modified_config.json
  # edit orderer address
  tmp=$(mktemp)
  jq '.channel_group.groups.Orderer.groups.OrdererOrg.values.Endpoints.value.addresses[0] = "new.orderer1.example.com:7050"' modified_config.json > "$tmp" && mv "$tmp" modified_config.json

  { set +x; } 2>/dev/null
}

# createConfigUpdate <channel_id> <original_config.json> <modified_config.json> <output.pb>
# Takes an original and modified config, and produces the config update tx
# which transitions between the two
# NOTE: this must be run in a CLI container since it requires configtxlator
createConfigUpdate() {
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
}

# Submit the config update transaction
submitConfigUpdateTransaction(){
    CHANNEL=$1
    FILE=$2
    peer channel update -f $FILE -c $CHANNEL -o localhost:7050 --tls --cafile $ORDERER_CA

}


# signConfigtxAsPeerOrg <org> <configtx.pb>
# Set the peerOrg admin of an org and sign the config update
signConfigtxAsPeerOrg() {
  ORG=$1
  CONFIGTXFILE=$2
  setGlobals $ORG
  set -x
  peer channel signconfigtx -f "${CONFIGTXFILE}"
  { set +x; } 2>/dev/null

}


fetchChannelConfig 1 'mychannel' 'config.json'
createConfigUpdate 'mychannel' 'config.json' 'modified_config.json' 'config_update_in_envelope.pb'


signConfigtxAsPeerOrg 1 'config_update_in_envelope.pb'
signConfigtxAsPeerOrg 2 'config_update_in_envelope.pb'


setGlobals 3

submitConfigUpdateTransaction 'mychannel' 'config_update_in_envelope.pb'


fetchChannelConfig 3 'mychannel' 'confignew.json'