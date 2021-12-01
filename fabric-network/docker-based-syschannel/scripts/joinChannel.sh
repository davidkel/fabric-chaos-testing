#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0
#

JOINING_ORG="$1"
CHANNEL_NAME="$2"
DELAY="$3"
VERBOSE="$4"
: ${CHANNEL_NAME:="mychannel"}
: ${DELAY:="3"}
: ${VERBOSE:="false"}

MAX_RETRY=5

# import environment variables
. scripts/envVar.sh

FABRIC_CFG_PATH=$PWD/../config/

joinPeersToChannel() {
  ORG=$1
  setGlobals $ORG

  local rc=1
  local COUNTER=1

	## Sometimes Join takes time, hence retry
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    set -x
    peer channel join -b $BLOCKFILE >&log.txt
    res=$?
    { set +x; } 2>/dev/null
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
  done

  cat log.txt
  verifyResult $res "After $MAX_RETRY attempts, peer0.org${ORG} has failed to join channel '$CHANNEL_NAME' "

  setGlobalsPeer1 $ORG

  local rc=1
  local COUNTER=1

	## Sometimes Join takes time, hence retry
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    set -x
    peer channel join -b $BLOCKFILE >&log.txt
    res=$?
    { set +x; } 2>/dev/null
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
  done

  cat log.txt
  verifyResult $res "After $MAX_RETRY attempts, peer1.org${ORG} has failed to join channel '$CHANNEL_NAME' "
}

setGlobals $JOINING_ORG
BLOCKFILE="${CHANNEL_NAME}.block"

infoln "Fetching genesis channel config block from orderer in order to join a peer to the channel ..."
set -x
peer channel fetch 0 $BLOCKFILE -o localhost:7050 --ordererTLSHostnameOverride orderer1.example.com -c $CHANNEL_NAME --tls --cafile "$ORDERER_CA" >&log.txt
res=$?
{ set +x; } 2>/dev/null
cat log.txt
verifyResult $res "Fetching genesis block from orderer has failed"

infoln "Joining Org${JOINING_ORG} peers to the channel..."
joinPeersToChannel $JOINING_ORG

successln "Channel '$CHANNEL_NAME' joined by org${JOINING_ORG} peers"
