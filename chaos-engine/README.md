# Build a chaos engine
This is a process that executes a series of scenarios randomly. The scenarios are made of of the following simple commands

- StopGateway
- KillGateway
- PauseGateway
- RestartGateway
- UnpauseGateway
- StopPeer
- KillPeer
- PausePeer
- UnpausePeer
- RestartPeer
- StopAllPeers (org) --- org is optional
- KillAllPeers (org) --- org is optional
- PauseAllPeers (org)
- RestartAllPeers (org)
- UnpauseAllPeers (org)
- StopOrderer
- KillOrderer
- PauseOrderer
- RestartOrderer
- UnpauseOrderer
- StopAllOrderers
- KillAllOrderers
- PauseAllOrderers
- RestartAllOrderers
- UnpauseAllOrderers
- Delay ms | random[min ms, max ms]
- Sleep ms | random[min ms, max ms]

restart will restart a stopped or killed node

Stopping 1 or more peers will never stop the gateway peer even if you specify the org that the gateway peer is in. Specifying an org only actions peers in that org, specifying no org on this will action all peers (except the gateway peer)

to run
- npm start (has a preset)
- node dist/start.js <SCENARIO_DIR> <GATEWAY_PEER> <ScenarioName | random | cycle> <runConstraint>

<SCENARIO_DIR> is the directory containing all the scenarios to run
<GATEWAY_PEER> is the name of the peer that will be used as the gateway peer by the chaos client
<ScenarioName | random | cycle> is either the scenario name or the mode to run all the scenarios in the directory. If nothing is provided, `random` is the default
<runConstraint> applies only to random or cycle modes. If not provided then the chaos engine runs indefinitely until it receives a SIGINT
runConstraint can be either a timelimit defined in seconds, or a counter. For random it counts the number of scenarios, or cycle it counts the number of completed cycles of scenarios

## Examples
```
node dist/start.js ./scenarios/stop-scenarios peer0.org1.example.com
```
runs all scenarios in `./scenarios/stop-scenarios` randomly until SIGINT is received

```
node dist/start.js ./scenarios/stop-scenarios peer0.org1.example.com StopAndRestartGateway
```
Runs the single scenario `StopAndRestartGateway` (note this is the scenario name, not the file name) once

```
node dist/start.js ./scenarios/stop-scenarios peer0.org1.example.com cycle
```
runs all scenarios in `./scenarios/stop-scenarios` in cycle mode (ie runs each scenario in sequence and then repeats) until SIGINT is received


```
node dist/start.js ./scenarios/stop-scenarios peer0.org1.example.com random 300s
```
runs all scenarios in `./scenarios/stop-scenarios` randomly for about 300s (The last scenario must be allowed to complete)

```
node dist/start.js ./scenarios/stop-scenarios peer0.org1.example.com cycle 10
```
runs all scenarios in `./scenarios/stop-scenarios` in cycle mode and complete 10 cycles

```
node dist/start.js ./scenarios/stop-scenarios peer0.org1.example.com random 3000
```
runs all scenarios in `./scenarios/stop-scenarios` randomly until 3000 scenarios have been executed
