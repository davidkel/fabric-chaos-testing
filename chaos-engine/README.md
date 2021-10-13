# Build a chaos engine
This is a process that executes a series of scenarios randomly. The scenarios are made of of the following simple commands

- StopGateway
- PauseGateway
- RestartGateway
- UnpauseGateway
- StopPeer
- PausePeer
- UnpausePeer
- RestartPeer
- StopAllPeers (org) --- org is optional
- PauseAllPeers (org)
- RestartAllPeers (org)
- UnpauseAllPeers (org)
- StopOrderer
- PauseOrderer
- RestartOrderer
- UnpauseOrderer
- StopAllOrderers
- PauseAllOrderers
- RestartAllOrderers
- UnpauseAllOrderers
- Delay ms | random[min ms, max ms]
- Sleep ms | random[min ms, max ms]

Stopping 1 or more peers will never stop the gateway peer even if you specify the org that the gateway peer is in. Specifying an org only actions peers in that org, specifying no org on this will action all peers (except the gateway peer)

to run
- npm start (has a preset)
- node dist/start.js <SCENARIO_DIR> <GATEWAY_PEER> <ScenarioName | random | cycle>  (random is the default)

eg to run a single scenario
- node dist/start.js ./scenarios peer0.org1.example.com StopAndRestartGateway

to run in cycle mode
- node dist/start.js ./scenarios peer0.org1.example.com cycle
