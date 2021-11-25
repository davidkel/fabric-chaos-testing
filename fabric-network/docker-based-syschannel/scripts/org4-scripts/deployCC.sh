#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# This script is designed to be run in the cli container as the
# second step of the EYFN tutorial. It joins the org4 peers to the
# channel previously setup in the BYFN tutorial and install the
# chaincode as version 2.0 on peer0.org4.
#


source scripts/utils.sh

CHANNEL_NAME=${1:-"mychannel"}
CC_NAME=${2}
CC_SRC_PATH=${3}
CC_SRC_LANGUAGE=${4}
CC_VERSION=${5:-"1.0"}
CC_SEQUENCE=${6:-"1"}
CC_INIT_FCN=${7:-"NA"}
#CC_END_POLICY=${8:-"NA"}
CC_END_POLICY="OR(AND('Org1MSP.member','Org2MSP.member'),AND('Org1MSP.member','Org3MSP.member'),AND('Org3MSP.member','Org2MSP.member'))"
CC_COLL_CONFIG=${9:-"NA"}
DELAY=${10:-"3"}
MAX_RETRY=${11:-"5"}
VERBOSE=${12:-"false"}


println "executing with the following"
println "- CHANNEL_NAME: ${C_GREEN}${CHANNEL_NAME}${C_RESET}"
println "- CC_NAME: ${C_GREEN}${CC_NAME}${C_RESET}"
println "- CC_SRC_PATH: ${C_GREEN}${CC_SRC_PATH}${C_RESET}"
println "- CC_SRC_LANGUAGE: ${C_GREEN}${CC_SRC_LANGUAGE}${C_RESET}"
println "- CC_VERSION: ${C_GREEN}${CC_VERSION}${C_RESET}"
println "- CC_SEQUENCE: ${C_GREEN}${CC_SEQUENCE}${C_RESET}"
println "- CC_END_POLICY: ${C_GREEN}${CC_END_POLICY}${C_RESET}"
println "- CC_COLL_CONFIG: ${C_GREEN}${CC_COLL_CONFIG}${C_RESET}"
println "- CC_INIT_FCN: ${C_GREEN}${CC_INIT_FCN}${C_RESET}"
println "- DELAY: ${C_GREEN}${DELAY}${C_RESET}"
println "- MAX_RETRY: ${C_GREEN}${MAX_RETRY}${C_RESET}"
println "- VERBOSE: ${C_GREEN}${VERBOSE}${C_RESET}"
# import environment variables
. scripts/envVar.sh
# . scripts/utils.sh

#User has not provided a name
if [ -z "$CC_NAME" ] || [ "$CC_NAME" = "NA" ]; then
  fatalln "No chaincode name was provided. Valid call example: ./network.sh deployCC -ccn basic -ccp ../../chaincode/node -ccl typescript"

# # User has not provided a path
elif [ -z "$CC_SRC_PATH" ] || [ "$CC_SRC_PATH" = "NA" ]; then
  fatalln "No chaincode name was provided. Valid call example: ./network.sh deployCC -ccn basic -ccp ../../chaincode/node -ccl typescript"

# # User has not provided a language
elif [ -z "$CC_SRC_LANGUAGE" ] || [ "$CC_SRC_LANGUAGE" = "NA" ]; then
  fatalln "No chaincode name was provided. Valid call example: ./network.sh deployCC -ccn basic -ccp ../../chaincode/node -ccl typescript"

# ## Make sure that the path to the chaincode exists
# elif [ ! -d "$CC_SRC_PATH" ]; then
#   fatalln "Path to chaincode does not exist. Please provide different path."
fi

CC_SRC_LANGUAGE=$(echo "$CC_SRC_LANGUAGE" | tr [:upper:] [:lower:])

# do some language specific preparation to the chaincode before packaging
if [ "$CC_SRC_LANGUAGE" = "go" ]; then
  CC_RUNTIME_LANGUAGE=golang

  infoln "Vendoring Go dependencies at $CC_SRC_PATH"
  pushd $CC_SRC_PATH
  GO111MODULE=on go mod vendor
  popd
  successln "Finished vendoring Go dependencies"

elif [ "$CC_SRC_LANGUAGE" = "java" ]; then
  CC_RUNTIME_LANGUAGE=java

  infoln "Compiling Java code..."
  pushd $CC_SRC_PATH
  ./gradlew installDist
  popd
  successln "Finished compiling Java code"
  CC_SRC_PATH=$CC_SRC_PATH/build/install/$CC_NAME

elif [ "$CC_SRC_LANGUAGE" = "javascript" ]; then
  CC_RUNTIME_LANGUAGE=node

elif [ "$CC_SRC_LANGUAGE" = "typescript" ]; then
  CC_RUNTIME_LANGUAGE=node

  infoln "Compiling TypeScript code into JavaScript..."
  pushd $CC_SRC_PATH
  npm install
  npm run build
  popd
  successln "Finished compiling TypeScript code into JavaScript"

else
  fatalln "The chaincode language ${CC_SRC_LANGUAGE} is not supported by this script. Supported chaincode languages are: go, java, javascript, and typescript"
  exit 1
fi

INIT_REQUIRED="--init-required"
# check if the init fcn should be called
if [ "$CC_INIT_FCN" = "NA" ]; then
  INIT_REQUIRED=""
fi

if [ "$CC_END_POLICY" = "NA" ]; then
  CC_END_POLICY=""
else
  CC_END_POLICY="--signature-policy $CC_END_POLICY"
fi

if [ "$CC_COLL_CONFIG" = "NA" ]; then
  CC_COLL_CONFIG=""
else
  CC_COLL_CONFIG="--collections-config $CC_COLL_CONFIG"
fi

packageChaincode() {


  set -x
  peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang ${CC_RUNTIME_LANGUAGE} --label ${CC_NAME}_${CC_VERSION} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode packaging has failed"
  successln "Chaincode is packaged"
}

installChaincode() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode install ${CC_NAME}.tar.gz >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode installation on peer0.org${ORG} has failed"
  successln "Chaincode is installed on peer0.org${ORG}"

}

queryInstalled() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode queryinstalled >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  PACKAGE_ID=$(sed -n "/${CC_NAME}_${CC_VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
  export PACKAGE_ID=$PACKAGE_ID
  verifyResult $res "Query installed on peer0.org${ORG} has failed"
  successln "Query installed successful on peer0.org${ORG} on channel"
}

# approveForMyOrg VERSION PEER ORG
approveForMyOrg() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
  successln "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME'"
}


queryCommitted() {
  ORG=$1
  setGlobals $ORG
  EXPECTED_RESULT="Version: ${CC_VERSION}, Sequence: ${CC_SEQUENCE}, Endorsement Plugin: escc, Validation Plugin: vscc"
  infoln "Querying chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'..."
  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    infoln "Attempting to Query committed status on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name ${CC_NAME} >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    test $res -eq 0 && VALUE=$(cat log.txt | grep -o '^Version: '$CC_VERSION', Sequence: [0-9]*, Endorsement Plugin: escc, Validation Plugin: vscc')
    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -eq 0; then
    successln "Query chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME'"
  else
    fatalln "After $MAX_RETRY attempts, Query chaincode definition result on peer0.org${ORG} is INVALID!"
  fi
}

## package the chaincode
packageChaincode

## Install chaincode on peer0.org4
infoln "Installing chaincode on peer0.org4..."
installChaincode 4


## query whether the chaincode is installed
queryInstalled 4

## approve the definition for org4
approveForMyOrg 4



## query on both orgs to see that the definition committed successfully
queryCommitted 4







