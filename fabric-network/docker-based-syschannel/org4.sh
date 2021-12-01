#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0
#

# prepending $PWD/../bin to PATH to ensure we are picking up the correct binaries
# this may be commented out to resolve installed version of tools if desired
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/org4-configtx
export VERBOSE=false

. scripts/utils.sh

# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  org4.sh up|deployCC|changeCCEndorsement [-c <channel name>] [-t <timeout>] [-d <delay>]"
  echo "  org4.sh -h|--help (print this message)"
  echo "    <mode> - one of 'up', 'down', or 'generate'"
  echo "      - 'up' - add org4 to the sample network. You need to bring up the test network and create a channel first."
  echo "      - 'deployCC' - deploy Chaincode on org4"
  echo "      - 'changeCCEndorsement' - change endorsement policy for a 4 org network"
  echo "    -c <channel name> - test network channel name (defaults to \"mychannel\")"
  echo "    -t <timeout> - CLI timeout duration in seconds (defaults to 10)"
  echo "    -d <delay> - delay duration in seconds (defaults to 3)"
  echo "    -ccn <chaincode node> "
  echo "    -ccp <chaincode path> "
  echo "    -ccl <chaincode language> "
  echo "    -ccs <current chaincode definition sequence> - DON'T create a new sequence"
  echo "    -ccep <current chaincode endorsement policy> - It will fail if it doesn't match the currently defined one"


  echo "    -verbose - verbose mode"
  echo
  echo "Typically, one would first generate the required certificates and "
  echo "genesis block, then bring up the network. e.g.:"
  echo
  echo "	org4.sh up"
  echo "	org4.sh up -c mychannel -s couchdb"
  echo "	org4.sh deployCC -ccn basic -ccp ../../chaincode/node -ccl typescript"
  echo
}

# We use the cryptogen tool to generate the cryptographic material
# (x509 certs) for the new org.  After we run the tool, the certs will
# be put in the organizations folder with org1 and org2

# Create Organziation crypto material using cryptogen or CAs
function generateOrg4() {
  # Create crypto material using cryptogen
  which cryptogen
  if [ "$?" -ne 0 ]; then
    fatalln "cryptogen tool not found. exiting"
  fi
  infoln "Generating certificates using cryptogen tool"
  infoln "Creating Org4 Identities"

  set -x
  cryptogen generate --config=./organizations/cryptogen/crypto-config-org4.yaml --output="organizations"
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    fatalln "Failed to generate certificates..."
  fi
}

# Generate channel configuration transaction
function generateOrg4Definition() {
  which configtxgen
  if [ "$?" -ne 0 ]; then
    fatalln "configtxgen tool not found. exiting"
  fi
  infoln "Generating Org4 organization definition"
  set -x
  configtxgen -printOrg Org4MSP > organizations/peerOrganizations/org4.example.com/org4.json
  res=$?
  { set +x; } 2>/dev/null
  if [ $res -ne 0 ]; then
    fatalln "Failed to generate Org4 organization definition..."
  fi
}

function Org4Up () {
  # start org4 nodes
  DOCKER_SOCK=${DOCKER_SOCK} docker-compose -f $COMPOSE_FILE_ORG4 up -d 2>&1
  if [ $? -ne 0 ]; then
    fatalln "ERROR !!!! Unable to start Org4 network"
  fi
}

# Generate the needed certificates, the genesis block and start the network.
function addOrg4 () {
  # If the test network is not up, abort
  if [ ! -d organizations/ordererOrganizations ]; then
    fatalln "ERROR: Please, run ./network.sh up createChannel first."
  fi

  # generate artifacts if they don't exist
  if [ ! -d "organizations/peerOrganizations/org4.example.com" ]; then
    generateOrg4
    generateOrg4Definition
  fi

  infoln "Bringing up Org4 peers"
  Org4Up

  # Use the CLI container to create the configuration transaction needed to add
  # Org4 to the network
  infoln "Generating and submitting config tx to add Org4"
  scripts/updateChannelConfig.sh $CHANNEL_NAME $CLI_DELAY $CLI_TIMEOUT $VERBOSE
  if [ $? -ne 0 ]; then
    fatalln "ERROR !!!! Unable to create config tx"
  fi

  # Join the Org4 Peers to the Channel
  scripts/joinChannel.sh 4 $CHANNEL_NAME $CLI_DELAY $CLI_TIMEOUT $VERBOSE
  if [ $? -ne 0 ]; then
    fatalln "ERROR !!!! Unable to join Org4 peers to network"
  fi

  # Set the Org4 Anchor Peer
  scripts/setAnchorPeer.sh 4 $CHANNEL_NAME
  if [ $? -ne 0 ]; then
    fatalln "ERROR !!!! Unable to join Org4 peers to network"
  fi

}

