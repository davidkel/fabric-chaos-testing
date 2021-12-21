# Getting started

## Fabric test network
In fabric-network/docker-based-syschannel

- First, download the 2.3.x binaries for fabric and unpack the tar file ensuring the binaries unpack into the bin directory and the config files unpack into the config directory

### To bring up the test network
- ./network.sh up
- ./network.sh createChannel
- ./network.sh deployCC -ccn basic -ccp ../../chaincode/node -ccl typescript

Which uses the default implicit majority endorsement policy

### To bring the network down
- ./network.sh down

### to change an endorsement policy
- ./network.sh changeCCEndorsement -ccn basic -ccs 2

This will set it to all 3 orgs required as the default

- ./network.sh changeCCEndorsement -ccn basic -ccs 5 -ccep "OR(AND('Org1MSP.member','Org2MSP.member'),AND('Org1MSP.member','Org3MSP.member'),AND('Org3MSP.member','Org2MSP.member'))"

to set it to an explicit majority endorsement policy

(TODO: Is there are way to return it to an implicit majority policy ?)

Note it is important to remember your current sequence number set by ccs for other activities

## adding another organisation

this expects that you have already brought the main network up, created a channel and deployed chaincode. Make sure you know your current sequence number as well as your deployed employment policy

To add Org4 to the environment and join the peers to the channel
- ./org4.sh up

To deploy chaincode to those peers you need the current chaincode definition sequence and the endorsement policy. So for example if you haven't changed the endorsement policy yet then
- ./org4.sh deployCC -ccn basic -ccp ../../chaincode/node -ccl typescript

should suffice. If you have changed the endorsement policy eg AND('Org1MSP.member','Org2MSP.member','Org3MSP.member') which is the inbuilt default for ./network.sh changeCCEndorsement then you might need
- ./org4.sh deployCC -ccn basic -ccp ../../chaincode/node -ccl typescript -ccs 2 -ccep "AND('Org1MSP.member','Org2MSP.member','Org3MSP.member')"

### changing endorsement policy

Once org4 is up you should use the org4.sh script to change endorsement policies rather than network.sh, eg

- ./org4.sh changeCCEndorsement -ccn basic -ccs 2

This will set it to all 4 orgs required as the default

- ./org4.sh changeCCEndorsement -ccn basic -ccs 3 -ccep "OR(AND('Org1MSP.member','Org2MSP.member','Org4MSP.member'),AND('Org1MSP.member','Org2MSP.member','Org3MSP.member'),AND('Org1MSP.member','Org3MSP.member','Org4MSP.member'),AND('Org2MSP.member','Org3MSP.member','Org4MSP.member'))"

to give an explicit majority for the 4 orgs

Make sure you increment the sequence number by 1. As the scripts are not atomic you can leave yourself in a partial state where some actions have succeeded and some have not.

### bringing the whole network down.

You can use either `./network.sh down` or `./org4.sh down` to bring the network down.

## Update orderer address

- ./scripts/updateOrdererAddress.sh

## bring up the client
Make sure you are using Node 14 or higher LTS release
In client
- npm install
- copy .sample-env to .env
- npm start
or instead of npm start
- npm run build
- node -r source-map-support/register --require dotenv/config dist/app.js

### .env file options

| keyword   | values | default | description |
| --------  | ------ | ------- | ------------|
| LOG_LEVEL | 'Failure','All','Failure&Success' | Failure | Set the log output |
| ORGS      |        | | identities for each org |
| ORG       |        | | the org this client is running as |
| MAX_TRANSACTION_COUNT | number | 30 | |
| PEER_ENDPOINT | | | external address of gatewat peer to connect to|
| CHANNEL_NAME |string |'mychannel' | Name of the channel used |
| CHAINCODE_NAME | string |'basic' |Name of the chaincode deployed |
| GATEWAY_PEER | | | used for ssl target name override |
| MAXLIMIT | number | 500 | max time in MS to wait before checking backlog has reduced |
| MINLIMIT | number | 50 | min time in MS to wait before checking backlog has reduced |
| GRPCSLEEPMAX | number | 1000 | max sleep between each waitForReady |
| GRPCSLEEPMIN | nunber | 500 | min sleep between each waitForReady |
| GRPC_TIMEOUT  | number | 20000 | grpc waitforready timeout in MS |
| ENDORSE_TIMEOUT | number | 30000 | timeout for endorsement in MS |
| EVALUATE_TIMEOUT | number | 30000 | timeout for evaluate in MS |
| SUBMIT_TIMEOUT | number | 10000 | timeout for submit in MS |
| STATUS_TIMEOUT  | number | 60000 | transaction commit notification timeout in MS |
| EVENT_TIMEOUT  | number | 5000 | chaincode event received timeout in MS |
| TRANSACTION_TYPE | 'random','submit','eval' | random | run either submits/evals or a combination |
| TXSTATS_TIMER | number | 5000 | check and optionally output stats at given interval in ms (0 = turn off) |
| TXSTATS_MODE | 'Stalled', 'Stopped', 'Stalled&Stopped', 'All' | 'All' | output just a warning if client could have stalled or also output txn stats as well. Ignored if TXSTATS_TIMER is 0 |
| COLOUR_LOGS | 'true', 'false' | 'true' | add colour to log lines |

The tx stats timer is also used to monitor whether a client may be in total failure mode

### Logging output
Standard log lines go to stdout, stats and stall warnings go to stderr

### Docker
client README.md has some details about using in docker

## Use the chaos engine
In chaos-engine
- npm install
- npm run build
- npm start
or instead of npm start
- node dist/start.js ./scenarios peer0.org1.example.com

chaos engine takes 3 parameters
1. location of the scenarios
2. gateway peer being used by client
3. (optional) single scenario | cycle | random (default)

Alternatively run it as a docker container
- docker build . -t chaos:latest
- ./runchaos.sh peer0.org1.example.com (optional single scenario | cycle | random)

This will mount the scenarios directory into the container (change the script to use different directories)

check the README.md file in the chaos-engine directory for details about scenarios