function deployCC(){
  infoln "Deploying chaincode on org4"
  scripts/deployCC.sh org4 $CHANNEL_NAME $CC_NAME $CC_SRC_PATH $CC_SRC_LANGUAGE $CC_VERSION $CC_SEQUENCE $CC_INIT_FCN $CC_END_POLICY $CC_COLL_CONFIG $CLI_DELAY $MAX_RETRY $VERBOSE
}

## Call the change chaincode endosement policy
function changeCCEndorsement() {
  echo "$(timestamp): To change chaincode endorsement policy"

  scripts/changeCCEndosementPolicy.sh all $CHANNEL_NAME $CC_NAME $CC_VERSION $CC_SEQUENCE $CC_INIT_FCN $CC_END_POLICY $CC_COLL_CONFIG $CLI_DELAY $MAX_RETRY $VERBOSE

  if [ $? -ne 0 ]; then
    fatalln "Changing endorsement policy failed"
  fi
}


# Using crpto vs CA. default is cryptogen
CRYPTO="cryptogen"
# timeout duration - the duration the CLI should wait for a response from
# another container before giving up
MAX_RETRY=5
CLI_TIMEOUT=10
#default for delay
CLI_DELAY=3
# channel name defaults to "mychannel"
CHANNEL_NAME="mychannel"
# use this as the docker compose couch file
# COMPOSE_FILE_COUCH_ORG4=docker/docker-compose-couch-org4.yaml
# use this as the default docker-compose yaml definition
COMPOSE_FILE_ORG4=docker/docker-compose-org4.yaml
# database
DATABASE="leveldb"
# chaincode name defaults to "NA"
CC_NAME="NA"
# chaincode path defaults to "NA"
CC_SRC_PATH="NA"
# endorsement policy defaults to "NA". This would allow chaincodes to use the majority default policy.
CC_END_POLICY="NA"
# collection configuration defaults to "NA"
CC_COLL_CONFIG="NA"
# chaincode init function defaults to "NA"
CC_INIT_FCN="NA"
# chaincode language defaults to "NA"
CC_SRC_LANGUAGE="NA"
# Chaincode version
CC_VERSION="1.0"
# Chaincode definition sequence
CC_SEQUENCE=1

# Get docker sock path from environment variable
SOCK="${DOCKER_HOST:-/var/run/docker.sock}"
DOCKER_SOCK="${SOCK##unix://}"

# Parse commandline args

## Parse mode
if [[ $# -lt 1 ]] ; then
  printHelp
  exit 0
else
  MODE=$1
  shift
fi



while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    printHelp
    exit 0
    ;;
  -ccn )
    CC_NAME="$2"
    shift
    ;;
  -t )
    CLI_TIMEOUT="$2"
    shift
    ;;
  -d )
    CLI_DELAY="$2"
    shift
    ;;
  -ccp )
    CC_SRC_PATH="$2"
    shift
    ;;
  -ccl )
    CC_SRC_LANGUAGE="$2"
    shift
    ;;
  -ccs )
    CC_SEQUENCE="$2"
    shift
    ;;
  -ccep )
    CC_END_POLICY="$2"
    shift
    ;;
  -cccg )
    CC_COLL_CONFIG="$2"
    shift
    ;;
  -cci )
    CC_INIT_FCN="$2"
    shift
    ;;
  -verbose )
    VERBOSE=true
    shift
    ;;
  * )
    errorln "Unknown flag: $key"
    printHelp
    exit 1
    ;;
  esac
  shift
done


# Determine whether starting, stopping, restarting or generating for announce
if [ "$MODE" == "up" ]; then
  infoln "Adding org4 to channel '${CHANNEL_NAME}' with '${CLI_TIMEOUT}' seconds and CLI delay of '${CLI_DELAY}' seconds and using database '${DATABASE}'"
  echo
elif [ "$MODE" == "generate" ]; then
  EXPMODE="Generating certs and organization definition for Org4"
elif [ "$MODE" == "deployCC" ]; then
  EXPMODE="Deploying Chaincode"
elif [ "$MODE" == "changeCCEndorsement" ]; then
  infoln "Changing chaincode endorsement policy"
elif [ "$MODE" == "down" ]; then
  infoln "Bringing network down"
else
  printHelp
  exit 1
fi

#Create the network using docker compose
if [ "${MODE}" == "up" ]; then
  addOrg4
elif [ "${MODE}" == "deployCC" ]; then ## deploy cc
  deployCC
elif [ "${MODE}" == "generate" ]; then ## Generate Artifacts
  generateOrg4
  generateOrg4Definition
elif [ "$MODE" == "changeCCEndorsement" ]; then
  changeCCEndorsement
elif [ "$MODE" == "down" ]; then
  ./network.sh down
else
  printHelp
  exit 1
fi